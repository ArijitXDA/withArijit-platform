-- Multi-currency charge snapshot on each group/bulk purchase (Phase 2). Internal
-- accounting stays INR (total_payable / total_mrp / discounts / gst_amount).
-- Applied to shared project enszifyeqnwcnxaqrmrq via MCP; mirrored here.
alter table group_enrolments
  add column if not exists currency        text    not null default 'INR',
  add column if not exists amount_charged  numeric,
  add column if not exists fx_rate         numeric not null default 1;
