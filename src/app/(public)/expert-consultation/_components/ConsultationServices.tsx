import { Video, FileText, Users, Clock, Globe2, RefreshCw } from 'lucide-react'
import { formatUsd } from '@/lib/consultationUsd'
import type { ConsultationConfig } from '../page'

export function ConsultationServices({ config }: { config: ConsultationConfig }) {
  const INCLUSIONS = [
    {
      icon: Clock,
      title: 'Flexible durations',
      desc: '30 or 60-minute sessions, weekly blocks, or a multi-month engagement — scoped to your project.',
    },
    {
      icon: Users,
      title: `Up to ${config.free_attendees} attendees`,
      desc: `Bring your team at no extra cost. Beyond ${config.free_attendees}, it is ${formatUsd(
        config.group_surcharge_per_person_per_hour_usd,
      )} per additional person per hour.`,
    },
    {
      icon: Video,
      title: 'Optional recording',
      desc: 'Choose whether the session is recorded. Recordings appear in your dashboard afterwards.',
    },
    {
      icon: Globe2,
      title: 'Your timezone',
      desc: 'Slots are shown and scheduled in your local time — no mental timezone maths.',
    },
    {
      icon: FileText,
      title: 'Follow-up summary',
      desc: 'A written recap of decisions and next steps after each engagement.',
    },
    {
      icon: RefreshCw,
      title: 'Extend or renew',
      desc: 'Need more time? Add sessions to the same engagement whenever the work calls for it.',
    },
  ]

  return (
    <section className="bg-gray-50 border-y border-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-16 md:py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 mb-4">
            What&apos;s included
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
            Every engagement comes with
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {INCLUSIONS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex gap-4 rounded-2xl bg-white border border-gray-200 p-5">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Icon size={20} className="text-indigo-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
