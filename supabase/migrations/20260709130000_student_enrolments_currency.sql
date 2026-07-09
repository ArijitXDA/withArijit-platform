-- Multi-currency charge snapshot on each enrolment (Phase 2). Internal accounting
-- stays INR (amount_paid / net_after_discount / balance_due / commissions).
-- Applied to shared project enszifyeqnwcnxaqrmrq via MCP; mirrored here.
alter table student_enrolments
  add column if not exists currency        text    not null default 'INR',
  add column if not exists amount_charged  numeric,
  add column if not exists fx_rate         numeric not null default 1;
