-- Run after creating the owner in Authentication > Users.
-- Replace the email only if the Auth owner uses a different address.
insert into public.admin_users(user_id,email,role,active)
select id,email,'owner',true from auth.users where lower(email)=lower('zexunlai@gmail.com')
on conflict(user_id) do update set email=excluded.email,active=true;

-- Disable anonymous sign-ins and public email signup in Authentication > Providers.
-- Supabase does not expose Auth provider settings through database migrations.
