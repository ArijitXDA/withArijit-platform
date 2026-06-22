-- LLM-generated, formatted study guide (markdown) built from each session's
-- transcript. Rendered as an in-app, printable study page on the Courses page.
ALTER TABLE awa_session_links
  ADD COLUMN IF NOT EXISTS study_material_md text;
