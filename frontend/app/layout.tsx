// app/layout.tsx
import type { Metadata } from 'next';
import type { Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Travel Planner',
  description: 'Plan your perfect adventure',
};

export const viewport: Viewport = {
   width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'cyan' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <header className="bg-blue-600 text-white shadow-lg text-center">
          <div className="container mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold">🌍 Travel Planner</h1>
            <p className="text-blue-100 mt-1">Plan your perfect adventure</p>
          </div>
        </header>
        <main className="flex min-h-full flex-col bg-white">
          <div className="flex-grow container mx-auto px-4 py-8"> 
             {children}
         </div>
        
        </main>
      </body>
    </html>
  );
}