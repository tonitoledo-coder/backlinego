// ============================================================================
// src/lib/db.js
//
// Drop-in replacement for @base44/sdk that talks to Supabase under the hood.
// Same API surface (Equipment.list/filter/get/create/update/delete, etc.)
// so páginas y componentes no necesitan reescribirse.
//
// Uso:
//   import { db } from '@/lib/db'
//   const items = await db.entities.Equipment.list('-created_date', 50)
// ============================================================================

import { createClient } from '@supabase/supabase-js'

// ── Cliente Supabase ────────────────────────────────────────────────────────
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('[db] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

// ── Mapeo de nombres entidad → tabla REAL en Supabase ───────────────────────
// Tablas reales verificadas contra Supabase: user_profile, equipment, booking,
// review, dispute, sos_request, bulletin_post, bulletin_reply, legal_document,
// legal_acceptance, notification, chat_message, partner, specialist,
// quote_request, payment_log, user_points
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
  LegalAcceptance:'legal_acceptance',
  Notification:   'notification',
  ChatMessage:    'chat_message',
  Partner:        'partner',
  Specialist:     'specialist',
  QuoteRequest:   'quote_request',
  PaymentLog:     'payment_log',
  UserPoints:     'user_points',
}

// ── Parser de orden estilo Base44 ───────────────────────────────────────────
function parseOrder(sortStr) {
  if (!sortStr) return null
  const desc = sortStr.startsWith('-')
  let col = desc ? sortStr.slice(1) : sortStr
  if (col === 'created_date') col = 'created_at'
  if (col === 'updated_date') col = 'updated_at'
  return { column: col, ascending: !desc }
}

// ── Constructor de query desde objeto filtro ────────────────────────────────
// Base44 field name compatibility: map legacy names to Supabase column names
const FIELD_MAP = {
  type: 'doc_type',         // LegalDocument: type → doc_type
  is_active: 'is_published', // LegalDocument: is_active → is_published
}

function applyFilters(query, filters) {
  if (!filters || typeof filters !== 'object') return query
  for (const [key, value] of Object.entries(filters)) {
    const col = FIELD_MAP[key] || key
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

// ── Factory: crea wrapper con API base44 para una tabla dada ────────────────
function makeEntity(entityName) {
  const table = TABLE_MAP[entityName]
  if (!table) throw new Error(`[db] Unknown entity: ${entityName}`)

  return {
    async list(sort, limit) {
      let q = supabase.from(table).select('*')
      const order = parseOrder(sort)
      if (order) q = q.order(order.column, { ascending: order.ascending })
      if (limit) q = q.limit(limit)
      const { data, error } = await q
      if (error) throw error
      return data || []
    },

    async filter(criteria, sort, limit) {
      let q = supabase.from(table).select('*')
      q = applyFilters(q, criteria)
      const order = parseOrder(sort)
      if (order) q = q.order(order.column, { ascending: order.ascending })
      if (limit) q = q.limit(limit)
      const { data, error } = await q
      if (error) throw error
      return data || []
    },

    async get(id) {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle()
      if (error) throw error
      return data
    },

    async create(payload) {
      const { data, error } = await supabase.from(table).insert(payload).select().single()
      if (error) throw error
      return data
    },

    async update(id, payload) {
      const { data, error } = await supabase
        .from(table)
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },

    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
      return true
    },

    subscribe(onChange) {
      const channel = supabase
        .channel(`${table}-changes`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, payload => {
          onChange(payload)
        })
        .subscribe()
      return () => supabase.removeChannel(channel)
    },
  }
}

// ── Construir el objeto entities con todas las entidades ────────────────────
const entities = Object.fromEntries(
  Object.keys(TABLE_MAP).map(name => [name, makeEntity(name)])
)

// ── Auth (compatible con base44.auth.*) ─────────────────────────────────────
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

// ── Functions (edge functions Supabase) ─────────────────────────────────────
const functions = {
  async invoke(name, body = {}) {
    const { data, error } = await supabase.functions.invoke(name, { body })
    if (error) throw error
    return data
  },
}

// ── Storage ─────────────────────────────────────────────────────────────────
const UPLOAD_BUCKET_MAP = {
  equipment: 'equipment-photos',
  avatar: 'equipment-photos',
  identity: 'identity-docs',
  dispute: 'handover-photos',
  handover: 'handover-photos',
  bulletin: 'bulletin-images',
  chat: 'handover-photos',
}

const storage = {
  async upload(bucket, path, file, { publicUrl = false } = {}) {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
    if (error) throw error
    if (publicUrl) {
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path)
      return { path: data.path, url: urlData.publicUrl }
    }
    const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(data.path, 60 * 60 * 24)
    return { path: data.path, url: signed?.signedUrl }
  },
  async remove(bucket, paths) {
    const { error } = await supabase.storage.from(bucket).remove(Array.isArray(paths) ? paths : [paths])
    if (error) throw error
  },
}

// ── Integrations (compatibilidad con código Base44 no migrado) ──────────────
const integrations = {
  Core: {
    async UploadFile({ file, context } = {}) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const bucket = UPLOAD_BUCKET_MAP[context] || 'equipment-photos'
      const isPublic = ['equipment-photos', 'bulletin-images'].includes(bucket)
      const safeName = (file.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${user.id}/${Date.now()}_${safeName}`
      const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false })
      if (error) throw error
      let file_url
      if (isPublic) {
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path)
        file_url = urlData.publicUrl
      } else {
        const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(data.path, 60 * 60 * 24 * 7)
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

// ── Export con la misma forma que base44 ────────────────────────────────────
export const db = { entities, auth, functions, storage, integrations }
export default db
