alter table engagement_invites
  add column if not exists partner_code text,
  add column if not exists interest    text,
  add column if not exists temperature  text,
  add column if not exists remark       text;

comment on column engagement_invites.interest is 'Potential Students CRM: self | friend | kids | general';
comment on column engagement_invites.temperature is 'Potential Students CRM: cold | warm | hot | very_hot';
