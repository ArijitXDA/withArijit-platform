import Link from 'next/link'
import { buttonVariants } from '@/lib/button-variants'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { CheckCircle } from 'lucide-react'

export const metadata = {
  title: 'AI Certification Program',
  description: 'Enterprise-grade AI certification for professionals. 6 specialisations covering Sales, Marketing, CXO, HR, Pharma, and Startups.',
}

const BENEFITS = [
  { title: 'Industry-Recognised Certification', desc: 'Certificate trusted by 500+ companies across India.' },
  { title: 'Live Cohort Sessions', desc: 'Learn alongside peers with live Q&A and hands-on projects.' },
  { title: 'AI Tools Mastery', desc: 'ChatGPT, Claude, Gemini, Midjourney, and 30+ AI tools.' },
  { title: 'Career Placement Support', desc: 'Resume, LinkedIn, and referrals to our hiring network.' },
  { title: 'Lifetime Access', desc: 'Course materials, recordings, and future updates forever.' },
  { title: 'GST Invoice', desc: 'Claim as a business expense with official invoice.' },
]

const SEGMENTS = [
  { slug: 'sales', title: 'AI for Sales', icon: '📈', hook: 'Close more deals with AI prospecting.' },
  { slug: 'cxo', title: 'AI for CXOs', icon: '🏢', hook: 'Lead your org\'s AI transformation.' },
  { slug: 'marketing', title: 'AI for Marketing', icon: '🎯', hook: 'Scale campaigns and content.' },
  { slug: 'hr', title: 'AI for HR', icon: '👥', hook: 'Automate hiring and performance.' },
  { slug: 'pharma', title: 'AI for Pharma', icon: '🔬', hook: 'AI in life sciences and FMCG.' },
  { slug: 'startups', title: 'AI for Startups', icon: '🚀', hook: 'Build AI products fast.' },
]

const CURRICULUM = [
  'Foundations of AI & Prompt Engineering',
  'AI Automation & Workflow Design',
  'Advanced AI Tools for Your Domain',
  'Capstone Project with Real Business Impact',
  'AI Ethics, Risk & Responsible Use',
  'Certification Exam & Badge',
]

const TESTIMONIALS = [
  { name: 'Vikram Mehta', role: 'VP Sales, HDFC Life', quote: 'The AI for Sales certification 10x\'d my team\'s outreach efficiency.' },
  { name: 'Sunita Rao', role: 'CMO, Zomato', quote: 'Best investment in professional development I\'ve made in years.' },
  { name: 'Arun Nair', role: 'CHRO, Tata Steel', quote: 'Our entire HR team is now AI-fluent thanks to this program.' },
]

export default function AICertificationPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-950 via-indigo-950 to-gray-900 text-white py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="mb-4 bg-indigo-600 text-white">India&apos;s Most Practical AI Certification</Badge>
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6">
            Get AI Certified.<br />Get Ahead.
          </h1>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            6 specialisations. 10,000+ graduates. Trusted by India&apos;s top companies.
            Join the AI revolution — start this weekend.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className={cn(buttonVariants({ size: 'lg' }), 'bg-indigo-600 hover:bg-indigo-500 text-white')}>
              Enrol Now →
            </Link>
            <Link href="/free-webinar" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'border-white/20 text-white hover:bg-white/10')}>
              Try Free First
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose withArijit Certification?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {BENEFITS.map(b => (
              <div key={b.title} className="flex gap-4 p-6 rounded-xl bg-gray-50">
                <CheckCircle className="text-indigo-600 mt-0.5 flex-shrink-0" size={20} />
                <div>
                  <p className="font-semibold mb-1">{b.title}</p>
                  <p className="text-gray-600 text-sm">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Segments */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Choose Your Specialisation</h2>
          <p className="text-gray-600 text-center mb-12">One certification. Six industry-specific tracks.</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SEGMENTS.map(s => (
              <Link key={s.slug} href={`/ai-certification/${s.slug}`} className="block group">
                <Card className="h-full hover:shadow-lg transition-shadow group-hover:border-indigo-300">
                  <CardHeader>
                    <div className="text-3xl mb-2">{s.icon}</div>
                    <CardTitle className="text-lg">{s.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 text-sm">{s.hook}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Curriculum */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">What You&apos;ll Learn</h2>
          <div className="space-y-4">
            {CURRICULUM.map((item, i) => (
              <div key={item} className="flex items-center gap-4 p-4 border rounded-xl">
                <span className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {i + 1}
                </span>
                <span className="font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">What Our Alumni Say</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                <p className="text-gray-700 mb-6 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                <p className="font-semibold">{t.name}</p>
                <p className="text-gray-500 text-sm">{t.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-indigo-600 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Get AI Certified?</h2>
          <p className="text-indigo-100 text-lg mb-8">
            Join India&apos;s most trusted AI certification program. Enrol today.
          </p>
          <Link href="/signup" className={cn(buttonVariants({ size: 'lg' }), 'bg-white text-indigo-700 hover:bg-indigo-50')}>
            Start Your Certification →
          </Link>
        </div>
      </section>
    </div>
  )
}
