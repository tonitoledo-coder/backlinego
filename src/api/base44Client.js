import { supabase } from '@/lib/supabase';

const TABLE_MAP = {
  Equipment: 'equipment',
  UserProfile: 'user_profile',
  Booking: 'booking',
  Dispute: 'dispute',
  Notification: 'notification',
};

const COLUMN_MAP = {
  created_date: 'created_at',
  updated_date: 'updated_at',
};

const mapCol = (col) => COLUMN_MAP[col] || col;

const camelToSnake = (s) =>
  s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

const tableFor = (entityName) =>
  TABLE_MAP[entityName] ?? camelToSnake(entityName);

function createEntityProxy(tableName) {
  return {
    async filter(filters = {}, sortField, limit) {
      try {
        let query = supabase.from(tableName).select('*');
        for (const [key, value] of Object.entries(filters)) {
          query = query.eq(mapCol(key), value);
        }
        if (sortField) {
          const ascending = !sortField.startsWith('-');
          const rawColumn = ascending ? sortField : sortField.slice(1);
          query = query.order(mapCol(rawColumn), { ascending });
        }
        if (limit) query = query.limit(limit);
        const { data, error } = await query;
        if (error) {
          console.warn(`[base44-adapter] filter ${tableName} failed:`, error.message);
          return [];
        }
        return data ?? [];
      } catch (e) {
        console.warn(`[base44-adapter] filter ${tableName} threw:`, e?.message);
        return [];
      }
    },

    async get(id) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('id', id)
          .single();
        if (error) {
          console.warn(`[base44-adapter] get ${tableName}/${id} failed:`, error.message);
          return null;
        }
        return data;
      } catch (e) {
        console.warn(`[base44-adapter] get ${tableName} threw:`, e?.message);
        return null;
      }
    },

    async create(obj) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .insert(obj)
          .select()
          .single();
        if (error) {
          console.warn(`[base44-adapter] create ${tableName} failed:`, error.message);
          return null;
        }
        return data;
      } catch (e) {
        console.warn(`[base44-adapter] create ${tableName} threw:`, e?.message);
        return null;
      }
    },

    async update(id, obj) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .update(obj)
          .eq('id', id)
          .select()
          .single();
        if (error) {
          console.warn(`[base44-adapter] update ${tableName}/${id} failed:`, error.message);
          return null;
        }
        return data;
      } catch (e) {
        console.warn(`[base44-adapter] update ${tableName} threw:`, e?.message);
        return null;
      }
    },

    async delete(id) {
      try {
        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq('id', id);
        if (error) {
          console.warn(`[base44-adapter] delete ${tableName}/${id} failed:`, error.message);
        }
      } catch (e) {
        console.warn(`[base44-adapter] delete ${tableName} threw:`, e?.message);
      }
    },
  };
}

const entities = new Proxy(
  {},
  {
    get(target, prop) {
      if (typeof prop !== 'string') return undefined;
      if (!target[prop]) {
        target[prop] = createEntityProxy(tableFor(prop));
      }
      return target[prop];
    },
  }
);

// Auth stubs: los archivos ya migrados (Layout, Home, AuthContext) usan useAuth().
// Estos stubs solo evitan que archivos no migrados crasheen en runtime.
const auth = {
  isAuthenticated: async () => false,
  me: async () => null,
  logout: () => {},
  redirectToLogin: () => {},
};

// Stubs para namespaces aún no migrados — evitan crashes en componentes
// que invocan estas APIs (SosDashboard, SettingsBilling, uploads, etc.).
const functions = {
  invoke: async (name) => {
    console.warn(`[base44-adapter] functions.invoke('${name}') no implementado`);
    return null;
  },
};

const integrations = {
  Core: {
    UploadFile: async () => {
      console.warn('[base44-adapter] integrations.Core.UploadFile no implementado');
      return { file_url: null };
    },
    SendEmail: async () => {
      console.warn('[base44-adapter] integrations.Core.SendEmail no implementado');
      return null;
    },
  },
};

export const base44 = { entities, auth, functions, integrations };
