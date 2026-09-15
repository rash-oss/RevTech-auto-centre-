-- RevTech production database. Run once in the Supabase SQL editor.
create extension if not exists pgcrypto;

create type public.user_role as enum ('customer', 'staff', 'admin');
create type public.booking_status as enum (
  'requested', 'confirmed', 'in_progress', 'ready', 'completed', 'cancelled'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  registration text not null,
  make text,
  model text,
  created_at timestamptz not null default now(),
  unique(customer_id, registration)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  service text not null,
  registration text not null,
  preferred_date text not null,
  notes text,
  staff_notes text,
  status public.booking_status not null default 'requested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  push_enabled boolean not null default true,
  booking_updates boolean not null default true,
  appointment_reminders boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now()
);

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('staff', 'admin')
  );
$$;

create or replace function public.new_user_profile()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', '')
  );
  insert into public.notification_preferences (user_id) values (new.id);
  return new;
end;
$$;

create trigger create_profile_after_signup
after insert on auth.users for each row execute procedure public.new_user_profile();

alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.bookings enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.push_tokens enable row level security;

create policy "Customers read own profile" on public.profiles
  for select using (id = auth.uid() or public.is_staff());
create policy "Customers update own profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Customers may edit their contact details, but can never promote their own role.
revoke update on public.profiles from authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

create policy "Customers read own vehicles" on public.vehicles
  for select using (customer_id = auth.uid() or public.is_staff());
create policy "Customers add own vehicles" on public.vehicles
  for insert with check (customer_id = auth.uid());
create policy "Customers update own vehicles" on public.vehicles
  for update using (customer_id = auth.uid()) with check (customer_id = auth.uid());
create policy "Customers delete own vehicles" on public.vehicles
  for delete using (customer_id = auth.uid());

create policy "Customers read own bookings" on public.bookings
  for select using (customer_id = auth.uid() or public.is_staff());
create policy "Customers create own bookings" on public.bookings
  for insert with check (customer_id = auth.uid());
create policy "Staff update bookings" on public.bookings
  for update using (public.is_staff()) with check (public.is_staff());

create policy "Customers read own notification preferences" on public.notification_preferences
  for select using (user_id = auth.uid());
create policy "Customers add own notification preferences" on public.notification_preferences
  for insert with check (user_id = auth.uid());
create policy "Customers update own notification preferences" on public.notification_preferences
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Customers read own push tokens" on public.push_tokens
  for select using (user_id = auth.uid());
create policy "Customers add own push tokens" on public.push_tokens
  for insert with check (user_id = auth.uid());
create policy "Customers update own push tokens" on public.push_tokens
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Customers delete own push tokens" on public.push_tokens
  for delete using (user_id = auth.uid());

create or replace function public.delete_own_account()
returns void language sql security definer set search_path = auth, public
as $$ delete from auth.users where id = auth.uid(); $$;
revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;

-- Staff roles must only be granted from the protected SQL editor/service backend.
-- After the owner's account is registered, replace the email below and run this:
-- update public.profiles set role = 'admin'
-- where id = (select id from auth.users where email = 'OWNER_EMAIL');
