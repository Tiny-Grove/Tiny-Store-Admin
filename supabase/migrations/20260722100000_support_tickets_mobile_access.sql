-- Support tickets (0007_support_tickets.sql) shipped with RLS enabled but no
-- policies and no grants at all — every access went through the admin
-- portal's service-role client. Opening this up to the mobile app so
-- merchants can raise/view their own tickets directly, following the same
-- auth_user_id = auth.uid() pattern as orders/end_customers.
revoke all on public.support_tickets from anon, authenticated;
revoke all on public.support_ticket_messages from anon, authenticated;
grant select (
  id, customer_id, subject, status, created_at, updated_at, last_message_at
) on public.support_tickets to authenticated;
grant insert (customer_id, subject) on public.support_tickets to authenticated;
-- Only status/last_message_at/updated_at, so a customer reply can reopen a
-- resolved ticket (mirrors admin-portal's addCustomerReply action) without
-- letting them touch anything else.
grant update (status, last_message_at, updated_at) on public.support_tickets to authenticated;
grant select (
  id, ticket_id, author_type, author_email, body, created_at
) on public.support_ticket_messages to authenticated;
grant insert (ticket_id, author_type, author_email, body) on public.support_ticket_messages to authenticated;
create policy "Customers can view their own tickets"
  on public.support_tickets for select to authenticated
  using (customer_id in (select id from public.customers where auth_user_id = auth.uid()));
create policy "Customers can create their own tickets"
  on public.support_tickets for insert to authenticated
  with check (customer_id in (select id from public.customers where auth_user_id = auth.uid()));
create policy "Customers can reopen their own tickets"
  on public.support_tickets for update to authenticated
  using (customer_id in (select id from public.customers where auth_user_id = auth.uid()))
  with check (customer_id in (select id from public.customers where auth_user_id = auth.uid()));
create policy "Customers can view messages on their own tickets"
  on public.support_ticket_messages for select to authenticated
  using (
    ticket_id in (
      select id from public.support_tickets
      where customer_id in (select id from public.customers where auth_user_id = auth.uid())
    )
  );
create policy "Customers can message their own tickets as themselves"
  on public.support_ticket_messages for insert to authenticated
  with check (
    author_type = 'customer'
    and ticket_id in (
      select id from public.support_tickets
      where customer_id in (select id from public.customers where auth_user_id = auth.uid())
    )
  );
