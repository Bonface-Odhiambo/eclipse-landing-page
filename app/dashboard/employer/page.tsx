// app/dashboard/writer/page.tsx

import { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'

// Dynamic import with loading fallback
const EmployerDashboard = dynamic(
  () => import('./employerui/EmployerDashboard'),
  {
    loading: () => <div>Loading...</div>,
    ssr: true
  }
)

export const metadata: Metadata = {
  title: 'Employer Dashboard | Eclipse Writers',
  description: 'Employer dashboard for managing orders and writers',
}

export default function WriterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EmployerDashboard />
    </Suspense>
  )
}