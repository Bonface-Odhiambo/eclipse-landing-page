// app/dashboard/employer/layout.tsx
import '@/app/globals.css'

export default function EmployerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      {children}
    </div>
  )
}