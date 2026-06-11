-- One row per person (by lowercased email) stitched across every place a person
-- can appear: visitor chats, free-webinar/masterclass regs, partner CRM leads,
-- paid enrolments, engagement invites, and pre-DB old students.
create or replace view public.v_unified_lead_journey as
with all_emails as (
  select lower(trim(email))         as email from public.qr_landing_registrations where coalesce(trim(email),'')   <> ''
  union select lower(trim(visitor_email)) from public.visitor_chat_sessions   where coalesce(trim(visitor_email),'') <> ''
  union select lower(trim(email))         from public.partner_crm_leads        where coalesce(trim(email),'')   <> ''
  union select lower(trim(student_email)) from public.student_enrolments       where coalesce(trim(student_email),'') <> ''
  union select lower(trim(email))         from public.engagement_invites       where coalesce(trim(email),'')   <> ''
  union select lower(trim(email))         from public.pre_db_setup_old_students where coalesce(trim(email),'')   <> ''
),
qr as (
  select lower(trim(email)) as email,
         max(full_name) as name, max(mobile) as mobile, max(utm_source) as utm_source,
         count(*) as reg_count,
         bool_or(coalesce(is_enrolled,false)) as enrolled,
         bool_or(payment_status = 'paid') as paid,
         bool_or(attended_at is not null) as attended,
         min(coalesce(registered_at, created_at)) as first_at,
         max(coalesce(attended_at, registered_at, created_at)) as last_at
  from public.qr_landing_registrations where coalesce(trim(email),'') <> '' group by 1
),
vis as (
  select lower(trim(visitor_email)) as email,
         max(visitor_name) as name, max(visitor_mobile) as mobile, max(utm_source) as utm_source,
         max(intent_score) as intent_score, count(*) as chat_count,
         min(created_at) as first_at, max(updated_at) as last_at
  from public.visitor_chat_sessions where coalesce(trim(visitor_email),'') <> '' group by 1
),
crm as (
  select lower(trim(email)) as email,
         max(full_name) as name, max(mobile) as mobile, max(partner_code) as partner_code,
         max(status) as status, count(*) as crm_count,
         min(created_at) as first_at, max(coalesce(updated_at, created_at)) as last_at
  from public.partner_crm_leads where coalesce(trim(email),'') <> '' group by 1
),
enr as (
  select lower(trim(student_email)) as email,
         max(student_name) as name, max(student_mobile) as mobile,
         bool_or(coalesce(is_active,false)) as active_enrol,
         sum(coalesce(amount_paid,0)) as total_paid, count(*) as enrol_count,
         string_agg(distinct course_name, ', ') as courses,
         min(created_at) as first_at, max(created_at) as last_at
  from public.student_enrolments where coalesce(trim(student_email),'') <> '' group by 1
),
eng as (
  select lower(trim(email)) as email,
         max(full_name) as name, max(mobile) as mobile, max(partner_code) as partner_code, count(*) as eng_count
  from public.engagement_invites where coalesce(trim(email),'') <> '' group by 1
),
old as (
  select lower(trim(email)) as email, max(name) as name, max(mobile) as mobile
  from public.pre_db_setup_old_students where coalesce(trim(email),'') <> '' group by 1
)
select
  e.email,
  coalesce(enr.name, crm.name, qr.name, vis.name, eng.name, old.name)        as name,
  coalesce(enr.mobile, crm.mobile, qr.mobile, vis.mobile, eng.mobile, old.mobile) as mobile,
  coalesce(crm.partner_code, eng.partner_code, qr.utm_source, vis.utm_source) as attribution_code,
  case
    when coalesce(enr.enrol_count,0) > 0 then 'enrolled'
    when coalesce(crm.crm_count,0)   > 0 then 'crm_lead'
    when coalesce(qr.reg_count,0)    > 0 then 'webinar_registered'
    when coalesce(vis.chat_count,0)  > 0 then 'visitor'
    when old.email is not null            then 'old_student'
    when coalesce(eng.eng_count,0)   > 0 then 'engaged'
    else 'unknown'
  end as stage,
  (coalesce(enr.enrol_count,0) > 0)        as is_enrolled,
  coalesce(enr.active_enrol, false)        as has_active_enrolment,
  coalesce(enr.total_paid, 0)              as total_paid,
  enr.courses,
  crm.status                               as crm_status,
  coalesce(qr.reg_count, 0)                as webinar_regs,
  coalesce(qr.attended, false)             as attended_webinar,
  coalesce(qr.paid, false)                 as paid_masterclass,
  coalesce(vis.chat_count, 0)              as chat_sessions,
  vis.intent_score,
  least(qr.first_at, vis.first_at, crm.first_at, enr.first_at)  as first_seen,
  greatest(qr.last_at, vis.last_at, crm.last_at, enr.last_at)   as last_seen
from all_emails e
left join qr  on qr.email  = e.email
left join vis on vis.email = e.email
left join crm on crm.email = e.email
left join enr on enr.email = e.email
left join eng on eng.email = e.email
left join old on old.email = e.email;
