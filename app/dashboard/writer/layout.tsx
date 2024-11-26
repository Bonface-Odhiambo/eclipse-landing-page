// app/dashboard/writer/layout.tsx
import '@/app/globals.css'

export default function WriterLayout({
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