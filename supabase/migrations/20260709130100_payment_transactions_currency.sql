-- Currency snapshot on the invoice/transaction record so the student dashboard
-- invoice renders the currency actually charged. INR columns remain authoritative.
alter table payment_transactions
  add column if not exists currency        text    not null default 'INR',
  add column if not exists fx_rate         numeric not null default 1,
  add column if not exists amount_charged  numeric;
