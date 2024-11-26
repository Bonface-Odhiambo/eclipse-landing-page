// app/dashboard/editor/layout.tsx
import { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Editor Dashboard | Eclipse Writers',
  description: 'Editor dashboard for managing papers and quality control',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}