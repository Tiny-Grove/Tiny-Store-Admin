-- The RLS policies and the app's own row-matching filter reference
-- auth_user_id, which requires SELECT privilege on that column to evaluate
-- (both for the policy predicate itself and for query filters/WHERE
-- clauses) even though it wasn't in the original "display" column list.
grant select (auth_user_id) on public.customers to authenticated;
