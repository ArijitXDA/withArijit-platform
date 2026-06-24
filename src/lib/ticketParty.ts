import { createClient } from '@/lib/supabase/server'
import type { Party } from '@/lib/tickets'

/** Resolve the logged-in student as a ticket Party (keyed by email). Server-only. */
export async function currentStudentParty(): Promise<Party | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null
  return {
    type: 'student',
    id: user.email.toLowerCase(),
    name: (user.user_metadata?.full_name as string) || user.email,
  }
}
