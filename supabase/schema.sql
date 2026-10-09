-- Trainingsplanner Golfacademy Almeerderhout — databaseschema voor Supabase (Postgres)
-- Uitvoeren in: Supabase → SQL Editor → New query → plakken → Run.
-- Daarna: supabase/seed.sql (basisgegevens) en eventueel supabase/drills.sql.

create extension if not exists "pgcrypto";

-- ---------- Tabellen ----------
create table if not exists coaches (
  id text primary key default gen_random_uuid()::text,
  user_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  email text unique,
  phone text default '',
  color text default '#7A7F85',
  is_coordinator boolean not null default false,
  is_coach boolean not null default true,
  specialisaties jsonb default '[]'::jsonb,
  availability jsonb default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists members (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  email text default '',
  phone text default '',
  birth_year int,
  note text default '',
  active boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists seasons (
  id text primary key default gen_random_uuid()::text,
  name text not null, start date not null, "end" date not null
);
create table if not exists breaks (
  id text primary key default gen_random_uuid()::text,
  season_id text references seasons(id) on delete cascade,
  name text not null, start date not null, "end" date not null
);
create table if not exists locations (
  id text primary key default gen_random_uuid()::text,
  name text not null, short text default '', type text default 'oefen',
  shared boolean not null default false, capacity int default 1, "order" int default 99
);
create table if not exists group_types (
  id text primary key default gen_random_uuid()::text,
  name text not null, color text default '#7A7F85', "order" int default 99
);
create table if not exists activity_types (
  id text primary key default gen_random_uuid()::text,
  name text not null, color text default '#7A7F85', "order" int default 99
);
create table if not exists groups (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  type_id text references group_types(id) on delete set null,
  level text default '', age text default '', max int,
  location_id text references locations(id) on delete set null,
  season_id text references seasons(id) on delete set null,
  coach_ids jsonb default '[]'::jsonb,
  description text default '',
  is_course boolean not null default false,
  profile text default 'recreatief', goal text default '', mjop text default '',
  active boolean not null default true,
  created_at timestamptz default now()
);
create table if not exists group_members (
  id text primary key default gen_random_uuid()::text,
  group_id text not null references groups(id) on delete cascade,
  member_id text not null references members(id) on delete cascade,
  since date default current_date,
  unique (group_id, member_id)
);
create table if not exists schedule_rules (
  id text primary key default gen_random_uuid()::text,
  kind text not null default 'group',           -- group | activity
  group_id text references groups(id) on delete cascade,
  type_id text references activity_types(id) on delete set null,
  title text default '',
  freq text not null default 'weekly',           -- once | weekly | biweekly | monthly_nth | custom
  interval int default 1,
  weekdays jsonb default '[]'::jsonb,            -- [1,3] (0 = zondag)
  nth jsonb,                                     -- {"week":1,"weekday":1} of week -1 = laatste
  dates jsonb,                                   -- ["2026-10-05", ...] bij custom
  start date not null, "end" date, count int,
  van text not null, tot text not null,          -- "HH:MM"
  location_id text references locations(id) on delete set null,
  coach_ids jsonb default '[]'::jsonb,
  note text default '',
  season_id text references seasons(id) on delete set null,
  skip_breaks boolean not null default true,
  archived boolean not null default false,
  created_by text references coaches(id) on delete set null,
  created_at timestamptz default now()
);
create table if not exists overrides (
  id text primary key default gen_random_uuid()::text,
  rule_id text not null references schedule_rules(id) on delete cascade,
  date date not null,                            -- oorspronkelijke datum van het voorkomen
  status text not null default 'gepland',        -- gepland | cancelled | moved
  new_date date, van text, tot text,
  location_id text references locations(id) on delete set null,
  coach_ids jsonb,
  note text, reason text default '',
  unique (rule_id, date)
);
create table if not exists logs (
  id text primary key default gen_random_uuid()::text,
  session_key text not null unique,              -- rule_id + '_' + datum
  rule_id text references schedule_rules(id) on delete cascade,
  date date not null,
  coach_id text references coaches(id) on delete set null,
  given boolean not null default true,
  as_planned boolean not null default true,
  count int,
  worked_well text default '', next_time text default '',
  created timestamptz default now()
);
create table if not exists attendance (
  id text primary key default gen_random_uuid()::text,
  session_key text not null,
  member_id text not null references members(id) on delete cascade,
  present boolean not null default true,
  date date,
  unique (session_key, member_id)
);
create table if not exists action_items (
  id text primary key default gen_random_uuid()::text,
  coach_id text references coaches(id) on delete cascade,
  text text not null, date date, done boolean not null default false,
  link_group_id text references groups(id) on delete set null,
  created_at timestamptz default now()
);
create table if not exists drills (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  main_cat text not null default 'golfskills',
  sub_cats jsonb default '[]'::jsonb,
  goal text default '', exec text default '', vars text default '',
  dur_unit text default 'min', dur_value text default '', dur_min text default '',
  audience text default 'groep',
  location jsonb default '[]'::jsonb, workform text default '',
  grp_min text default '', grp_max text default '',
  material jsonb default '[]'::jsonb, age_cats jsonb default '[]'::jsonb,
  intensity text default '', training_type text default '',
  tags jsonb default '[]'::jsonb,
  levels jsonb default '[]'::jsonb,
  phases jsonb default '[]'::jsonb,
  fav_ids jsonb default '[]'::jsonb,
  image text,
  builtin boolean not null default false,
  status text not null default 'goedgekeurd',     -- concept | goedgekeurd
  owner_id text references coaches(id) on delete set null,
  created date default current_date
);
create table if not exists notifications (
  id text primary key default gen_random_uuid()::text,
  coach_id text references coaches(id) on delete cascade,
  type text, text text, link text, read boolean default false,
  created_at timestamptz default now()
);

create table if not exists group_themes (
  id text primary key default gen_random_uuid()::text,
  group_id text not null references groups(id) on delete cascade,
  name text not null, start date not null, weeks int default 4,
  focus_cats jsonb default '[]'::jsonb, goal text default '', color text default '#7A7F85'
);
create table if not exists lesson_plans (
  id text primary key default gen_random_uuid()::text,
  session_key text not null unique,
  rule_id text references schedule_rules(id) on delete cascade,
  date date not null,
  group_id text references groups(id) on delete set null,
  theme_id text references group_themes(id) on delete set null,
  thema text default '', lesdoel text default '', notitie text default '',
  status text not null default 'concept',          -- concept | definitief
  source text default 'coach',                     -- coach | generator
  round int default 0,
  blocks jsonb default '[]'::jsonb,                -- [{id,phase,drill_id,title,minutes,note}]
  updated timestamptz default now()
);

create table if not exists requests (
  id text primary key default gen_random_uuid()::text,
  type text not null default 'afmelding',
  session_key text not null, rule_id text references schedule_rules(id) on delete cascade, date date,
  coach_id text references coaches(id) on delete cascade,
  target_coach_id text references coaches(id) on delete set null,
  reason text default '', status text not null default 'open',   -- open | resolved | withdrawn
  resolved_by text, created_at timestamptz default now()
);

create table if not exists programs (
  id text primary key default gen_random_uuid()::text,
  group_id text not null references groups(id) on delete cascade,
  season_id text not null references seasons(id) on delete cascade,
  profile text default 'recreatief', goal text default '', mjop text default '',
  notes text default '', emphasis jsonb default '{}'::jsonb, block_shares jsonb default '[15,35,35,15]'::jsonb,
  locations jsonb default '[]'::jsonb, repeat_weeks int default 6, fav_first boolean default true,
  phases jsonb default '[]'::jsonb, peaks jsonb default '[]'::jsonb, locked jsonb default '[]'::jsonb, cfg jsonb default '{}'::jsonb,
  unique (group_id, season_id)
);

-- ---------- Rechten (Row Level Security) ----------
-- Hulpfuncties: wie ben ik?
create or replace function my_coach_id() returns text language sql stable security definer as $$
  select id from coaches where user_id = auth.uid() limit 1;
$$;
create or replace function is_coordinator() returns boolean language sql stable security definer as $$
  select coalesce((select is_coordinator and active from coaches where user_id = auth.uid() limit 1), false);
$$;
create or replace function is_team() returns boolean language sql stable security definer as $$
  select coalesce((select active from coaches where user_id = auth.uid() limit 1), false);
$$;

-- Alle tabellen: RLS aan.
do $$ declare t text; begin
  foreach t in array array['coaches','members','seasons','breaks','locations','group_types','activity_types','groups','group_members','schedule_rules','overrides','logs','attendance','action_items','drills','notifications','lesson_plans','group_themes','requests','programs'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "team leest" on %I', t);
    execute format('create policy "team leest" on %I for select using (is_team())', t);
  end loop;
end $$;

-- Uitzondering: een ingelogde gebruiker mag altijd zijn eigen coach-rij vinden (nodig bij eerste login, vóór koppeling).
drop policy if exists "eigen rij op e-mail" on coaches;
create policy "eigen rij op e-mail" on coaches for select using (auth.uid() is not null and (user_id = auth.uid() or lower(email) = lower(auth.jwt() ->> 'email')));
drop policy if exists "koppel eigen account" on coaches;
create policy "koppel eigen account" on coaches for update using (lower(email) = lower(auth.jwt() ->> 'email') and user_id is null) with check (user_id = auth.uid());
drop policy if exists "eigen profiel" on coaches;
create policy "eigen profiel" on coaches for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Coördinator: alles schrijven.
do $$ declare t text; begin
  foreach t in array array['coaches','members','seasons','breaks','locations','group_types','activity_types','groups','group_members','schedule_rules','overrides','logs','attendance','action_items','drills','notifications','lesson_plans','group_themes','requests','programs'] loop
    execute format('drop policy if exists "coordinator schrijft" on %I', t);
    execute format('create policy "coordinator schrijft" on %I for all using (is_coordinator()) with check (is_coordinator())', t);
  end loop;
end $$;

-- Coach: losse activiteiten aanmaken/wijzigen waar hij/zij zelf op staat.
drop policy if exists "coach eigen activiteit" on schedule_rules;
create policy "coach eigen activiteit" on schedule_rules for all
  using (is_team() and kind = 'activity' and coach_ids ? my_coach_id())
  with check (is_team() and kind = 'activity' and coach_ids ? my_coach_id());
-- Coach: afwijking/afgelasting op eigen sessies.
drop policy if exists "coach eigen override" on overrides;
create policy "coach eigen override" on overrides for all
  using (is_team() and exists (select 1 from schedule_rules r where r.id = rule_id and (r.coach_ids ? my_coach_id() or (coach_ids ? my_coach_id()))))
  with check (is_team() and exists (select 1 from schedule_rules r where r.id = rule_id and (r.coach_ids ? my_coach_id() or (coach_ids ? my_coach_id()))));
-- Coach: eigen logs, aanwezigheid, actiepunten, drills.
-- Coach: lesvoorbereiding van sessies waar hij/zij op staat.
drop policy if exists "coach eigen lesplan" on lesson_plans;
create policy "coach eigen lesplan" on lesson_plans for all
  using (is_team() and exists (select 1 from schedule_rules r where r.id = rule_id and r.coach_ids ? my_coach_id()))
  with check (is_team() and exists (select 1 from schedule_rules r where r.id = rule_id and r.coach_ids ? my_coach_id()));
drop policy if exists "coach eigen programma" on programs;
create policy "coach eigen programma" on programs for all using (is_team() and exists (select 1 from groups g where g.id = group_id and g.coach_ids ? my_coach_id())) with check (is_team() and exists (select 1 from groups g where g.id = group_id and g.coach_ids ? my_coach_id()));
drop policy if exists "coach eigen thema" on group_themes;
create policy "coach eigen thema" on group_themes for all using (is_team() and exists (select 1 from groups g where g.id = group_id and g.coach_ids ? my_coach_id())) with check (is_team() and exists (select 1 from groups g where g.id = group_id and g.coach_ids ? my_coach_id()));
drop policy if exists "coach eigen log" on logs;
create policy "coach eigen log" on logs for all using (is_team() and coach_id = my_coach_id()) with check (is_team() and coach_id = my_coach_id());
drop policy if exists "coach aanwezigheid" on attendance;
create policy "coach aanwezigheid" on attendance for all using (is_team()) with check (is_team());
drop policy if exists "coach eigen acties" on action_items;
create policy "coach eigen acties" on action_items for all using (is_team() and coach_id = my_coach_id()) with check (is_team() and coach_id = my_coach_id());
drop policy if exists "team favorieten" on drills;
create policy "team favorieten" on drills for update using (is_team() and status = 'goedgekeurd') with check (is_team());
drop policy if exists "coach eigen drills" on drills;
create policy "coach eigen drills" on drills for all using (is_team() and owner_id = my_coach_id()) with check (is_team() and owner_id = my_coach_id());
drop policy if exists "coach eigen meldingen" on notifications;
create policy "coach eigen meldingen" on notifications for update using (coach_id = my_coach_id()) with check (coach_id = my_coach_id());
drop policy if exists "team stuurt meldingen" on notifications;
create policy "team stuurt meldingen" on notifications for insert with check (is_team());
drop policy if exists "coach verzoeken" on requests;
create policy "coach verzoeken" on requests for all using (is_team() and (coach_id = my_coach_id() or target_coach_id = my_coach_id())) with check (is_team() and (coach_id = my_coach_id() or target_coach_id = my_coach_id()));
-- Vervanger accepteren: override op een sessie waar je voor gevraagd bent.
drop policy if exists "vervanger override" on overrides;
create policy "vervanger override" on overrides for all
  using (is_team() and exists (select 1 from requests q where q.rule_id = rule_id and q.target_coach_id = my_coach_id()))
  with check (is_team());

-- Realtime aanzetten voor alle tabellen.
do $$ declare t text; begin
  foreach t in array array['coaches','members','seasons','breaks','locations','group_types','activity_types','groups','group_members','schedule_rules','overrides','logs','attendance','action_items','drills','notifications','lesson_plans','group_themes','requests','programs'] loop
    begin execute format('alter publication supabase_realtime add table %I', t); exception when duplicate_object then null; end;
  end loop;
end $$;
