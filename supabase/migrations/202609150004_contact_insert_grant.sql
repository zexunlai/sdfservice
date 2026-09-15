-- The policy validates anonymous contact submissions; table privileges still need INSERT.
revoke all on public.contact_messages from anon;
grant insert on public.contact_messages to anon;
