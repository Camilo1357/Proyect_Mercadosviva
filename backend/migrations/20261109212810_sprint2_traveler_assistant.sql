alter table public.tickets add column chat_request_id uuid;
alter table public.tickets add constraint tickets_chat_request_unique unique(user_id,chat_request_id);
drop policy tickets_insert on public.tickets;
create policy tickets_insert on public.tickets for insert to authenticated with check (
 user_id=(select auth.uid()) and state='NUEVA' and assigned_to is null and closed_at is null
 and ((origin='WEB' and chat_request_id is null) or (origin='CHATBOT' and chat_request_id is not null))
 and (trip_id is null or exists(select 1 from public.trips where id=trip_id and user_id=(select auth.uid())))
);
create policy trips_update on public.trips for update to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
grant update(destination_id,start_date,end_date) on public.trips to authenticated;
grant update(due_date) on public.tasks to authenticated;

create function private.refresh_trip_tasks() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.start_date < current_date and new.start_date is distinct from old.start_date then
  raise exception 'La nueva salida no puede estar en el pasado';
 end if;
 if new.destination_id is distinct from old.destination_id and
    not exists(select 1 from public.destinations where id=new.destination_id and active) then
  raise exception 'Selecciona un destino activo';
 end if;
 if (new.destination_id,new.start_date) is distinct from (old.destination_id,old.start_date) then
  update public.tasks set
   due_date=case when new.start_date is distinct from old.start_date then
    greatest(current_date,new.start_date-(case sort_order when 1 then 30 when 2 then 7 when 3 then 5 when 4 then 2 when 5 then 3 else 0 end))
    else due_date end,
   completed=case when new.destination_id is distinct from old.destination_id then false else completed end
  where trip_id=new.id;
 end if;
 return new;
end; $$;
revoke all on function private.refresh_trip_tasks() from public,anon,authenticated;
create trigger refresh_trip_tasks after update on public.trips for each row execute function private.refresh_trip_tasks();

create function public.edit_trip(p_id uuid,p_destination uuid,p_start date,p_end date)
 returns public.trips language plpgsql security invoker set search_path='' as $$
declare result public.trips;
begin
 if p_start is null or p_end is null or p_start<current_date or p_end<p_start then
  raise exception 'Revisa las fechas del viaje';
 end if;
 if not exists(select 1 from public.destinations where id=p_destination and active) then
  raise exception 'Selecciona un destino activo';
 end if;
 update public.trips set destination_id=p_destination,start_date=p_start,end_date=p_end
 where id=p_id and user_id=auth.uid() returning * into result;
 if not found then raise exception 'Viaje no encontrado' using errcode='42501'; end if;
 return result;
end; $$;
revoke all on function public.edit_trip(uuid,uuid,date,date) from public,anon;
grant execute on function public.edit_trip(uuid,uuid,date,date) to authenticated;

create function public.escalate_chat(p_request uuid,p_trip uuid,p_subject text,p_description text)
 returns public.tickets language plpgsql security invoker set search_path='' as $$
declare result public.tickets;
begin
 if auth.uid() is null or not private.is_active() then
  raise exception 'Se requiere un viajero activo' using errcode='42501';
 end if;
 if p_request is null then raise exception 'Falta el identificador de envío'; end if;
 insert into public.tickets(trip_id,subject,description,origin,chat_request_id)
 values(p_trip,p_subject,p_description,'CHATBOT',p_request)
 on conflict(user_id,chat_request_id) do nothing returning * into result;
 if result.id is null then
  select * into result from public.tickets where user_id=auth.uid() and chat_request_id=p_request;
 end if;
 return result;
end; $$;
revoke all on function public.escalate_chat(uuid,uuid,text,text) from public,anon;
grant execute on function public.escalate_chat(uuid,uuid,text,text) to authenticated;
