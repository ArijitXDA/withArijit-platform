-- Adds the 'rolling' batch variant for endless/subscription courses
-- (Quantum & AI — Continued Up-skilling). Additive: existing long26/weekend9 rows
-- and all logic keyed to them are unaffected.
alter table awa_batches drop constraint awa_batches_variant_check;
alter table awa_batches add constraint awa_batches_variant_check
  check (variant = any (array['long26'::text, 'weekend9'::text, 'rolling'::text]));
