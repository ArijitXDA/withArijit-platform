-- Partner signup emitter: fallback to dynamic QR-server URL when partner.qr_code_url is null.
-- Prevents the missing_critical_vars:qr_code_url silent fail on every future signup.
CREATE OR REPLACE FUNCTION lifecycle_partner_signup_emit()
RETURNS TRIGGER AS $$
DECLARE
  v_qr text;
  v_parent_email text; v_parent_name text; v_parent_mobile text;
BEGIN
  v_qr := COALESCE(
    NULLIF(NEW.qr_code_url, ''),
    CASE WHEN NEW.partner_code IS NOT NULL
         THEN 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data='
              || ENCODE(('https://webinar.ostaran.com/?utm_source=' || NEW.partner_code)::bytea, 'escape')
         ELSE '' END
  );

  IF NEW.email IS NOT NULL AND TRIM(NEW.email) <> '' THEN
    INSERT INTO lifecycle_events (
      email, mobile, event_type, event_source_table, source_row_id,
      track, metadata, occurred_at, backfilled
    ) VALUES (
      LOWER(TRIM(NEW.email)), NEW.mobile,
      'partner_approved'::lifecycle_event_type,
      'partners', NEW.id, 'partner'::lifecycle_track,
      jsonb_build_object(
        'first_name',       SPLIT_PART(COALESCE(NEW.full_name,''),' ',1),
        'full_name',        NEW.full_name,
        'partner_code',     NEW.partner_code,
        'partner_share_url',CASE WHEN NEW.partner_code IS NOT NULL
                                 THEN 'https://webinar.ostaran.com/?utm_source=' || NEW.partner_code
                                 ELSE '' END,
        'qr_code_url',      v_qr,
        'utm_link',         NEW.utm_link,
        'commission_rate',  NEW.commission_rate,
        'cascade_rate',     NEW.cascade_rate,
        'parent_partner_id',NEW.parent_partner_id,
        'level',            NEW.level,
        'dashboard_url',    'https://partner.ostaran.com/dashboard'
      ), NOW(), FALSE
    );
  END IF;

  IF NEW.parent_partner_id IS NOT NULL THEN
    SELECT email, full_name, mobile
      INTO v_parent_email, v_parent_name, v_parent_mobile
      FROM partners WHERE id = NEW.parent_partner_id;
    IF v_parent_email IS NOT NULL AND TRIM(v_parent_email) <> '' THEN
      INSERT INTO lifecycle_events (
        email, mobile, event_type, event_source_table, source_row_id,
        track, metadata, occurred_at, backfilled
      ) VALUES (
        LOWER(TRIM(v_parent_email)), v_parent_mobile,
        'subpartner_added'::lifecycle_event_type,
        'partners', NEW.id, 'partner'::lifecycle_track,
        jsonb_build_object(
          'first_name',              SPLIT_PART(COALESCE(v_parent_name,''),' ',1),
          'full_name',               v_parent_name,
          'new_partner_first_name',  SPLIT_PART(COALESCE(NEW.full_name,''),' ',1),
          'new_partner_full_name',   NEW.full_name,
          'new_partner_email_masked',CASE WHEN POSITION('@' IN COALESCE(NEW.email,'')) > 0
                                          THEN LEFT(NEW.email,2)||'***@'||SPLIT_PART(NEW.email,'@',2) ELSE '' END,
          'new_partner_code',        NEW.partner_code,
          'cascade_rate',            (SELECT cascade_rate FROM partners WHERE id = NEW.parent_partner_id),
          'network_size',            (SELECT total_network_size FROM partners WHERE id = NEW.parent_partner_id),
          'dashboard_url',           'https://partner.ostaran.com/dashboard'
        ), NOW(), FALSE
      );
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  PERFORM lifecycle_log_trigger_error(
    'lifecycle_partner_signup_emit',
    'partners', NEW.id, SQLERRM, NULL, NULL,
    jsonb_build_object('email', NEW.email, 'partner_code', NEW.partner_code)
  );
  RAISE WARNING '[lifecycle_partner_signup_emit] %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
