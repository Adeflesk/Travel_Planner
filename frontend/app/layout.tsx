// app/layout.tsx
import type { Metadata } from 'next';
import type { Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { SettingsProvider } from '@/lib/settings-context';
import Navigation from '@/components/Navigation';
import { Analytics } from '@vercel/analytics/next';

const inter = Inter({ subsets: ['latin'] });
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
});

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
    <html lang="en" className="light" style={{ colorScheme: 'light' }}>
      <body className={`${inter.className} ${playfair.variable}`}>
        <AuthProvider>
          <SettingsProvider>
            <header className="bg-blue-600 text-white shadow-lg">
              <div className="container mx-auto px-4 py-4">
                <Navigation />
              </div>
            </header>
            <main className="flex min-h-full flex-col bg-white">
              <div className="grow container mx-auto px-4 py-8">
                {children}
              </div>
            </main>
          </SettingsProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
