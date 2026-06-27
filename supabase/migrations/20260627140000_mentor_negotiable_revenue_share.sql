-- ============================================================================
-- Negotiable mentor revenue share (course-level), with a per-enrolment snapshot.
-- Split is stored in basis points (bps): 5000 = 50% (default), 9000 = 90% (max).
-- Applied to the shared Supabase project via MCP on 2026-06-27; this file mirrors
-- that change for repo/rebuild parity. Idempotent.
-- ============================================================================

-- 1) Course-level mentor split override (the negotiated, course-level rate).
alter table public.awa_courses
  add column if not exists mentor_split_bps integer,
  add column if not exists mentor_split_min_students integer,
  add column if not exists mentor_split_set_at timestamptz,
  add column if not exists mentor_split_set_by uuid,
  add column if not exists mentor_split_request_id uuid;

comment on column public.awa_courses.mentor_split_bps is
  'Negotiated mentor revenue share for THIS course, in basis points (5000=50%..9000=90%). NULL = fall back to mentors.split_bps, then 5000.';
comment on column public.awa_courses.mentor_split_min_students is
  'Monthly minimum-students commitment the elevated split was granted against (admin reviews vs actuals).';

alter table public.awa_courses drop constraint if exists awa_courses_mentor_split_bps_range;
alter table public.awa_courses add constraint awa_courses_mentor_split_bps_range
  check (mentor_split_bps is null or (mentor_split_bps between 5000 and 9000));

-- 2) Per-enrolment snapshot of the applicable split at enrolment time.
--    NULL on legacy/pre-feature rows -> payouts treats as 5000 (50%), i.e. unchanged.
alter table public.student_enrolments
  add column if not exists mentor_split_bps integer;
comment on column public.student_enrolments.mentor_split_bps is
  'Snapshot of the effective mentor split (bps) at enrolment time. NULL = legacy -> 5000 (50%). Stamped only for mentor-owned courses.';
alter table public.student_enrolments drop constraint if exists student_enrolments_mentor_split_bps_range;
alter table public.student_enrolments add constraint student_enrolments_mentor_split_bps_range
  check (mentor_split_bps is null or (mentor_split_bps between 0 and 10000));

-- 3) Negotiation request/approval (course-level), dev-admin approves.
create table if not exists public.mentor_share_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  mentor_id uuid not null references public.mentors(id) on delete cascade,
  course_id uuid not null references public.awa_courses(id) on delete cascade,
  current_split_bps integer not null default 5000,
  requested_split_bps integer not null,
  min_students_per_month integer not null,
  credentials_text text,
  status text not null default 'pending',
  admin_note text,
  decided_by uuid,
  decided_at timestamptz,
  constraint mentor_share_requests_requested_range check (requested_split_bps between 5000 and 9000),
  constraint mentor_share_requests_min_students_pos check (min_students_per_month >= 1),
  constraint mentor_share_requests_status_chk check (status in ('pending','approved','rejected','withdrawn'))
);

-- At most one OPEN (pending) request per course.
create unique index if not exists mentor_share_requests_one_open_per_course
  on public.mentor_share_requests (course_id) where status = 'pending';
create index if not exists mentor_share_requests_mentor_idx on public.mentor_share_requests (mentor_id, created_at desc);
create index if not exists mentor_share_requests_status_idx on public.mentor_share_requests (status, created_at desc);

-- RLS enabled, no policies => reachable only via service-role server code,
-- matching the mentors / mentor_payout_ledger / mentor_webinars convention.
alter table public.mentor_share_requests enable row level security;

-- 4) Dedicated before-insert trigger for student_enrolments that stamps BOTH
--    owner_mentor_id (preserving prior behaviour) AND the mentor_split_bps snapshot,
--    using precedence: course override -> mentor default -> 5000 (50%).
--    Kept separate from the shared mentor_stamp_owner_from_course() (still used by
--    awa_batches, which has no mentor_split_bps column).
create or replace function public.mentor_stamp_enrolment_owner_split()
returns trigger language plpgsql as $$
declare
  v_owner        uuid;
  v_course_split int;
  v_mentor_split int;
begin
  if new.course_id is not null then
    select c.owner_mentor_id, c.mentor_split_bps
      into v_owner, v_course_split
      from public.awa_courses c
      where c.id = new.course_id;

    if new.owner_mentor_id is null then
      new.owner_mentor_id := v_owner;
    end if;

    if new.owner_mentor_id is not null and new.mentor_split_bps is null then
      select m.split_bps into v_mentor_split
        from public.mentors m where m.id = new.owner_mentor_id;
      new.mentor_split_bps := coalesce(v_course_split, v_mentor_split, 5000);
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_stamp_owner_enrolments on public.student_enrolments;
create trigger trg_stamp_owner_enrolments
  before insert on public.student_enrolments
  for each row execute function public.mentor_stamp_enrolment_owner_split();
