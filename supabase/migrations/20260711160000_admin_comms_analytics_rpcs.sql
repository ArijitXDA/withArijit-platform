-- Recipient-level comms analytics console — read-only service-role RPCs over
-- lifecycle_dispatch_log. Powers partner-repo /admin/comms-analytics.
-- Applied directly to prod 2026-07-11; mirrored here to keep the repo in sync.
-- All filters optional (NULL/'' = no filter). Returns PII → restricted to service_role.

-- 1) MESSAGES: paginated send-log rows + window total_count on each row.
create or replace function admin_comms_messages(
  p_search text default null, p_channel text default null, p_status text default null,
  p_skip_reason text default null, p_track text default null, p_sequence_key text default null,
  p_template_key text default null, p_partner_code text default null,
  p_registration_type text default null, p_profession text default null,
  p_date_from timestamptz default null, p_date_to timestamptz default null,
  p_limit int default 50, p_offset int default 0
) returns table (
  id uuid, attempted_at timestamptz, channel text, status text, skip_reason text,
  sequence_key text, track text, step_index int, template_key text,
  recipient_email text, recipient_mobile text, recipient_name text, partner_code text,
  registration_type text, provider text, provider_message_id text, error_message text,
  delivery_status text, delivered_at timestamptz, read_at timestamptz,
  clicked boolean, total_count bigint
) language sql stable security definer set search_path = public, pg_temp as $$
  with base as (
    select dl.id, dl.attempted_at, dl.channel::text as channel, dl.status, dl.skip_reason,
           dl.step_index, dl.template_key, dl.recipient_email, dl.recipient_mobile,
           dl.enrolment_id, dl.provider, dl.provider_message_id, dl.error_message,
           dl.delivery_status, dl.delivered_at, dl.read_at,
           s.sequence_key, s.track::text as track,
           coalesce(cp.name, e.context->>'full_name', e.context->>'first_name', dl.recipient_email) as recipient_name,
           coalesce(e.context->>'partner_code', cp.partner_code) as partner_code,
           e.context->>'registration_type' as registration_type
    from lifecycle_dispatch_log dl
    left join lifecycle_sequences s on s.id = dl.sequence_id
    left join lifecycle_sequence_enrolments e on e.id = dl.enrolment_id
    left join lifecycle_contact_profile cp on lower(cp.email) = lower(dl.recipient_email)
    where (nullif(p_channel,'') is null or dl.channel::text = p_channel)
      and (nullif(p_status,'') is null or dl.status = p_status)
      and (nullif(p_skip_reason,'') is null or split_part(dl.skip_reason,':',1) = p_skip_reason)
      and (nullif(p_track,'') is null or s.track::text = p_track)
      and (nullif(p_sequence_key,'') is null or s.sequence_key = p_sequence_key)
      and (nullif(p_template_key,'') is null or dl.template_key ilike '%'||p_template_key||'%')
      and (nullif(p_partner_code,'') is null or coalesce(e.context->>'partner_code', cp.partner_code) = p_partner_code)
      and (nullif(p_registration_type,'') is null or e.context->>'registration_type' = p_registration_type)
      and (nullif(p_profession,'') is null or e.context->>'profession_choice' = p_profession)
      and (p_date_from is null or dl.attempted_at >= p_date_from)
      and (p_date_to is null or dl.attempted_at < p_date_to)
      and (nullif(p_search,'') is null
           or dl.recipient_email ilike '%'||p_search||'%'
           or dl.recipient_mobile ilike '%'||p_search||'%'
           or coalesce(cp.name, e.context->>'full_name','') ilike '%'||p_search||'%')
  )
  select id, attempted_at, channel, status, skip_reason, sequence_key, track, step_index,
         template_key, recipient_email, recipient_mobile, recipient_name, partner_code,
         registration_type, provider, provider_message_id, error_message,
         delivery_status, delivered_at, read_at,
         exists(select 1 from comms_click_event cce
                where cce.enrolment_id = base.enrolment_id
                  and cce.template_key = base.template_key
                  and cce.clicked_at >= base.attempted_at) as clicked,
         count(*) over() as total_count
  from base
  order by attempted_at desc
  limit greatest(p_limit,1) offset greatest(p_offset,0)
$$;

-- 2) RECIPIENTS: one row per recipient email (aggregate counts + identity) + window total_count.
create or replace function admin_comms_recipients(
  p_search text default null, p_channel text default null, p_status text default null,
  p_skip_reason text default null, p_track text default null, p_sequence_key text default null,
  p_template_key text default null, p_partner_code text default null,
  p_registration_type text default null, p_profession text default null,
  p_date_from timestamptz default null, p_date_to timestamptz default null,
  p_limit int default 50, p_offset int default 0
) returns table (
  recipient_email text, recipient_name text, recipient_mobile text, partner_code text,
  is_hot_lead boolean, stage_reached text, consent_email_state text, consent_whatsapp_state text,
  is_suppressed boolean, total_msgs bigint, sent bigint, failed bigint, skipped bigint,
  clicked bigint, channels text, first_contacted timestamptz, last_contacted timestamptz,
  total_count bigint
) language sql stable security definer set search_path = public, pg_temp as $$
  with base as (
    select dl.attempted_at, dl.channel::text as channel, dl.status, dl.template_key, dl.enrolment_id,
           dl.recipient_email, dl.recipient_mobile,
           coalesce(cp.name, e.context->>'full_name', e.context->>'first_name', dl.recipient_email) as recipient_name,
           coalesce(e.context->>'partner_code', cp.partner_code) as partner_code,
           cp.is_hot_lead, cp.stage_reached, cp.consent_email_state, cp.consent_whatsapp_state, cp.is_suppressed
    from lifecycle_dispatch_log dl
    left join lifecycle_sequences s on s.id = dl.sequence_id
    left join lifecycle_sequence_enrolments e on e.id = dl.enrolment_id
    left join lifecycle_contact_profile cp on lower(cp.email) = lower(dl.recipient_email)
    where (nullif(p_channel,'') is null or dl.channel::text = p_channel)
      and (nullif(p_status,'') is null or dl.status = p_status)
      and (nullif(p_skip_reason,'') is null or split_part(dl.skip_reason,':',1) = p_skip_reason)
      and (nullif(p_track,'') is null or s.track::text = p_track)
      and (nullif(p_sequence_key,'') is null or s.sequence_key = p_sequence_key)
      and (nullif(p_template_key,'') is null or dl.template_key ilike '%'||p_template_key||'%')
      and (nullif(p_partner_code,'') is null or coalesce(e.context->>'partner_code', cp.partner_code) = p_partner_code)
      and (nullif(p_registration_type,'') is null or e.context->>'registration_type' = p_registration_type)
      and (nullif(p_profession,'') is null or e.context->>'profession_choice' = p_profession)
      and (p_date_from is null or dl.attempted_at >= p_date_from)
      and (p_date_to is null or dl.attempted_at < p_date_to)
      and (nullif(p_search,'') is null
           or dl.recipient_email ilike '%'||p_search||'%'
           or dl.recipient_mobile ilike '%'||p_search||'%'
           or coalesce(cp.name, e.context->>'full_name','') ilike '%'||p_search||'%')
  ),
  withclick as (
    select b.*, exists(select 1 from comms_click_event cce
             where cce.enrolment_id = b.enrolment_id and cce.template_key = b.template_key
               and cce.clicked_at >= b.attempted_at) as clicked
    from base b
  ),
  grouped as (
    select recipient_email,
      max(recipient_name) as recipient_name,
      max(recipient_mobile) as recipient_mobile,
      max(partner_code) as partner_code,
      bool_or(coalesce(is_hot_lead,false)) as is_hot_lead,
      max(stage_reached) as stage_reached,
      max(consent_email_state) as consent_email_state,
      max(consent_whatsapp_state) as consent_whatsapp_state,
      bool_or(coalesce(is_suppressed,false)) as is_suppressed,
      count(*) as total_msgs,
      count(*) filter (where status='sent') as sent,
      count(*) filter (where status='failed') as failed,
      count(*) filter (where status='skipped') as skipped,
      count(*) filter (where clicked) as clicked,
      string_agg(distinct channel, ', ' order by channel) as channels,
      min(attempted_at) as first_contacted,
      max(attempted_at) as last_contacted
    from withclick group by recipient_email
  )
  select recipient_email, recipient_name, recipient_mobile, partner_code, is_hot_lead, stage_reached,
         consent_email_state, consent_whatsapp_state, is_suppressed, total_msgs, sent, failed, skipped,
         clicked, channels, first_contacted, last_contacted, count(*) over() as total_count
  from grouped
  order by last_contacted desc
  limit greatest(p_limit,1) offset greatest(p_offset,0)
$$;

-- 3) RECIPIENT DETAIL: identity card + suppression + full message timeline (jsonb).
create or replace function admin_comms_recipient_detail(p_email text)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'email', p_email,
    'profile', (
      select to_jsonb(x) from (
        select cp.email, cp.name, cp.mobile, cp.partner_code, cp.is_hot_lead, cp.stage_reached,
               cp.lead_score, cp.latest_readiness_level, cp.consent_email_state, cp.consent_whatsapp_state,
               cp.is_suppressed, cp.total_paid, cp.ever_webinar_reg_count, cp.ever_masterclass_paid_count,
               cp.ever_attended_free_count, cp.ever_attended_paid_count, cp.ever_enrolled_count,
               cp.last_event_type, cp.last_event_at, cp.active_sequences
        from lifecycle_contact_profile cp where lower(cp.email) = lower(p_email) limit 1
      ) x
    ),
    'suppression', (
      select to_jsonb(sp) from (
        select channels, reason, notes, set_at from lifecycle_suppression
        where lower(email) = lower(p_email) limit 1
      ) sp
    ),
    'messages', coalesce((
      select jsonb_agg(to_jsonb(m) order by m.attempted_at desc) from (
        select dl.id, dl.attempted_at, dl.channel::text as channel, dl.status, dl.skip_reason,
               s.sequence_key, s.track::text as track, dl.step_index, dl.template_key,
               dl.provider, dl.provider_message_id, dl.error_message,
               dl.delivery_status, dl.delivered_at, dl.read_at,
               exists(select 1 from comms_click_event cce
                      where cce.enrolment_id = dl.enrolment_id and cce.template_key = dl.template_key
                        and cce.clicked_at >= dl.attempted_at) as clicked
        from lifecycle_dispatch_log dl
        left join lifecycle_sequences s on s.id = dl.sequence_id
        where lower(dl.recipient_email) = lower(p_email)
        order by dl.attempted_at desc limit 500
      ) m
    ), '[]'::jsonb)
  )
$$;

-- 4) KPIs: aggregate strip over the filtered set (jsonb).
create or replace function admin_comms_kpis(
  p_search text default null, p_channel text default null, p_status text default null,
  p_skip_reason text default null, p_track text default null, p_sequence_key text default null,
  p_template_key text default null, p_partner_code text default null,
  p_registration_type text default null, p_profession text default null,
  p_date_from timestamptz default null, p_date_to timestamptz default null
) returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  with base as (
    select dl.channel::text as channel, dl.status, dl.skip_reason, dl.delivery_status, dl.delivered_at,
           dl.enrolment_id, dl.template_key, dl.attempted_at, dl.recipient_email, s.sequence_key,
           exists(select 1 from comms_click_event cce
                  where cce.enrolment_id = dl.enrolment_id and cce.template_key = dl.template_key
                    and cce.clicked_at >= dl.attempted_at) as clicked
    from lifecycle_dispatch_log dl
    left join lifecycle_sequences s on s.id = dl.sequence_id
    left join lifecycle_sequence_enrolments e on e.id = dl.enrolment_id
    left join lifecycle_contact_profile cp on lower(cp.email) = lower(dl.recipient_email)
    where (nullif(p_channel,'') is null or dl.channel::text = p_channel)
      and (nullif(p_status,'') is null or dl.status = p_status)
      and (nullif(p_skip_reason,'') is null or split_part(dl.skip_reason,':',1) = p_skip_reason)
      and (nullif(p_track,'') is null or s.track::text = p_track)
      and (nullif(p_sequence_key,'') is null or s.sequence_key = p_sequence_key)
      and (nullif(p_template_key,'') is null or dl.template_key ilike '%'||p_template_key||'%')
      and (nullif(p_partner_code,'') is null or coalesce(e.context->>'partner_code', cp.partner_code) = p_partner_code)
      and (nullif(p_registration_type,'') is null or e.context->>'registration_type' = p_registration_type)
      and (nullif(p_profession,'') is null or e.context->>'profession_choice' = p_profession)
      and (p_date_from is null or dl.attempted_at >= p_date_from)
      and (p_date_to is null or dl.attempted_at < p_date_to)
      and (nullif(p_search,'') is null
           or dl.recipient_email ilike '%'||p_search||'%'
           or dl.recipient_mobile ilike '%'||p_search||'%'
           or coalesce(cp.name, e.context->>'full_name','') ilike '%'||p_search||'%')
  )
  select jsonb_build_object(
    'total', count(*),
    'sent', count(*) filter (where status='sent'),
    'failed', count(*) filter (where status='failed'),
    'skipped', count(*) filter (where status='skipped'),
    'delivered', count(*) filter (where delivery_status='delivered' or delivered_at is not null),
    'clicked', count(*) filter (where clicked),
    'recipients', count(distinct recipient_email),
    'by_channel', coalesce((select jsonb_object_agg(channel, c) from (select channel, count(*) c from base group by channel) z), '{}'::jsonb),
    'by_status',  coalesce((select jsonb_object_agg(status, c) from (select status, count(*) c from base group by status) z), '{}'::jsonb),
    'top_skip_reasons', coalesce((select jsonb_agg(jsonb_build_object('reason', r, 'n', c) order by c desc) from (select split_part(skip_reason,':',1) r, count(*) c from base where status='skipped' group by 1 order by c desc limit 8) z), '[]'::jsonb),
    'top_sequences', coalesce((select jsonb_agg(jsonb_build_object('sequence_key', sk, 'n', c) order by c desc) from (select sequence_key sk, count(*) c from base where sequence_key is not null group by 1 order by c desc limit 8) z), '[]'::jsonb)
  ) from base
$$;

-- 5) FILTER OPTIONS: distinct values for the filter controls (jsonb).
create or replace function admin_comms_filter_options()
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'tracks', coalesce((select jsonb_agg(distinct track::text) from lifecycle_sequences), '[]'::jsonb),
    'sequences', coalesce((select jsonb_agg(jsonb_build_object('key', sequence_key, 'name', name, 'track', track::text) order by track::text, sequence_key) from lifecycle_sequences where is_active), '[]'::jsonb),
    'channels', to_jsonb(array['email','whatsapp']),
    'statuses', to_jsonb(array['sent','failed','skipped']),
    'skip_reasons', coalesce((select jsonb_agg(distinct split_part(skip_reason,':',1)) from lifecycle_dispatch_log where skip_reason is not null and skip_reason <> ''), '[]'::jsonb),
    'registration_types', coalesce((select jsonb_agg(distinct rt) from (select context->>'registration_type' rt from lifecycle_sequence_enrolments where context ? 'registration_type') z where rt is not null and rt <> ''), '[]'::jsonb),
    'professions', coalesce((select jsonb_agg(distinct pc) from (select context->>'profession_choice' pc from lifecycle_sequence_enrolments where context ? 'profession_choice') z where pc is not null and pc <> ''), '[]'::jsonb),
    'partner_codes', coalesce((select jsonb_agg(pc order by n desc) from (select context->>'partner_code' pc, count(*) n from lifecycle_sequence_enrolments where context ? 'partner_code' group by 1 order by n desc limit 150) z where pc is not null and pc <> ''), '[]'::jsonb)
  )
$$;

-- Lock down: these return PII; only the service-role (server-side admin) may call them.
revoke all on function admin_comms_messages(text,text,text,text,text,text,text,text,text,text,timestamptz,timestamptz,int,int) from public;
revoke all on function admin_comms_recipients(text,text,text,text,text,text,text,text,text,text,timestamptz,timestamptz,int,int) from public;
revoke all on function admin_comms_recipient_detail(text) from public;
revoke all on function admin_comms_kpis(text,text,text,text,text,text,text,text,text,text,timestamptz,timestamptz) from public;
revoke all on function admin_comms_filter_options() from public;
grant execute on function admin_comms_messages(text,text,text,text,text,text,text,text,text,text,timestamptz,timestamptz,int,int) to service_role;
grant execute on function admin_comms_recipients(text,text,text,text,text,text,text,text,text,text,timestamptz,timestamptz,int,int) to service_role;
grant execute on function admin_comms_recipient_detail(text) to service_role;
grant execute on function admin_comms_kpis(text,text,text,text,text,text,text,text,text,text,timestamptz,timestamptz) to service_role;
grant execute on function admin_comms_filter_options() to service_role;
