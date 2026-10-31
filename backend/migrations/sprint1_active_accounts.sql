
create function private.is_active() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.profiles where id=auth.uid() and active);
$$;
revoke all on function private.is_active() from public,anon;
grant execute on function private.is_active() to authenticated;
create policy active_accounts_only on public.destinations as restrictive for all to authenticated using((select private.is_active())) with check((select private.is_active()));
create policy active_accounts_only on public.articles as restrictive for all to authenticated using((select private.is_active())) with check((select private.is_active()));
create policy active_accounts_only on public.trips as restrictive for all to authenticated using((select private.is_active())) with check((select private.is_active()));
create policy active_accounts_only on public.tasks as restrictive for all to authenticated using((select private.is_active())) with check((select private.is_active()));
create policy active_accounts_only on public.tickets as restrictive for all to authenticated using((select private.is_active())) with check((select private.is_active()));
create policy active_accounts_only on public.responses as restrictive for all to authenticated using((select private.is_active())) with check((select private.is_active()));
create policy active_accounts_only on public.ticket_events as restrictive for all to authenticated using((select private.is_active())) with check((select private.is_active()));
