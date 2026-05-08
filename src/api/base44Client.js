// ============================================================================
// src/api/base44Client.js
//
// ALIAS TEMPORAL — redirige todos los imports legacy a db.js.
// Cuando ningún archivo importe de aquí, borrar este fichero.
//
//   Antes:  import { base44 } from '@/api/base44Client'
//   Ahora:  import { db } from '@/lib/db'       ← destino final
// ============================================================================

export { db as base44, db } from '../lib/db'
