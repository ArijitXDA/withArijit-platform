-- The rolling / subscription "Continued Up-skilling" cohorts run 52 weekly
-- sessions (and accumulate over years), but the session_number CHECK was capped
-- at 26 (the long-format course length), so provisioning a rolling batch failed
-- at session 27 ("violates check constraint awa_session_links_session_number_check").
-- Raise the ceiling to a generous decade-of-weekly sanity bound.
ALTER TABLE awa_session_links DROP CONSTRAINT awa_session_links_session_number_check;
ALTER TABLE awa_session_links
  ADD CONSTRAINT awa_session_links_session_number_check
  CHECK (session_number >= 1 AND session_number <= 520);
