export const dynamic = 'force-dynamic';
import type { Metadata, Viewport } from 'next';
import { PwaRegister } from '@/components/pwa-register';
import { DM_Sans, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { Providers } from '@/components/providers';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const jetBrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? 'http://localhost:3000'),
  title: 'MisFinanzas — Panel de Finanzas Personales',
  description: 'Gestiona tus gastos, inversiones, cripto y objetivos de ahorro.',
  applicationName: 'MisFinanzas',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/favicon.svg',
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  appleWebApp: {
    capable: true,
    title: 'MisFinanzas',
    statusBarStyle: 'black',
  },
  formatDetection: { telephone: false },
  openGraph: {
    images: ['/og-image.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#070b14',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${dmSans.variable} ${plusJakarta.variable} ${jetBrainsMono.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased min-h-screen">
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
          <PwaRegister />
        </Providers>
      </body>
    </html>
  );
}
