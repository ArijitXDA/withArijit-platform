alter table engagement_invites
  add column if not exists reminder_email_sent_at timestamptz,
  add column if not exists reminder_wa_sent_at    timestamptz;
