import { Suspense } from 'react'
import ThankYouClient from './ThankYouClient'

export const metadata = {
  title: 'Thanks — almost done',
  description: 'Your resume is saved. Last step: sign up to see your dashboard.',
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-20 text-center text-gray-500">Loading…</div>}>
      <ThankYouClient />
    </Suspense>
  )
}
