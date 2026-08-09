-- ADMIN ROLE MANAGEMENT
-- Administrators manage workspace membership. Grant write on user_roles and
-- scope those writes to administrators. An administrator can never remove
-- their own administrator role (update or delete), preventing lockout.

grant insert, update, delete on public.user_roles to authenticated;

create policy "roles_admin_insert" on public.user_roles for insert to authenticated
  with check (public.has_role(auth.uid(), 'administrator'));

create policy "roles_admin_update" on public.user_roles for update to authenticated
  using (
    public.has_role(auth.uid(), 'administrator')
    and not (user_id = auth.uid() and role = 'administrator')
  )
  with check (public.has_role(auth.uid(), 'administrator'));

create policy "roles_admin_delete" on public.user_roles for delete to authenticated
  using (
    public.has_role(auth.uid(), 'administrator')
    and not (user_id = auth.uid() and role = 'administrator')
  );
