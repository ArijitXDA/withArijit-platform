// Active co-mentors for a course, shaped like the CourseTrainer's Trainer type.
// Photo falls back from the mentor's trainer photo to their partner profile pic.

export interface CoTrainer {
  name: string
  title: string
  location: string
  photo: string | null
  linkedin: string | null
  research: string[]
  bio: string[]
  credentials: { label: string; value: string; sub: string }[]
}

export async function getCourseCoMentors(supabase: any, courseId: string): Promise<CoTrainer[]> {
  const { data: rows } = await supabase
    .from('course_mentors')
    .select('sort_order, mentor:mentor_id(full_name, trainer_title, trainer_location, trainer_photo_url, trainer_linkedin, trainer_bio, trainer_credentials, trainer_research_areas, partner_id)')
    .eq('course_id', courseId)
    .eq('role', 'co')
    .eq('status', 'active')
    .order('sort_order')

  const list = (rows ?? []).map((r: any) => r.mentor).filter(Boolean)
  if (!list.length) return []

  // Fallback photo from the partner profile pic for mentors without a trainer photo.
  const needPic = list.filter((m: any) => !m.trainer_photo_url && m.partner_id).map((m: any) => m.partner_id)
  let picByPartner: Record<string, string> = {}
  if (needPic.length) {
    const { data: prts } = await supabase.from('partners').select('id, profile_pic_url').in('id', needPic)
    picByPartner = Object.fromEntries((prts ?? []).filter((p: any) => p.profile_pic_url).map((p: any) => [p.id, p.profile_pic_url]))
  }

  return list.map((m: any) => ({
    name:     m.full_name,
    title:    m.trainer_title ?? '',
    location: m.trainer_location ?? '',
    photo:    m.trainer_photo_url ?? (m.partner_id ? (picByPartner[m.partner_id] ?? null) : null),
    linkedin: m.trainer_linkedin ?? null,
    research: Array.isArray(m.trainer_research_areas) ? m.trainer_research_areas : [],
    bio:      typeof m.trainer_bio === 'string' ? m.trainer_bio.split(/\n\n+/).map((s: string) => s.trim()).filter(Boolean) : [],
    credentials: Array.isArray(m.trainer_credentials) ? m.trainer_credentials : [],
  }))
}
