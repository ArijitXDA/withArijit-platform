-- Per-session recording + transcript storage for: in-page (URL-hidden) playback,
-- a formatted study-material PDF, and Assistant Professor Q&A over class content.
--   transcript_text    — full Teams transcript (AP context + study-material gen)
--   transcript_summary — short summary (cheap AP context / list previews)
--   recording_item_id  — OneDrive driveItem id, kept PRIVATE; streamed via an
--                        enrolment-gated endpoint so the real URL never reaches
--                        the client (existing recording_link stays for any
--                        already-pasted public links)
--   recording_drive_id — the drive that owns recording_item_id
ALTER TABLE awa_session_links
  ADD COLUMN IF NOT EXISTS transcript_text    text,
  ADD COLUMN IF NOT EXISTS transcript_summary text,
  ADD COLUMN IF NOT EXISTS recording_item_id  text,
  ADD COLUMN IF NOT EXISTS recording_drive_id text;
