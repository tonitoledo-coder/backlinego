-- ============================================================================
-- BacklineGo · Supabase initial schema
-- Migrated from Base44 entities (UserProfile, Equipment, Booking, Review,
-- Dispute, SosRequest, BulletinPost, BulletinReply) + Legal docs system.
--
-- Conventions:
--  - All tables: id uuid pk, created_at, updated_at (auto-managed)
--  - user_profile extends auth.users (id = auth.users.id), no duplicate auth fields
--  - References by uuid (owner_id, renter_id) instead of email — emails kept
--    as denormalized helper columns during Base44 -> Supabase migration window
--  - RLS enabled on every table with explicit policies
--  - is_admin() helper for clean admin-bypass policies
-- ============================================================================

-- Extensions ------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists pg_cron with schema extensions;

-- Helper: updated_at trigger --------------------------------------------------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- Helper: is_admin() ----------------------------------------------------------
create or replace function is_admin() returns boolean language sql stable security definer as $$
  select exists (select 1 from user_profile where id = auth.uid() and role = 'admin')
$$;

-- ============================================================================
-- user_profile  (replaces UserProfile, extends auth.users)
-- ============================================================================
create table user_profile (
  id uuid primary key references auth.users on delete cascade,
  email text not null unique,
  display_name text,
  role text not null default 'user' check (role in ('user','admin')),
  account_status text not null default 'active' check (account_status in ('active','suspended','deleted')),
  is_verified boolean not null default false,
  is_banned boolean not null default false,
  ban_reason text,
  access_level text,
  notes text,
  onboarding_completed boolean not null default false,
  profile_complete boolean not null default false,
  subscription_plan text,
  subscription_status text,
  last_seen timestamptz,
  -- denormalized counters (mantenidos vía triggers o jobs)
  equipment_count int not null default 0,
  booking_count int not null default 0,
  total_revenue numeric(12,2) not null default 0,
  rating numeric(3,2),
  review_count int not null default 0,
  -- KYC / identidad
  id_verified boolean not null default false,
  id_verification_date timestamptz,
  identity_doc_front text,
  identity_doc_back text,
  identity_selfie text,
  identity_status text check (identity_status in ('pending','approved','rejected')),
  identity_submitted_at timestamptz,
  identity_reviewed_at timestamptz,
  identity_rejection_reason text,
  flagged boolean not null default false,
  flag_reason text,
  -- Stripe
  stripe_customer_id text,
  stripe_connect_account_id text,
  connect_onboarding_completed boolean not null default false,
  -- Aceptación legal
  terms_version_accepted text,
  privacy_version_accepted text,
  legal_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger user_profile_updated_at before update on user_profile for each row execute function set_updated_at();

-- Trigger: crea profile al registrar usuario en auth.users
create or replace function handle_new_user() returns trigger language plpgsql security definer as $$
begin
  insert into user_profile (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

alter table user_profile enable row level security;
create policy "self_read" on user_profile for select using (auth.uid() = id);
create policy "self_update" on user_profile for update using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from user_profile where id = auth.uid())); -- no se puede auto-promocionar a admin
create policy "public_read_basic" on user_profile for select using (true); -- ajustar a vista pública si quieres ocultar campos sensibles
create policy "admin_all_user_profile" on user_profile for all using (is_admin());

-- ============================================================================
-- equipment
-- ============================================================================
create table equipment (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references user_profile(id) on delete cascade,
  title text not null,
  description text,
  category text not null check (category in ('cuerdas','teclados','percusion','dj_gear','sonido_pa','estudio_podcast')),
  subcategory text,
  brand text,
  model text,
  year int,
  condition int,
  condition_label text check (condition_label in ('new','excellent','good','acceptable')),
  listing_type text not null default 'equipment' check (listing_type in ('equipment','space')),
  declared_value numeric(10,2),
  price_per_day numeric(10,2) not null,
  price_per_hour numeric(10,2),
  min_rental_price numeric(10,2),
  deposit numeric(10,2),
  owner_required_protection text default 'both' check (owner_required_protection in ('both','insurance_only','escrow_only')),
  pickup_type text default 'in_person' check (pickup_type in ('in_person','shipping','both')),
  delivery_radius_km int,
  images text[] not null default '{}',
  specs jsonb not null default '{}',
  location jsonb,
  owner_type text default 'particular' check (owner_type in ('particular','professional')),
  sos_available boolean not null default false,
  sos_response_time_minutes int,
  sos_price_multiplier numeric(4,2) not null default 1.0,
  status text not null default 'available' check (status in ('available','rented','maintenance','draft','published')),
  views int not null default 0,
  min_rental_days int not null default 1,
  max_rental_days int not null default 30,
  min_rental_hours int not null default 1,
  advance_notice_days int not null default 0,
  blocked_dates date[] not null default '{}',
  pricing_config jsonb,
  capacity_people int,
  included_equipment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index equipment_owner_idx on equipment(owner_id);
create index equipment_status_idx on equipment(status);
create index equipment_category_idx on equipment(category);
create index equipment_sos_idx on equipment(sos_available) where sos_available = true;
create trigger equipment_updated_at before update on equipment for each row execute function set_updated_at();

alter table equipment enable row level security;
create policy "owner_full" on equipment for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "public_read_published" on equipment for select using (status in ('available','rented'));
create policy "admin_all_equipment" on equipment for all using (is_admin());

-- ============================================================================
-- booking
-- ============================================================================
create table booking (
  id uuid primary key default uuid_generate_v4(),
  equipment_id uuid not null references equipment(id) on delete restrict,
  equipment_title text not null,
  owner_id uuid not null references user_profile(id),
  renter_id uuid not null references user_profile(id),
  owner_email text not null,   -- denormalizado durante migración
  renter_email text not null,
  start_date date not null,
  end_date date not null,
  days int not null check (days > 0),
  base_price numeric(10,2) not null,
  protection_fee numeric(10,2) not null default 0,
  protection_rate numeric(5,4),
  platform_fee numeric(10,2) not null default 0,
  deposit_amount numeric(10,2) not null default 0,
  total_charged numeric(10,2) not null,
  owner_payout numeric(10,2),
  status text not null check (status in ('pending','confirmed','active','completed','cancelled','disputed')),
  protection_plan text,
  -- Stripe
  stripe_payment_intent_id text,
  stripe_deposit_intent_id text,
  stripe_transfer_id text,
  deposit_status text check (deposit_status in ('none','held','released','captured','refunded')),
  -- Handover
  pickup_confirmed_at timestamptz,
  return_confirmed_at timestamptz,
  pickup_photos text[] not null default '{}',
  return_photos text[] not null default '{}',
  -- Cancelación
  cancellation_reason text,
  cancelled_by uuid references user_profile(id),
  cancelled_at timestamptz,
  refund_amount numeric(10,2),
  is_sos boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create index booking_equipment_idx on booking(equipment_id);
create index booking_owner_idx on booking(owner_id);
create index booking_renter_idx on booking(renter_id);
create index booking_status_idx on booking(status);
create trigger booking_updated_at before update on booking for each row execute function set_updated_at();

alter table booking enable row level security;
create policy "renter_read_own" on booking for select using (auth.uid() = renter_id);
create policy "owner_read_own" on booking for select using (auth.uid() = owner_id);
create policy "renter_create" on booking for insert with check (auth.uid() = renter_id);
-- Update está restringido: el cliente no debería mutar status/payment fields directamente.
-- Usa edge functions con service_role para transiciones de estado.
create policy "admin_all_booking" on booking for all using (is_admin());

-- ============================================================================
-- review
-- ============================================================================
create table review (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid not null references booking(id) on delete cascade,
  reviewer_id uuid not null references user_profile(id),
  reviewed_id uuid not null references user_profile(id),
  reviewer_email text not null,
  reviewed_email text not null,
  reviewer_role text not null check (reviewer_role in ('owner','renter')),
  rating int not null check (rating between 1 and 5),
  comment text,
  quick_tags text[] not null default '{}',
  response text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_id, reviewer_id)
);
create index review_reviewed_idx on review(reviewed_id);
create trigger review_updated_at before update on review for each row execute function set_updated_at();

alter table review enable row level security;
create policy "public_read_review" on review for select using (is_public = true);
create policy "reviewer_full" on review for all using (auth.uid() = reviewer_id) with check (auth.uid() = reviewer_id);
create policy "admin_all_review" on review for all using (is_admin());

-- ============================================================================
-- dispute
-- ============================================================================
create table dispute (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid not null references booking(id) on delete cascade,
  opened_by uuid not null references user_profile(id),
  type text not null check (type in ('damage','no_show','quality','other')),
  description text not null,
  evidence_photos text[] not null default '{}',
  respondent_response text,
  respondent_photos text[] not null default '{}',
  status text not null default 'open' check (status in ('open','responded','resolved','escalated','closed')),
  resolution_notes text,
  resolved_by uuid references user_profile(id),
  resolved_at timestamptz,
  deposit_action text check (deposit_action in ('release','partial_capture','full_capture')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index dispute_booking_idx on dispute(booking_id);
create trigger dispute_updated_at before update on dispute for each row execute function set_updated_at();

alter table dispute enable row level security;
create policy "parties_read" on dispute for select using (
  exists (select 1 from booking b where b.id = booking_id and (auth.uid() = b.owner_id or auth.uid() = b.renter_id))
);
create policy "parties_create" on dispute for insert with check (auth.uid() = opened_by);
create policy "admin_all_dispute" on dispute for all using (is_admin());

-- ============================================================================
-- sos_request
-- ============================================================================
create table sos_request (
  id uuid primary key default uuid_generate_v4(),
  requester_id uuid not null references user_profile(id),
  requester_email text not null,
  category text not null,
  city text not null,
  pickup_time timestamptz,
  duration_hours int,
  description text not null,
  status text not null default 'open' check (status in ('open','accepted','expired','cancelled','completed')),
  accepted_by uuid references user_profile(id),
  accepted_equipment_id uuid references equipment(id),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sos_status_idx on sos_request(status);
create index sos_expires_idx on sos_request(expires_at);
create trigger sos_updated_at before update on sos_request for each row execute function set_updated_at();

alter table sos_request enable row level security;
create policy "public_read_open_sos" on sos_request for select using (status = 'open');
create policy "requester_full" on sos_request for all using (auth.uid() = requester_id) with check (auth.uid() = requester_id);
create policy "admin_all_sos" on sos_request for all using (is_admin());

-- ============================================================================
-- bulletin_post + bulletin_reply
-- ============================================================================
create table bulletin_post (
  id uuid primary key default uuid_generate_v4(),
  author_id uuid not null references user_profile(id) on delete cascade,
  title text not null,
  body text not null,
  category text not null check (category in ('busco_banda','busco_musico','alquila_local','colaboracion','vendo_material')),
  images text[] not null default '{}',
  city text,
  status text not null default 'active' check (status in ('active','closed','deleted')),
  is_pinned boolean not null default false,
  reply_count int not null default 0,
  is_banned boolean not null default false,
  report_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger bulletin_post_updated_at before update on bulletin_post for each row execute function set_updated_at();

alter table bulletin_post enable row level security;
create policy "public_read_active_posts" on bulletin_post for select using (status = 'active' and not is_banned);
create policy "author_full_posts" on bulletin_post for all using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "admin_all_posts" on bulletin_post for all using (is_admin());

create table bulletin_reply (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references bulletin_post(id) on delete cascade,
  parent_reply_id uuid references bulletin_reply(id) on delete cascade,
  author_id uuid not null references user_profile(id) on delete cascade,
  body text not null,
  depth int not null default 0,
  is_deleted boolean not null default false,
  report_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bulletin_reply_post_idx on bulletin_reply(post_id);
create trigger bulletin_reply_updated_at before update on bulletin_reply for each row execute function set_updated_at();

alter table bulletin_reply enable row level security;
create policy "public_read_replies" on bulletin_reply for select using (not is_deleted);
create policy "author_full_replies" on bulletin_reply for all using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "admin_all_replies" on bulletin_reply for all using (is_admin());

-- ============================================================================
-- legal_document + legal_acceptance
-- ============================================================================
create table legal_document (
  id uuid primary key default uuid_generate_v4(),
  doc_type text not null check (doc_type in ('terms','privacy','cookies')),
  version text not null,
  language text not null default 'es',
  title text not null,
  content_md text not null,
  is_published boolean not null default false,
  published_at timestamptz,
  created_by uuid references user_profile(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (doc_type, version, language)
);
create index legal_published_idx on legal_document(is_published, doc_type) where is_published = true;
create trigger legal_document_updated_at before update on legal_document for each row execute function set_updated_at();

alter table legal_document enable row level security;
create policy "public_read_published_legal" on legal_document for select using (is_published = true);
create policy "admin_all_legal" on legal_document for all using (is_admin());

create table legal_acceptance (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references user_profile(id) on delete cascade,
  document_id uuid not null references legal_document(id),
  accepted_at timestamptz not null default now(),
  ip_address inet,
  user_agent text,
  unique (user_id, document_id)
);
create index legal_acceptance_user_idx on legal_acceptance(user_id);

alter table legal_acceptance enable row level security;
create policy "self_read_acceptances" on legal_acceptance for select using (auth.uid() = user_id);
create policy "self_create_acceptances" on legal_acceptance for insert with check (auth.uid() = user_id);
create policy "admin_all_acceptances" on legal_acceptance for all using (is_admin());

-- ============================================================================
-- Storage buckets (ejecutar tras crear el schema)
-- ============================================================================
insert into storage.buckets (id, name, public) values
  ('equipment-photos', 'equipment-photos', true),
  ('handover-photos', 'handover-photos', false),
  ('identity-docs', 'identity-docs', false),
  ('bulletin-images', 'bulletin-images', true),
  ('legal-documents', 'legal-documents', false)
on conflict (id) do nothing;

-- Policies de storage: añadir según patrón en supabase docs
-- (ejemplo: authenticated insert para equipment-photos en path con auth.uid())
