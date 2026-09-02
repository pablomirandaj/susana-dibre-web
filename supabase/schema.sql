-- =========================================================================
-- Susana Dibré — esquema de base de datos (Supabase / PostgreSQL)
-- Ejecutar en Supabase > SQL Editor > New query > Run.
--
-- Diseño pensado para que mañana quepan varios negocios sin migración
-- dolorosa: todas las tablas llevan business_id. Hoy sólo hay una fila
-- en businesses, y eso basta.
-- =========================================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------- negocios
create table if not exists businesses (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  created_at  timestamptz default now()
);

-- Id fijo para poder usarlo como valor por defecto en events.
-- (PostgreSQL no admite subconsultas en un DEFAULT.)
insert into businesses (id, slug, name)
values ('00000000-0000-0000-0000-000000000001', 'susana-dibre', 'Susana Dibré')
on conflict (slug) do nothing;

-- -------------------------------------------------------- administradores
-- Enlaza un usuario de Supabase Auth con el negocio que puede administrar.
create table if not exists admins (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  email       text,
  created_at  timestamptz default now()
);

create or replace function es_admin_de(b uuid) returns boolean
language sql stable security definer as $$
  select exists (select 1 from admins where user_id = auth.uid() and business_id = b);
$$;

-- ------------------------------------------------------------- eventos
create table if not exists events (
  id                bigserial primary key,
  business_id       uuid not null default '00000000-0000-0000-0000-000000000001'
                    references businesses(id) on delete cascade,
  event_type        text not null,
  page              text,
  source            text,
  service           text,
  element           text,
  anonymous_session text,
  country           text,
  created_at        timestamptz not null default now()
);

create index if not exists events_fecha_idx on events (business_id, created_at desc);
create index if not exists events_tipo_idx  on events (business_id, event_type, created_at desc);

-- ------------------------------------------------------------- galería
create table if not exists gallery (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references businesses(id) on delete cascade,
  image_url           text not null,
  caption             text,
  alt                 text,
  instagram_permalink text,
  published_at        timestamptz,
  status              text not null default 'pending'
                      check (status in ('pending', 'approved', 'rejected')),
  position            int  not null default 0,
  created_at          timestamptz default now()
);

-- ------------------------------------------------------------------ faq
create table if not exists faq (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  question_es text not null,
  answer_es   text not null,
  question_en text,
  answer_en   text,
  tags        text,
  category    text,
  active      boolean not null default true,
  position    int not null default 0,
  updated_at  timestamptz default now()
);

-- -------------------------------------------------------- informes mensuales
create table if not exists monthly_reports (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  month       date not null,
  kpis        jsonb not null,
  conclusions jsonb not null default '[]'::jsonb,
  created_at  timestamptz default now(),
  unique (business_id, month)
);

-- =========================================================================
-- Seguridad a nivel de fila.
-- Regla: nadie lee nada salvo un administrador autenticado del negocio.
-- La escritura de eventos la hace el Worker con la service role key, que
-- se salta RLS por diseño. El navegador nunca escribe aquí.
-- =========================================================================
alter table events           enable row level security;
alter table gallery          enable row level security;
alter table faq              enable row level security;
alter table monthly_reports  enable row level security;
alter table admins           enable row level security;
alter table businesses       enable row level security;

drop policy if exists lectura_admin on events;
create policy lectura_admin on events for select
  using (es_admin_de(business_id));

drop policy if exists galeria_admin on gallery;
create policy galeria_admin on gallery for all
  using (es_admin_de(business_id)) with check (es_admin_de(business_id));

drop policy if exists faq_admin on faq;
create policy faq_admin on faq for all
  using (es_admin_de(business_id)) with check (es_admin_de(business_id));

drop policy if exists informes_admin on monthly_reports;
create policy informes_admin on monthly_reports for select
  using (es_admin_de(business_id));

drop policy if exists admins_propio on admins;
create policy admins_propio on admins for select using (user_id = auth.uid());

drop policy if exists negocios_admin on businesses;
create policy negocios_admin on businesses for select using (es_admin_de(id));

-- =========================================================================
-- KPIs del mes. Se calculan en SQL, no con IA.
-- Devuelve el mes pedido y el anterior, para que el panel sólo pinte.
-- =========================================================================
create or replace function kpis_mes(p_mes date)
returns jsonb
language plpgsql stable security definer as $$
declare
  b uuid;
  ini_act date := date_trunc('month', p_mes)::date;
  fin_act date := (date_trunc('month', p_mes) + interval '1 month')::date;
  ini_ant date := (date_trunc('month', p_mes) - interval '1 month')::date;
  actual  jsonb;
  previo  jsonb;
begin
  select business_id into b from admins where user_id = auth.uid() limit 1;
  if b is null then
    raise exception 'Sin permisos';
  end if;

  select jsonb_build_object(
    'visitas',   count(*) filter (where event_type = 'page_view'),
    'personas',  count(distinct anonymous_session),
    'reservar',  count(*) filter (where event_type = 'booking_click'),
    'whatsapp',  count(*) filter (where event_type = 'whatsapp_click'),
    'telefono',  count(*) filter (where event_type = 'phone_click'),
    'maps',      count(*) filter (where event_type = 'maps_click')
  ) into actual
  from events where business_id = b and created_at >= ini_act and created_at < fin_act;

  select jsonb_build_object(
    'visitas',   count(*) filter (where event_type = 'page_view'),
    'personas',  count(distinct anonymous_session),
    'reservar',  count(*) filter (where event_type = 'booking_click'),
    'whatsapp',  count(*) filter (where event_type = 'whatsapp_click'),
    'telefono',  count(*) filter (where event_type = 'phone_click'),
    'maps',      count(*) filter (where event_type = 'maps_click')
  ) into previo
  from events where business_id = b and created_at >= ini_ant and created_at < ini_act;

  return jsonb_build_object(
    'mes', ini_act,
    'actual', actual,
    'previo', previo,
    'hay_comparativa', (select count(*) > 0 from events
                        where business_id = b and created_at >= ini_ant and created_at < ini_act),
    'servicios', coalesce((
      select jsonb_agg(x) from (
        select service as nombre, count(*) as total
        from events
        where business_id = b and event_type = 'service_view'
          and created_at >= ini_act and created_at < fin_act and service is not null
        group by service order by count(*) desc limit 8
      ) x), '[]'::jsonb),
    'origen', coalesce((
      select jsonb_agg(x) from (
        select coalesce(source, 'desconocido') as nombre, count(*) as total
        from events
        where business_id = b and event_type = 'page_view'
          and created_at >= ini_act and created_at < fin_act
        group by 1 order by count(*) desc
      ) x), '[]'::jsonb)
  );
end;
$$;

-- Serie de los últimos N meses, para la gráfica de histórico.
create or replace function serie_meses(p_meses int default 6)
returns jsonb
language plpgsql stable security definer as $$
declare b uuid;
begin
  select business_id into b from admins where user_id = auth.uid() limit 1;
  if b is null then raise exception 'Sin permisos'; end if;

  return coalesce((
    select jsonb_agg(x order by x.mes) from (
      select to_char(date_trunc('month', created_at), 'YYYY-MM') as mes,
             count(*) filter (where event_type = 'page_view')     as visitas,
             count(*) filter (where event_type = 'booking_click') as reservar
      from events
      where business_id = b
        and created_at >= date_trunc('month', now()) - make_interval(months => p_meses - 1)
      group by 1
    ) x), '[]'::jsonb);
end;
$$;
