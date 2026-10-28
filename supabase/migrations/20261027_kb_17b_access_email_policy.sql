-- KB-017b: the sign-up policy may not read auth.users, so compare against the sign-in token's email.
drop policy if exists ar_ins on public.lois_access_requests;
create policy ar_ins on public.lois_access_requests for insert to authenticated with check (user_id = (select auth.uid()) and status = 'pending' and lower(email) = lower((select auth.jwt() ->> 'email')));
