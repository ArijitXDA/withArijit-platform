-- Email subject lines are plain text — HTML entities don't decode there.
-- Three templates had &mdash; in the subject, which recipients saw as the
-- literal string "&mdash;" in their inbox instead of the em-dash (—).
-- Fix: replace any &mdash; (em-dash entity) with the actual U+2014 character.
-- Also do common entities while we're here.

UPDATE lifecycle_templates
SET subject = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        subject,
        '&mdash;', '—'),
        '&ndash;', '–'),
        '&amp;',   '&'),
        '&nbsp;',  ' '),
        '&hellip;','…'),
        '&rsquo;', E'’')   -- right single quote
WHERE channel = 'email'
  AND (subject ~ '&[a-z]+;' OR subject ~ '&#[0-9]+;');

-- Verify: no entity-bearing subjects remain
-- (Run as a SELECT after the migration completes)
