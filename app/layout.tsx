// app/layout.tsx
import localFont from "next/font/local";
import "./globals.css";
import { getSEOTags } from "../app/lib/seo";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata = getSEOTags({
  title: "Eclipse",
  description: "Eclipse is a platform where writers and employers interact on order handling for the best experience mediated by editors and a support team",
  canonicalUrlRelative: "/",
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          {children}
      </body>
    </html>
  );
}