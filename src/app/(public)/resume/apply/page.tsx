import type { Metadata } from 'next'
import ResumeApplyForm from './_components/ResumeApplyForm'

export const metadata: Metadata = {
  title: 'Share Your Résumé',
  description: 'Upload your résumé and get tailored AI course recommendations from oStaran.',
  alternates: { canonical: 'https://www.ostaran.com/resume/apply' },
}

export default function ResumeApplyPage() {
  return (
    <div className="min-h-screen" style={{ background: '#f8faff' }}>
      <div className="max-w-2xl mx-auto px-4 py-10 md:py-14">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-black mb-3" style={{ color: '#0f1f3d' }}>
            Share your résumé
          </h1>
          <p className="text-base" style={{ color: '#64748b' }}>
            Takes 2 minutes. Required fields marked with <span className="text-red-500">*</span>
          </p>
        </div>
        <ResumeApplyForm />
      </div>
    </div>
  )
}
