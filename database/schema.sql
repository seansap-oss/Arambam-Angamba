-- Dedicated namespace-by-prefix; no existing application tables are modified.
create table if not exists public.imphal_settings (key text primary key, value jsonb not null);
create table if not exists public.imphal_sessions (token text primary key, expires timestamptz not null, version text not null);
create table if not exists public.imphal_bookings (id text primary key, name text not null, email text not null, tour text not null, date date not null, guests integer not null check (guests between 1 and 20), message text not null, status text not null check (status in ('pending','confirmed','cancelled')), created timestamptz not null default now());
create unique index if not exists imphal_one_confirmed_day on public.imphal_bookings(date) where status='confirmed';
create table if not exists public.imphal_guestbook (id text primary key, name text not null, country text not null, message text not null, status text not null check (status in ('pending','approved','hidden')), created timestamptz not null default now());
create table if not exists public.imphal_limits (key text primary key, count integer not null default 0, expires timestamptz not null);
alter table public.imphal_settings enable row level security;
alter table public.imphal_sessions enable row level security;
alter table public.imphal_bookings enable row level security;
alter table public.imphal_guestbook enable row level security;
alter table public.imphal_limits enable row level security;
revoke all on public.imphal_settings,public.imphal_sessions,public.imphal_bookings,public.imphal_guestbook,public.imphal_limits from anon,authenticated;
grant all on public.imphal_settings,public.imphal_sessions,public.imphal_bookings,public.imphal_guestbook,public.imphal_limits to service_role;
create or replace function public.imphal_rate_limit(p_key text, p_max integer, p_seconds integer) returns boolean language plpgsql security invoker set search_path='' as $$
declare hits integer;
begin
 insert into public.imphal_limits as limits(key,count,expires) values(p_key,1,now()+make_interval(secs=>p_seconds))
 on conflict(key) do update set count=case when limits.expires<now() then 1 else limits.count+1 end,
 expires=case when limits.expires<now() then now()+make_interval(secs=>p_seconds) else limits.expires end returning count into hits;
 delete from public.imphal_limits where expires<now()-interval '1 day';
 return hits<=p_max;
end $$;
revoke all on function public.imphal_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.imphal_rate_limit(text,integer,integer) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('imphal-media','imphal-media',true,52428800,array['image/jpeg','image/png','image/webp','video/mp4']) on conflict(id) do nothing;
