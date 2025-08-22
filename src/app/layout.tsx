import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/Header';
import { cn } from '@/lib/utils';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Sumo Sewa',
  description: 'Book your ride from Birgunj to Kathmandu and back.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={cn('min-h-screen bg-background font-body antialiased')}>
        <div className="relative flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">
             <Suspense fallback={<div>Loading...</div>}>
              {children}
            </Suspense>
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
