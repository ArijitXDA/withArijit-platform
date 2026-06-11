-- S6 pushes paid courses; it must stop the moment that goal is met.
UPDATE lifecycle_sequences
SET exit_on_events = ARRAY['course_enrolled','masterclass_paid','masterclass_registered','unsubscribed','do_not_contact_set']::lifecycle_event_type[],
    updated_at = now()
WHERE sequence_key = 's6_post_free_webinar_upsell';
