alter table profiles
  add column if not exists email text,
  add column if not exists email_verified boolean not null default false,
  add column if not exists whatsapp_number text,
  add column if not exists whatsapp_verified boolean not null default false,
  add column if not exists airtel_number text,
  add column if not exists airtel_verified boolean not null default false;

update profiles p
set email = u.email,
    email_verified = u.email_confirmed_at is not null
from auth.users u
where u.id = p.id
  and p.email is null;

create index if not exists profiles_email_idx on profiles (email) where email is not null;
create index if not exists profiles_whatsapp_number_idx on profiles (whatsapp_number) where whatsapp_number is not null;
create index if not exists profiles_airtel_number_idx on profiles (airtel_number) where airtel_number is not null;

grant update (whatsapp_number, airtel_number) on profiles to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    email_verified,
    phone,
    phone_verified,
    whatsapp_number,
    airtel_number
  ) values (
    new.id,
    new.email,
    coalesce(new.email_confirmed_at is not null, false),
    coalesce(new.raw_user_meta_data ->> 'airtel_number', new.phone, ''),
    coalesce(new.phone_confirmed_at is not null, false),
    nullif(new.raw_user_meta_data ->> 'whatsapp_number', ''),
    nullif(new.raw_user_meta_data ->> 'airtel_number', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
