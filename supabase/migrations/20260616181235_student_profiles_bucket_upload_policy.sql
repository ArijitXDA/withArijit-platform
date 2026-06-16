-- The public-read `student-profiles` storage bucket had NO insert policy, so
-- authenticated students could never upload a profile photo — every client
-- upload was denied by storage RLS (which is why "Update photo" did nothing).
-- Allow a signed-in student to write ONLY inside their own {auth.uid()}/ folder
-- (the app uploads to `${user.id}/avatar-*.jpg`). Public read already works.
CREATE POLICY "Students upload own profile photo"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'student-profiles'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Students replace own profile photo"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'student-profiles'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'student-profiles'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
