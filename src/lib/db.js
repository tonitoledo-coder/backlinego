// ============================================================================
// src/lib/db.js
//
// Capa de datos sobre Supabase. Reutiliza el cliente de supabase.js.
// API compatible con base44 SDK para migración progresiva.
//
// Uso directo (destino final):
//   import { db } from '@/lib/db'
//   const items = await db.entities.Equipment.list('-created_at', 50)
//
// Alias temporal en src/api/base44Client.js mientras queden imports legacy.
// ============================================================================

import { supabase } from './supabase'

// ── Mapeo entidad → tabla real en Postgres ──────────────────────────────────
// Entidades explícitas. Si una entidad NO está aquí, el Proxy la convierte
// automáticamente a snake_case (e.g. SomeThing → some_thing) para no romper
// páginas que aún no se han migrado.
const TABLE_MAP = {
  UserProfile:    'user_profile',
  User:           'user_profile',
  Equipment:      'equipment',
  Booking:        'booking',
  Review:         'review',
  Dispute:        'dispute',
  SosRequest:     'sos_request',
  BulletinPost:   'bulletin_post',
  BulletinReply:  'bulletin_reply',
  LegalDocument:  'legal_document',
  Notification:   'notification',
  ChatMessage:    'chat_message',
  Partner:        'partner',
  Specialist:     'specialist',
  QuoteRequest:   'quote_request',
  PaymentLog:     'payment_log',
  UserPoints:     'user_points',
  Reward:         'user_points',
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const COLUMN_MAP = {
  created_date: 'created_at',
  updated_date: 'updated_at',
}
const mapCol = (col) => COLUMN_MAP[col] || col

const camelToSnake = (s) =>
  s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()

const tableFor = (entityName) =>
  TABLE_MAP[entityName] ?? camelToSnake(entityName)

function parseOrder(sortStr) {
  if (!sortStr) return null
  const desc = sortStr.startsWith('-')
  const col = mapCol(desc ? sortStr.slice(1) : sortStr)
  return { column: col, ascending: !desc }
}

function applyFilters(query, filters) {
  if (!filters || typeof filters !== 'object') return query
  for (const [key, value] of Object.entries(filters)) {
    const col = mapCol(key)
    if (value === null) {
      query = query.is(col, null)
    } else if (Array.isArray(value)) {
      query = query.in(col, value)
    } else {
      query = query.eq(col, value)
    }
  }
  return query
}

// ── Factory de entidad ──────────────────────────────────────────────────────
function makeEntity(table) {
  return {
    async list(sort, limit) {
      let q = supabase.from(table).select('*')
      const order = parseOrder(sort)
      if (order) q = q.order(order.column, { ascending: order.ascending })
      if (limit) q = q.limit(limit)
      const { data, error } = await q
      if (error) {
        console.warn(`[db] list ${table} failed:`, error.message)
        return []
      }
      return data || []
    },

    async filter(criteria, sort, limit) {
      let q = supabase.from(table).select('*')
      q = applyFilters(q, criteria)
      const order = parseOrder(sort)
      if (order) q = q.order(order.column, { ascending: order.ascending })
      if (limit) q = q.limit(limit)
      const { data, error } = await q
      if (error) {
        console.warn(`[db] filter ${table} failed:`, error.message)
        return []
      }
      return data || []
    },

    async get(id) {
      const { data, error } = await supabase
        .from(table).select('*').eq('id', id).maybeSingle()
      if (error) {
        console.warn(`[db] get ${table}/${id} failed:`, error.message)
        return null
      }
      return data
    },

    async create(payload) {
      const { data, error } = await supabase
        .from(table).insert(payload).select().single()
      if (error) {
        console.warn(`[db] create ${table} failed:`, error.message)
        return null
      }
      return data
    },

    async update(id, payload) {
      const { data, error } = await supabase
        .from(table)
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) {
        console.warn(`[db] update ${table}/${id} failed:`, error.message)
        return null
      }
      return data
    },

    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) {
        console.warn(`[db] delete ${table}/${id} failed:`, error.message)
      }
      return !error
    },

    subscribe(onChange) {
      const channel = supabase
        .channel(`${table}-changes`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, onChange)
        .subscribe()
      return () => supabase.removeChannel(channel)
    },
  }
}

// ── Entities (Proxy con fallback a snake_case) ──────────────────────────────
const entityCache = {}
const entities = new Proxy(entityCache, {
  get(target, prop) {
    if (typeof prop !== 'string') return undefined
    if (!target[prop]) {
      target[prop] = makeEntity(tableFor(prop))
    }
    return target[prop]
  },
})

// ── Auth ────────────────────────────────────────────────────────────────────
const auth = {
  async me() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data: profile } = await supabase
      .from('user_profile')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    return { ...user, ...(profile || {}) }
  },

  async updateMe(patch) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { data, error } = await supabase
      .from('user_profile')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async isAuthenticated() {
    const { data: { session } } = await supabase.auth.getSession()
    return !!session
  },

  async logout() {
    await supabase.auth.signOut()
  },

  redirectToLogin() {
    window.location.href = '/login'
  },

  async signInWithPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },

  async signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data
  },

  async signInWithMagicLink(email) {
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) throw error
  },
}

// ── Edge Functions ──────────────────────────────────────────────────────────
const functions = {
  async invoke(name, body = {}) {
    console.warn(`[db] functions.invoke('${name}') — edge function pendiente de migración`)
    try {
      const { data, error } = await supabase.functions.invoke(name, { body })
      if (error) throw error
      return data
    } catch (e) {
      console.warn(`[db] functions.invoke('${name}') failed:`, e?.message)
      return null
    }
  },
}

// ── Storage ─────────────────────────────────────────────────────────────────
const storage = {
  async upload(bucket, path, file, { publicUrl = false } = {}) {
    const { data, error } = await supabase.storage
      .from(bucket).upload(path, file, { upsert: true })
    if (error) throw error
    if (publicUrl) {
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path)
      return { path: data.path, url: urlData.publicUrl }
    }
    const { data: signed } = await supabase.storage
      .from(bucket).createSignedUrl(data.path, 60 * 60 * 24)
    return { path: data.path, url: signed?.signedUrl }
  },

  async remove(bucket, paths) {
    const { error } = await supabase.storage
      .from(bucket).remove(Array.isArray(paths) ? paths : [paths])
    if (error) throw error
  },
}

// ── Integrations (compatibilidad con API Base44) ────────────────────────────
// Mapeo de contexto → bucket. Los componentes no necesitan saber el bucket.
const UPLOAD_BUCKET_MAP = {
  equipment:  'equipment-photos',
  avatar:     'equipment-photos',   // avatares van al bucket público por ahora
  identity:   'identity-docs',
  dispute:    'handover-photos',
  handover:   'handover-photos',
  bulletin:   'bulletin-images',
  chat:       'chat-attachments',
}

const integrations = {
  Core: {
    /**
     * UploadFile({ file, context? })
     * Compatible con base44.integrations.Core.UploadFile({ file })
     * Devuelve { file_url } con URL pública o signed según bucket.
     *
     * context: 'equipment'|'avatar'|'identity'|'dispute'|'handover'|'bulletin'|'chat'
     *          Si no se pasa, se infiere del MIME type o se usa 'equipment-photos'.
     */
    async UploadFile({ file, context } = {}) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Determinar bucket
      const bucket = UPLOAD_BUCKET_MAP[context] || 'equipment-photos'
      const isPublic = ['equipment-photos', 'bulletin-images'].includes(bucket)

      // Path: {uid}/{timestamp}_{filename}
      const safeName = (file.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${user.id}/${Date.now()}_${safeName}`

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: false })
      if (error) throw error

      let file_url
      if (isPublic) {
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path)
        file_url = urlData.publicUrl
      } else {
        const { data: signed } = await supabase.storage
          .from(bucket)
          .createSignedUrl(data.path, 60 * 60 * 24 * 7) // 7 días
        file_url = signed?.signedUrl
      }

      return { file_url, path: data.path, bucket }
    },

    async SendEmail() {
      console.warn('[db] integrations.Core.SendEmail — pendiente migración a edge function')
      return null
    },
  },
}

// ── Export ───────────────────────────────────────────────────────────────────
export const db = { entities, auth, functions, storage, integrations }
export default db
