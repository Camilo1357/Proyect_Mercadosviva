
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null check(length(name) between 1 and 120),
 role text not null default 'traveler' check(role in ('traveler','agent','editor')),
 active boolean not null default true
);
create function private.is_staff() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.profiles where id=auth.uid() and active and role in ('agent','editor'));
$$;
create function private.is_editor() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.profiles where id=auth.uid() and active and role='editor');
$$;
create function private.new_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,name) values(new.id, left(coalesce(nullif(trim(new.raw_user_meta_data->>'name'),''),split_part(new.email,'@',1),'Viajero'),120));
 return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.new_profile();

create table public.destinations (
 id uuid primary key default gen_random_uuid(), city text not null, country text not null,
 description text not null default '', active boolean not null default true, unique(city,country)
);
create table public.articles (
 id uuid primary key default gen_random_uuid(), destination_id uuid references public.destinations,
 title text not null check(length(trim(title)) between 3 and 160),
 body text not null check(length(trim(body)) between 10 and 20000),
 category text not null check(category in ('Documentos','Equipaje','Moneda','Transporte','Seguridad','Preparación')),
 kind text not null default 'guide' check(kind in ('guide','faq')),
 source_url text not null check(source_url ~ '^https://'),
 published boolean not null default false,
 valid_until date, updated_at timestamptz not null default now()
);
create table public.trips (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references public.profiles,
 destination_id uuid not null references public.destinations,
 start_date date not null, end_date date not null,
 created_at timestamptz not null default now(), check(end_date>=start_date)
);
create table public.tasks (
 id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips on delete cascade,
 title text not null, category text not null, completed boolean not null default false,
 due_date date not null, sort_order int not null default 0
);
create table public.tickets (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references public.profiles,
 trip_id uuid references public.trips, subject text not null check(length(trim(subject)) between 3 and 160),
 description text not null check(length(trim(description)) between 5 and 5000),
 state text not null default 'NUEVA' check(state in ('NUEVA','ASIGNADA','EN_ATENCION','RESUELTA','CERRADA')),
 assigned_to uuid references public.profiles,
 origin text not null default 'WEB' check(origin in ('WEB','CHATBOT')),
 created_at timestamptz not null default now(), closed_at timestamptz,
 check ((state='NUEVA' and assigned_to is null) or (state<>'NUEVA' and assigned_to is not null))
);
create table public.responses (
 id uuid primary key default gen_random_uuid(), ticket_id uuid not null references public.tickets on delete cascade,
 agent_id uuid not null default auth.uid() references public.profiles,
 body text not null check(length(trim(body)) between 1 and 10000),
 created_at timestamptz not null default now()
);
create table public.ticket_events (
 id uuid primary key default gen_random_uuid(), ticket_id uuid not null references public.tickets on delete cascade,
 actor_id uuid references public.profiles, action text not null, detail text not null default '',
 created_at timestamptz not null default now()
);

create index trips_user_idx on public.trips(user_id);
create index trips_destination_idx on public.trips(destination_id);
create index tasks_trip_idx on public.tasks(trip_id);
create index articles_destination_idx on public.articles(destination_id);
create index tickets_user_idx on public.tickets(user_id);
create index tickets_assigned_idx on public.tickets(assigned_to);
create index tickets_trip_idx on public.tickets(trip_id);
create index responses_ticket_idx on public.responses(ticket_id);
create index responses_agent_idx on public.responses(agent_id);
create index events_ticket_idx on public.ticket_events(ticket_id);
create index events_actor_idx on public.ticket_events(actor_id);

alter table public.profiles enable row level security;
alter table public.destinations enable row level security;
alter table public.articles enable row level security;
alter table public.trips enable row level security;
alter table public.tasks enable row level security;
alter table public.tickets enable row level security;
alter table public.responses enable row level security;
alter table public.ticket_events enable row level security;
create policy profiles_read on public.profiles for select to authenticated using(id=(select auth.uid()) or (select private.is_staff()));
create policy destinations_read on public.destinations for select to authenticated using(active);
create policy articles_read on public.articles for select to authenticated using((published and (valid_until is null or valid_until>=current_date)) or (select private.is_editor()));
create policy articles_insert on public.articles for insert to authenticated with check((select private.is_editor()));
create policy articles_update on public.articles for update to authenticated using((select private.is_editor())) with check((select private.is_editor()));
create policy trips_read on public.trips for select to authenticated using(user_id=(select auth.uid()));
create policy trips_insert on public.trips for insert to authenticated with check(user_id=(select auth.uid()) and start_date>=current_date);
create policy tasks_read on public.tasks for select to authenticated using(exists(select 1 from public.trips where id=trip_id and user_id=(select auth.uid())));
create policy tasks_insert on public.tasks for insert to authenticated with check(exists(select 1 from public.trips where id=trip_id and user_id=(select auth.uid())));
create policy tasks_update on public.tasks for update to authenticated using(exists(select 1 from public.trips where id=trip_id and user_id=(select auth.uid()))) with check(exists(select 1 from public.trips where id=trip_id and user_id=(select auth.uid())));
create policy tickets_read on public.tickets for select to authenticated using(user_id=(select auth.uid()) or (select private.is_staff()));
create policy tickets_insert on public.tickets for insert to authenticated with check(user_id=(select auth.uid()) and state='NUEVA' and assigned_to is null and origin='WEB' and closed_at is null and (trip_id is null or exists(select 1 from public.trips where id=trip_id and user_id=(select auth.uid()))));
create policy tickets_update on public.tickets for update to authenticated using((select private.is_staff())) with check((select private.is_staff()));
create policy responses_read on public.responses for select to authenticated using(exists(select 1 from public.tickets where id=ticket_id));
create policy responses_insert on public.responses for insert to authenticated with check(agent_id=(select auth.uid()) and (select private.is_staff()) and exists(select 1 from public.tickets where id=ticket_id and assigned_to=(select auth.uid()) and state='EN_ATENCION'));
create policy events_read on public.ticket_events for select to authenticated using(exists(select 1 from public.tickets where id=ticket_id));

create function private.guard_ticket() returns trigger language plpgsql set search_path='' as $$
begin
 if not private.is_staff() then raise exception 'Se requiere un agente activo' using errcode='42501'; end if;
 if (new.id,new.user_id,new.trip_id,new.subject,new.description,new.origin,new.created_at)
    is distinct from (old.id,old.user_id,old.trip_id,old.subject,old.description,old.origin,old.created_at)
 then raise exception 'Los datos originales del caso son inmutables'; end if;
 if old.state='CERRADA' then raise exception 'La solicitud ya está cerrada'; end if;
 if new.assigned_to is distinct from old.assigned_to then
   if not exists(select 1 from public.profiles where id=new.assigned_to and active and role in ('agent','editor')) then raise exception 'Responsable inválido'; end if;
   if new.state<>'ASIGNADA' then raise exception 'Una asignación debe dejar el caso en ASIGNADA'; end if;
 elsif new.state<>old.state then
   if old.assigned_to<>auth.uid() then raise exception 'Solo el responsable puede atender este caso' using errcode='42501'; end if;
   if not ((old.state='ASIGNADA' and new.state='EN_ATENCION') or (old.state='EN_ATENCION' and new.state='RESUELTA') or (old.state='RESUELTA' and new.state='CERRADA')) then raise exception 'Transición de estado inválida'; end if;
   if new.state in ('RESUELTA','CERRADA') and not exists(select 1 from public.responses where ticket_id=old.id) then raise exception 'Registra una respuesta antes de resolver o cerrar'; end if;
 end if;
 new.closed_at=case when new.state='CERRADA' then now() else null end;
 return new;
end; $$;
create trigger guard_ticket before update on public.tickets for each row execute function private.guard_ticket();

create function private.audit_ticket() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Usuario requerido'; end if;
 insert into public.ticket_events(ticket_id,actor_id,action,detail)
 values(new.id,auth.uid(),case when TG_OP='INSERT' then 'Solicitud creada' else new.state end,
 case when TG_OP='INSERT' then 'Creada desde el centro del viajero' else coalesce(nullif(current_setting('app.ticket_reason',true),''),'Estado actualizado') end);
 return new;
end; $$;
create trigger audit_ticket after insert or update on public.tickets for each row execute function private.audit_ticket();

create function public.create_trip(p_destination uuid,p_start date,p_end date) returns public.trips language plpgsql security invoker set search_path='' as $$
declare t public.trips;
begin
 insert into public.trips(destination_id,start_date,end_date) values(p_destination,p_start,p_end) returning * into t;
 insert into public.tasks(trip_id,title,category,due_date,sort_order) values
 (t.id,'Revisar documentos y requisitos del destino','Documentos',greatest(current_date,p_start-30),1),
 (t.id,'Consultar las condiciones de equipaje de mi tarifa','Equipaje',greatest(current_date,p_start-7),2),
 (t.id,'Organizar el transporte de llegada','Transporte',greatest(current_date,p_start-5),3),
 (t.id,'Guardar contactos y reservas para el viaje','Preparación',greatest(current_date,p_start-2),4),
 (t.id,'Revisar mis medios de pago','Moneda',greatest(current_date,p_start-3),5);
 return t;
end; $$;

create function public.ticket_action(p_id uuid,p_action text,p_agent uuid default null,p_text text default '') returns public.tickets language plpgsql security invoker set search_path='' as $$
declare t public.tickets;
begin
 if not private.is_staff() then raise exception 'Acceso reservado a agentes' using errcode='42501'; end if;
 select * into t from public.tickets where id=p_id for update;
 if not found then raise exception 'Solicitud no encontrada'; end if;
 if p_action='assign' then
   if p_agent is not distinct from t.assigned_to then raise exception 'El agente ya es responsable'; end if;
   if t.assigned_to is not null and length(trim(p_text))<5 then raise exception 'Indica el motivo de reasignación'; end if;
   perform set_config('app.ticket_reason',coalesce(nullif(trim(p_text),''),'Responsable asignado'),true);
   update public.tickets set assigned_to=p_agent,state='ASIGNADA' where id=p_id returning * into t;
 elsif p_action='start' then
   update public.tickets set state='EN_ATENCION' where id=p_id returning * into t;
 elsif p_action='respond' then
   if t.state<>'EN_ATENCION' or t.assigned_to<>auth.uid() then raise exception 'Inicia la atención como responsable antes de responder'; end if;
   insert into public.responses(ticket_id,body) values(p_id,trim(p_text));
   update public.tickets set state='RESUELTA' where id=p_id returning * into t;
 elsif p_action='close' then
   update public.tickets set state='CERRADA' where id=p_id returning * into t;
 else raise exception 'Acción inválida';
 end if;
 return t;
end; $$;

-- No privilegios implícitos: solo columnas mutables y operaciones necesarias.
revoke all on all tables in schema public from anon,authenticated;
grant select on public.profiles,public.destinations,public.articles,public.trips,public.tasks,public.tickets,public.responses,public.ticket_events to authenticated;
grant insert on public.articles,public.trips,public.tasks,public.tickets,public.responses to authenticated;
grant update(title,body,category,kind,source_url,published,valid_until,destination_id,updated_at) on public.articles to authenticated;
grant update(completed) on public.tasks to authenticated;
grant update(state,assigned_to) on public.tickets to authenticated;
revoke all on function public.create_trip(uuid,date,date),public.ticket_action(uuid,text,uuid,text) from public,anon;
grant execute on function public.create_trip(uuid,date,date),public.ticket_action(uuid,text,uuid,text) to authenticated;
revoke all on all functions in schema private from public,anon,authenticated;
grant execute on function private.is_staff(),private.is_editor() to authenticated;
