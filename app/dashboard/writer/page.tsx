// app/dashboard/writer/page.tsx

import { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'

// Dynamic import with loading fallback
const WriterDashboard = dynamic(
  () => import('./writerui/WriterDashboard'),
  {
    loading: () => <div>Loading...</div>,
    ssr: true
  }
)

export const metadata: Metadata = {
  title: 'Writer Dashboard | Eclipse Writers',
  description: 'Writer dashboard for managing orders and earnings',
}

export default function WriterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <WriterDashboard />
    </Suspense>
  )
}