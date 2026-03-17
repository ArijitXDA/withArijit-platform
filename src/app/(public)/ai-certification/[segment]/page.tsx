import { notFound } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@/lib/button-variants'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { CheckCircle } from 'lucide-react'
import type { Metadata } from 'next'

const SEGMENTS: Record<string, {
  title: string
  headline: string
  hook: string
  bullets: string[]
  audience: string
}> = {
  sales: {
    title: 'AI for Sales Professionals',
    headline: 'Close More Deals with AI',
    hook: 'Automate prospecting, personalise outreach at scale, and forecast pipeline with AI.',
    bullets: [
      'Build AI-powered prospecting workflows',
      'Personalise emails and proposals at scale',
      'Use AI for objection handling and coaching',
      'Forecast pipeline and churn with AI models',
      'Automate CRM data entry and follow-ups',
    ],
    audience: 'Sales Managers, BDMs, AEs, VP Sales',
  },
  cxo: {
    title: 'AI for CXOs & Leaders',
    headline: 'Lead AI Transformation',
    hook: 'Build AI strategy, evaluate vendors, and lead org-wide AI adoption.',
    bullets: [
      'Build a company-wide AI strategy',
      'Evaluate AI vendors and build vs buy decisions',
      'Lead change management for AI adoption',
      'AI governance and risk frameworks',
      'ROI measurement and AI KPIs',
    ],
    audience: 'CEO, CTO, COO, CDO, VP/Director level leaders',
  },
  marketing: {
    title: 'AI for Marketers',
    headline: 'Scale Content & Campaigns with AI',
    hook: 'Generate campaigns, analyse performance, and personalise at scale.',
    bullets: [
      'AI content creation for blogs, ads, social',
      'Automated campaign personalisation',
      'AI-powered SEO and keyword research',
      'Sentiment analysis and brand monitoring',
      'Predictive analytics for campaign optimisation',
    ],
    audience: 'CMOs, Brand Managers, Performance Marketers, Content Leads',
  },
  hr: {
    title: 'AI for HR & Project Managers',
    headline: 'Transform HR with AI',
    hook: 'Automate screening, build AI HR agents, and run AI-powered projects.',
    bullets: [
      'AI resume screening and candidate ranking',
      'Automate onboarding workflows',
      'Build AI HR chatbots and helpdesks',
      'Performance analytics and prediction',
      'AI-powered project planning and tracking',
    ],
    audience: 'CHROs, HR Managers, Talent Acquisition, Project Managers',
  },
  pharma: {
    title: 'AI for Pharma & FMCG',
    headline: 'AI in Life Sciences & Consumer Goods',
    hook: 'Regulatory compliance, demand forecasting, and supply chain AI.',
    bullets: [
      'AI for drug discovery and R&D acceleration',
      'Regulatory document automation',
      'Demand forecasting and inventory optimisation',
      'AI in clinical trial design',
      'Supply chain risk management with AI',
    ],
    audience: 'Pharma Managers, Supply Chain Leads, R&D Heads, FMCG Brand Teams',
  },
  startups: {
    title: 'AI for Startups & Entrepreneurs',
    headline: 'Build AI Products Fast',
    hook: 'Vibe code your MVP, automate ops, and build AI-native businesses.',
    bullets: [
      'Build AI-powered MVPs with no-code/low-code',
      'Automate startup ops with AI agents',
      'AI product strategy and roadmapping',
      'Fundraising pitch with AI positioning',
      'AI-first GTM and growth hacking',
    ],
    audience: 'Founders, CTOs, Product Managers, Early-stage startup teams',
  },
}

export function generateStaticParams() {
  return Object.keys(SEGMENTS).map(segment => ({ segment }))
}

export async function generateMetadata({ params }: { params: Promise<{ segment: string }> }): Promise<Metadata> {
  const { segment } = await params
  const seg = SEGMENTS[segment]
  if (!seg) return {}
  return {
    title: seg.title,
    description: seg.hook,
  }
}

export default async function SegmentPage({ params }: { params: Promise<{ segment: string }> }) {
  const { segment } = await params
  const seg = SEGMENTS[segment]
  if (!seg) notFound()

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-950 via-indigo-950 to-gray-900 text-white py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <Badge className="mb-4 bg-indigo-600 text-white">AI Certification — {seg.title}</Badge>
          <h1 className="text-5xl font-extrabold mb-4">{seg.headline}</h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl">{seg.hook}</p>
          <p className="text-indigo-300 text-sm mb-8">Best for: {seg.audience}</p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/signup" className={cn(buttonVariants({ size: 'lg' }), 'bg-indigo-600 hover:bg-indigo-500 text-white')}>
              Enrol Now →
            </Link>
            <Link href="/ai-certification" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'border-white/20 text-white hover:bg-white/10')}>
              View All Tracks
            </Link>
          </div>
        </div>
      </section>

      {/* What you'll learn */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-10">What You&apos;ll Learn</h2>
          <div className="space-y-4">
            {seg.bullets.map(bullet => (
              <div key={bullet} className="flex items-start gap-3">
                <CheckCircle className="text-indigo-600 mt-0.5 flex-shrink-0" size={20} />
                <span className="text-gray-700">{bullet}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-indigo-600 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Master {seg.headline.split(' ').slice(-2).join(' ')}?</h2>
          <Link href="/signup" className={cn(buttonVariants({ size: 'lg' }), 'bg-white text-indigo-700 hover:bg-indigo-50')}>
            Start Your Certification →
          </Link>
        </div>
      </section>
    </div>
  )
}
