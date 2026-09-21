import type { Metadata } from 'next'

// The embed widget is meant to live inside partner websites, not to be indexed on its own.
export const metadata: Metadata = {
  title: 'Live AI, Robotics & Coding Courses',
  robots: { index: false, follow: false },
}

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
