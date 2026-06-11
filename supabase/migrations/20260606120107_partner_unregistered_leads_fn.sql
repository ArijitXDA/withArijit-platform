create or replace function partner_unregistered_leads(p_partner_id uuid)
returns setof partner_crm_leads
language sql stable security definer
as $$
  select l.*
  from partner_crm_leads l
  where l.partner_id = p_partner_id
    and l.registered_at is null
    and (
      l.email is null
      or not exists (
        select 1 from qr_landing_registrations q
        where lower(trim(q.email)) = lower(trim(l.email))
      )
    )
  order by l.created_at desc
$$;
