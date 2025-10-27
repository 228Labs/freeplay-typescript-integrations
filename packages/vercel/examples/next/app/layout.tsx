import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Freeplay Vercel AI SDK Example',
  description: 'Example application using Freeplay with Vercel AI SDK',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

