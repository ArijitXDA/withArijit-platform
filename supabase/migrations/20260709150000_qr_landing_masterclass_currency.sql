-- Multi-currency charge snapshot on masterclass registrations (Phase 2).
-- Internal accounting stays INR (masterclass_base_price / masterclass_discount /
-- masterclass_final_price). Only the *charge* + the *confirmation-email invoice*
-- use the foreign currency. Mirrors student_enrolments / payment_transactions.
-- Applied to shared project enszifyeqnwcnxaqrmrq via MCP; mirrored here.
alter table qr_landing_registrations
  add column if not exists masterclass_currency        text    not null default 'INR',
  add column if not exists masterclass_amount_charged  numeric,
  add column if not exists masterclass_fx_rate         numeric not null default 1;
