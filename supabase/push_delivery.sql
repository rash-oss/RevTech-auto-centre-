-- Additive production setup. Apply once; never rerun schema.sql on production.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create table public.push_worker_auth (digest text primary key);
alter table public.push_worker_auth enable row level security;
revoke all on public.push_worker_auth from public, anon, authenticated;
grant select on public.push_worker_auth to service_role;

do $$ declare secret text := encode(extensions.gen_random_bytes(32), 'hex'); begin
  perform vault.create_secret(secret, 'revtech_push_worker');
  insert into public.push_worker_auth values (encode(extensions.digest(secret, 'sha256'), 'hex'));
end $$;

create table public.push_deliveries (
 id bigint generated always as identity primary key,
 booking_id uuid not null references public.bookings(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 token_id uuid not null references public.push_tokens(id) on delete cascade,
 booking_status text not null,
 state text not null default 'queued' check (state in ('queued','sending','ticket','delivered','failed','skipped')),
 attempts integer not null default 0,
 available_at timestamptz not null default now(),
 ticket_id text,
 last_error text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.push_deliveries enable row level security;
revoke all on public.push_deliveries from public, anon, authenticated;
grant all on public.push_deliveries to service_role;
grant usage, select on sequence public.push_deliveries_id_seq to service_role;
create index push_deliveries_due on public.push_deliveries(state, available_at);

create function private.queue_booking_push() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if old.status is distinct from new.status then
  insert into public.push_deliveries(booking_id,user_id,token_id,booking_status)
  select new.id,new.customer_id,t.id,new.status::text from public.push_tokens t
  left join public.notification_preferences p on p.user_id=t.user_id
  where t.user_id=new.customer_id and coalesce(p.push_enabled,true) and coalesce(p.booking_updates,true);
 end if;
 return new;
end $$;
revoke all on function private.queue_booking_push() from public,anon,authenticated;
create trigger booking_push_after_status after update of status on public.bookings for each row execute function private.queue_booking_push();

-- Invoker rights: the only granted caller is the server service_role.
create function public.claim_push_deliveries() returns setof public.push_deliveries language sql set search_path = '' as $$
 update public.push_deliveries set state='sending',attempts=attempts+1,available_at=now()+interval '5 minutes',updated_at=now()
 where id in (select id from public.push_deliveries where state in ('queued','sending') and available_at<=now() and attempts<5 order by id for update skip locked limit 50)
 returning *;
$$;
revoke all on function public.claim_push_deliveries() from public,anon,authenticated;
grant execute on function public.claim_push_deliveries() to service_role;

select cron.schedule('revtech-booking-push','*/2 * * * *',$job$
 select net.http_post(
  url:='https://mdhofmjympsnytwhqzwd.supabase.co/functions/v1/booking-notifications',
  headers:=jsonb_build_object('Content-Type','application/json','X-Worker-Key',(select decrypted_secret from vault.decrypted_secrets where name='revtech_push_worker')),
  body:='{}'::jsonb,timeout_milliseconds:=10000
 );
$job$);
select cron.alter_job((select jobid from cron.job where jobname='revtech-booking-push'),active:=false);
