import { videosForCourse } from '@/lib/videoLibrary'

// Registry-driven course-intro video(s), shown at the top of a course page.
// Renders nothing if the course has no video yet. Supports multiple per course.
export function CourseVideos({ courseSlug }: { courseSlug: string }) {
  const vids = videosForCourse(courseSlug)
  if (!vids.length) return null
  return (
    <section className="px-4 pt-6 pb-4">
      <div className="max-w-3xl mx-auto">
        <p className="text-center text-pink-300 text-xs font-bold uppercase tracking-widest mb-3">
          ▶ Watch the 60-second intro
        </p>
        <div className={vids.length > 1 ? 'grid gap-4 sm:grid-cols-2' : ''}>
          {vids.map(v => (
            <div
              key={v.slug}
              className="w-full rounded-2xl overflow-hidden mx-auto"
              style={{ border: '1.5px solid rgba(255,45,120,0.45)', boxShadow: '0 0 40px rgba(255,45,120,0.18)' }}
            >
              {v.youtubeId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${v.youtubeId}?rel=0`}
                  title={v.title}
                  className="w-full block"
                  style={{ aspectRatio: '16 / 9', border: 0 }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
