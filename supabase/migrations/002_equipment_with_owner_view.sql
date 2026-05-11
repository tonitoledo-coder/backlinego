-- ============================================================================
-- equipment_with_owner
-- Vista que aplana equipment + campos relevantes del dueño (user_profile).
-- Soporta filtros de rating y verificación sin joins client-side.
-- security_invoker = on → respeta RLS de las tablas base.
-- ============================================================================

-- 1) Garantizar política de lectura pública en user_profile para los campos
--    expuestos por la vista. Idempotente: si ya existe, no hace nada.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'user_profile'
      and policyname = 'public_read_basic'
  ) then
    create policy public_read_basic on public.user_profile
      for select using (true);
  end if;
end $$;

-- 2) Vista
create or replace view public.equipment_with_owner
with (security_invoker = on) as
select
  e.*,
  u.display_name      as owner_display_name,
  u.username          as owner_username,
  u.avatar_url        as owner_avatar_url,
  u.rating_avg        as owner_rating_avg,
  u.reviews_count     as owner_reviews_count,
  u.is_verified       as owner_is_verified,
  u.subscription_plan as owner_subscription_plan
from public.equipment e
join public.user_profile u on u.id = e.owner_id;

grant select on public.equipment_with_owner to anon, authenticated;

-- 3) Índices de apoyo
create index if not exists user_profile_rating_idx on public.user_profile(rating_avg);
create index if not exists user_profile_verified_idx on public.user_profile(is_verified) where is_verified = true;
