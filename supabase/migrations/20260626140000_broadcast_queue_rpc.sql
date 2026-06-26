-- Segment → eligible contacts. Dry-run returns the count (segment preview);
-- otherwise materialises queued broadcast_sends for the campaign (idempotent).
-- Always excludes suppressed / bounced / complained / invalid / unmapped-email.
create or replace function broadcast_queue(
  p_campaign uuid,
  p_sources text[]   default null,
  p_countries text[] default null,
  p_cities text[]    default null,
  p_genders text[]   default null,
  p_age_min int      default null,
  p_age_max int      default null,
  p_occupation text  default null,
  p_company text     default null,
  p_engagement text  default 'any',
  p_exclude_converted boolean default true,
  p_limit int        default null,
  p_dry_run boolean  default false
) returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count int;
begin
  create temp table _elig on commit drop as
    select c.id, c.email
    from broadcast_contacts c
    where c.email is not null
      and c.unsub_email = false
      and c.hard_bounced = false
      and c.complained = false
      and c.email_status <> 'invalid'
      and (p_sources   is null or c.source = any(p_sources))
      and (p_countries is null or lower(coalesce(c.country,'')) = any(select lower(x) from unnest(p_countries) x))
      and (p_cities    is null or lower(coalesce(c.city,''))    = any(select lower(x) from unnest(p_cities) x))
      and (p_genders   is null or lower(coalesce(c.gender,''))  = any(select lower(x) from unnest(p_genders) x))
      and (p_age_min   is null or c.age >= p_age_min)
      and (p_age_max   is null or c.age <= p_age_max)
      and (p_occupation is null or c.occupation ilike '%'||p_occupation||'%')
      and (p_company    is null or c.company_college ilike '%'||p_company||'%')
      and (not p_exclude_converted or c.converted_at is null)
      and (
        p_engagement = 'any'
        or (p_engagement = 'never_sent'     and c.last_sent_at is null)
        or (p_engagement = 'sent_not_opened' and c.last_sent_at is not null and c.last_opened_at is null)
        or (p_engagement = 'opened'         and c.last_opened_at is not null)
        or (p_engagement = 'clicked'        and c.last_clicked_at is not null)
        or (p_engagement = 'not_clicked'    and c.last_clicked_at is null)
      )
    order by c.created_at
    limit coalesce(p_limit, 5000000);

  if p_dry_run then
    select count(*) into v_count from _elig;
  else
    with ins as (
      insert into broadcast_sends (campaign_id, contact_id, email, status)
      select p_campaign, id, email, 'queued' from _elig
      on conflict (campaign_id, contact_id) do nothing
      returning 1
    )
    select count(*) into v_count from ins;
  end if;
  return v_count;
end $$;

revoke execute on function broadcast_queue(uuid, text[], text[], text[], text[], int, int, text, text, text, boolean, int, boolean) from public;
