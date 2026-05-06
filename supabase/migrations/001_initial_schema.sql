-- ============================================================================
-- BacklineGo — Schema inicial v0.1.0
-- ============================================================================
-- Fecha:               5 de mayo de 2026
-- Proyecto Supabase:   linfulgrbsrspnkjbqvx
-- Hub:                 tresdetres (3d3)
--
-- Principios aplicados:
--   • Backend como única fuente de verdad (ADR-003)
--   • Aislamiento total del proyecto (ADR-007)
--   • Dinero en céntimos (integer) — sin floating point
--   • RLS activado desde el día uno en TODAS las tablas
--   • CHECK constraints en lugar de ENUM types (más fáciles de evolucionar)
--   • UUID v4 vía pgcrypto.gen_random_uuid()
--   • Sin dependencias entre proyectos del hub
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. Funciones auxiliares
-- ---------------------------------------------------------------------------

-- Trigger genérico para mantener updated_at automáticamente
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ---------------------------------------------------------------------------
-- 2. user_profile — perfil extendido vinculado a auth.users
-- ---------------------------------------------------------------------------

create table public.user_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,

  -- Roles del producto (no de 3d3 — aplicación del ADR-014)
  role text not null default 'user'
    check (role in ('user', 'moderator', 'admin')),
  is_app_super_admin boolean not null default false,

  -- Estado de cuenta
  account_status text not null default 'pending'
    check (account_status in ('pending', 'approved', 'rejected')),
  is_banned boolean not null default false,
  ban_reason text,
  flagged boolean not null default false,
  flag_reason text,

  -- Onboarding
  onboarding_completed boolean not null default false,
  profile_complete boolean not null default false,

  -- KYC (verificación de identidad)
  identity_status text not null default 'not_submitted'
    check (identity_status in ('not_submitted', 'pending_review', 'verified', 'rejected')),
  identity_doc_front text,
  identity_doc_back text,
  identity_selfie text,
  identity_submitted_at timestamptz,
  identity_reviewed_at timestamptz,
  identity_rejection_reason text,

  -- Aceptación legal
  terms_version_accepted text,
  privacy_version_accepted text,
  legal_accepted_at timestamptz,

  -- Suscripción (placeholder — se conectará a Stripe en bloque posterior)
  subscription_plan text not null default 'free'
    check (subscription_plan in ('free', 'pro', 'business')),
  subscription_status text
    check (subscription_status in ('active', 'cancelled', 'past_due', 'trialing')),

  -- Stripe (referencias)
  stripe_customer_id text unique,
  stripe_connect_account_id text unique,

  -- Métricas (mantenidas por el backend, nunca por el cliente)
  equipment_count integer not null default 0 check (equipment_count >= 0),
  bookings_count  integer not null default 0 check (bookings_count >= 0),
  reviews_count   integer not null default 0 check (reviews_count >= 0),
  rating_avg numeric(3, 2) check (rating_avg between 0 and 5),

  -- Timestamps
  last_seen_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger user_profile_set_updated_at
  before update on public.user_profile
  for each row execute function public.set_updated_at();

-- Trigger: crear user_profile automáticamente al hacer signup
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profile (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();


-- ---------------------------------------------------------------------------
-- 3. equipment — listings (equipos físicos y espacios)
-- ---------------------------------------------------------------------------

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.user_profile(id) on delete restrict,

  -- Datos básicos
  title text not null,
  description text,
  listing_type text not null default 'equipment'
    check (listing_type in ('equipment', 'space')),
  category text not null check (category in (
    'cuerdas', 'teclados', 'percusion', 'dj_gear', 'sonido_pa', 'estudio_podcast',
    'recording_studio', 'rehearsal_room'
  )),
  subcategory text,
  brand text,
  model text,
  year integer check (year between 1900 and 2099),

  -- Estado físico
  condition smallint check (condition between 1 and 10),
  condition_label text check (condition_label in ('new', 'excellent', 'good', 'acceptable')),

  -- Pricing (todo en céntimos de euro)
  price_per_day_cents     integer check (price_per_day_cents > 0),
  price_per_hour_cents    integer check (price_per_hour_cents > 0),
  min_rental_price_cents  integer check (min_rental_price_cents >= 0),
  declared_value_cents    integer not null check (declared_value_cents > 0),
  deposit_cents           integer check (deposit_cents >= 0),

  -- Reglas de alquiler
  min_rental_days     integer not null default 1  check (min_rental_days >= 1),
  max_rental_days     integer not null default 30 check (max_rental_days >= 1),
  min_rental_hours    integer not null default 1  check (min_rental_hours >= 1),
  advance_notice_days integer not null default 0  check (advance_notice_days >= 0),
  blocked_dates       date[]  not null default '{}',
  pricing_config      jsonb   not null default '{}'::jsonb,

  -- Protección requerida por el propietario
  owner_required_protection text not null default 'both'
    check (owner_required_protection in ('both', 'damage_waiver_only', 'escrow_only')),

  -- Logística
  pickup_type text not null default 'in_person'
    check (pickup_type in ('in_person', 'shipping', 'both')),
  delivery_radius_km integer check (delivery_radius_km >= 0),

  -- Geolocalización (PostGIS se añadirá cuando toque búsqueda por radio)
  city    text,
  address text,
  lat     numeric(9, 6) check (lat between -90 and 90),
  lng     numeric(9, 6) check (lng between -180 and 180),

  -- Tipo de propietario y SOS
  owner_type text not null default 'particular'
    check (owner_type in ('particular', 'professional')),
  sos_available boolean not null default false,
  sos_response_time_minutes integer check (sos_response_time_minutes > 0),
  sos_price_multiplier numeric(4, 2) not null default 1.0
    check (sos_price_multiplier >= 1.0),

  -- Espacios (cuando listing_type = 'space')
  capacity_people    integer check (capacity_people > 0),
  included_equipment text,

  -- Multimedia y especificaciones
  images text[] not null default '{}',
  specs  jsonb  not null default '{}'::jsonb,

  -- Estado del listing
  status text not null default 'draft'
    check (status in ('draft', 'available', 'rented', 'maintenance', 'archived')),
  views integer not null default 0 check (views >= 0),

  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Coherencia: que un listing tenga al menos un precio definido
  constraint equipment_must_have_price check (
    price_per_day_cents is not null or price_per_hour_cents is not null
  ),
  constraint equipment_rental_days_ordered check (max_rental_days >= min_rental_days)
);

create index equipment_owner_idx     on public.equipment(owner_id);
create index equipment_available_idx on public.equipment(status) where status = 'available';
create index equipment_category_idx  on public.equipment(category);
create index equipment_city_idx      on public.equipment(city);

create trigger equipment_set_updated_at
  before update on public.equipment
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- 4. booking — reservas
-- ---------------------------------------------------------------------------

create table public.booking (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment(id) on delete restrict,
  owner_id     uuid not null references public.user_profile(id) on delete restrict,
  renter_id    uuid not null references public.user_profile(id) on delete restrict,

  -- Datos desnormalizados para historial inmutable
  equipment_title text not null,

  -- Período
  start_date date not null,
  end_date   date not null,
  days       integer not null check (days >= 1),
  is_sos     boolean not null default false,

  -- Pricing (todo en céntimos)
  base_price_cents       integer not null check (base_price_cents > 0),
  protection_fee_cents   integer not null default 0 check (protection_fee_cents >= 0),
  protection_rate        numeric(5, 4) check (protection_rate between 0 and 1),
  platform_fee_cents     integer not null check (platform_fee_cents >= 0),
  platform_fee_pct       numeric(5, 4) not null default 0.12
    check (platform_fee_pct between 0 and 1),
  total_charged_cents    integer not null check (total_charged_cents > 0),
  owner_payout_cents     integer not null check (owner_payout_cents >= 0),

  -- Depósito (escrow)
  deposit_cents  integer not null default 0 check (deposit_cents >= 0),
  deposit_status text not null default 'none'
    check (deposit_status in ('none', 'held', 'captured', 'released')),

  -- Tipo de protección aplicada
  protection_plan text not null default 'damage_waiver'
    check (protection_plan in ('damage_waiver', 'escrow_only', 'none')),

  -- Estado de la reserva
  status text not null default 'pending_payment' check (status in (
    'pending_payment', 'confirmed', 'active', 'completed',
    'cancelled', 'disputed', 'refunded'
  )),

  -- Stripe references (se rellenan cuando entre Stripe Connect)
  stripe_payment_intent_id text unique,
  stripe_deposit_intent_id text unique,
  stripe_transfer_id       text,

  -- Recogida y devolución (con QR)
  pickup_confirmed_at timestamptz,
  return_confirmed_at timestamptz,
  pickup_photos       text[] not null default '{}',
  return_photos       text[] not null default '{}',

  -- Cancelación
  cancellation_reason text,
  cancelled_by        uuid references public.user_profile(id) on delete set null,
  cancelled_at        timestamptz,
  refund_amount_cents integer check (refund_amount_cents >= 0),

  notes text,

  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Coherencia
  constraint booking_dates_ordered         check (end_date >= start_date),
  constraint booking_owner_renter_distinct check (owner_id <> renter_id)
);

create index booking_equipment_idx on public.booking(equipment_id);
create index booking_owner_idx     on public.booking(owner_id);
create index booking_renter_idx    on public.booking(renter_id);
create index booking_status_idx    on public.booking(status);
create index booking_dates_idx     on public.booking(start_date, end_date);

create trigger booking_set_updated_at
  before update on public.booking
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- 5. dispute — disputas sobre reservas
-- ---------------------------------------------------------------------------

create table public.dispute (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.booking(id) on delete restrict,
  opened_by  uuid not null references public.user_profile(id) on delete restrict,

  type text not null check (type in (
    'damage', 'late_return', 'no_show', 'condition_mismatch', 'other'
  )),
  description     text not null,
  evidence_photos text[] not null default '{}',

  respondent_response text,
  respondent_photos   text[] not null default '{}',

  status text not null default 'open'
    check (status in ('open', 'under_review', 'resolved', 'dismissed')),
  resolution_notes text,
  resolved_by      uuid references public.user_profile(id) on delete set null,
  resolved_at      timestamptz,
  deposit_action   text check (deposit_action in (
    'release_to_renter', 'capture_to_owner', 'split', 'pending'
  )),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index dispute_booking_idx on public.dispute(booking_id);
create index dispute_open_idx    on public.dispute(status) where status in ('open', 'under_review');

create trigger dispute_set_updated_at
  before update on public.dispute
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- 6. notification — notificaciones in-app
-- ---------------------------------------------------------------------------

create table public.notification (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profile(id) on delete cascade,

  -- type es libre (sin enum) para no requerir migración por cada nuevo evento.
  -- Validación a nivel aplicación. Ej: 'booking_confirmed', 'dispute_opened'
  type    text not null,
  title   text not null,
  message text not null,
  link    text,  -- ruta interna para navegación al hacer clic

  read_at timestamptz,

  -- Referencias opcionales para tracking
  related_booking_id uuid references public.booking(id) on delete cascade,
  related_dispute_id uuid references public.dispute(id) on delete cascade,

  created_at timestamptz not null default now()
);

create index notification_user_unread_idx
  on public.notification(user_id, created_at desc) where read_at is null;
create index notification_user_idx
  on public.notification(user_id, created_at desc);


-- ===========================================================================
-- 7. Row Level Security — activado en TODAS las tablas
-- ===========================================================================

alter table public.user_profile enable row level security;
alter table public.equipment    enable row level security;
alter table public.booking      enable row level security;
alter table public.dispute      enable row level security;
alter table public.notification enable row level security;


-- ---- user_profile ----
-- Para hoy: cada usuario solo ve y edita SU perfil.
-- Más adelante: vista pública limitada (display_name, rating_avg, equipment_count).

create policy user_profile_select_own
  on public.user_profile for select
  using (auth.uid() = id);

create policy user_profile_update_own
  on public.user_profile for update
  using (auth.uid() = id);

-- INSERT lo hace el trigger handle_new_auth_user (security definer).
-- DELETE no se permite a nivel cliente (solo cascade desde auth.users).


-- ---- equipment ----
-- Listings 'available' son visibles para cualquier usuario autenticado.
-- El dueño ve y modifica todos sus listings (incluyendo drafts y archivados).

create policy equipment_select_public
  on public.equipment for select
  using (status = 'available' or owner_id = auth.uid());

create policy equipment_insert_owner
  on public.equipment for insert
  with check (owner_id = auth.uid());

create policy equipment_update_owner
  on public.equipment for update
  using (owner_id = auth.uid());

create policy equipment_delete_owner
  on public.equipment for delete
  using (owner_id = auth.uid());


-- ---- booking ----
-- Solo participantes (owner o renter) ven y modifican la reserva.

create policy booking_select_participants
  on public.booking for select
  using (auth.uid() in (owner_id, renter_id));

create policy booking_insert_renter
  on public.booking for insert
  with check (renter_id = auth.uid());

create policy booking_update_participants
  on public.booking for update
  using (auth.uid() in (owner_id, renter_id));


-- ---- dispute ----
create policy dispute_select_participants
  on public.dispute for select
  using (
    opened_by = auth.uid()
    or exists (
      select 1 from public.booking b
      where b.id = dispute.booking_id
        and auth.uid() in (b.owner_id, b.renter_id)
    )
  );

create policy dispute_insert_participant
  on public.dispute for insert
  with check (
    opened_by = auth.uid()
    and exists (
      select 1 from public.booking b
      where b.id = dispute.booking_id
        and auth.uid() in (b.owner_id, b.renter_id)
    )
  );


-- ---- notification ----
create policy notification_select_own
  on public.notification for select
  using (user_id = auth.uid());

create policy notification_update_own
  on public.notification for update
  using (user_id = auth.uid());

-- INSERT solo desde backend con service_role (sin policy = denegado al cliente).


-- ============================================================================
-- Fin del schema 001_initial_schema.sql
-- ============================================================================
