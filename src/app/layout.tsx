import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Outfit } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { SocketProvider } from '../providers/socket-provider';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
});

const outfit = Outfit({
  variable: '--font-heading',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AEGIS AI — Disaster Intelligence & Rescue Coordination Platform',
  description:
    'AEGIS AI combines realtime environmental monitoring, AI-powered verification, predictive risk analysis, and rescue coordination into one intelligent disaster response platform.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${inter.variable} ${jetbrainsMono.variable} ${outfit.variable} h-full dark antialiased`}
      >
        <body className="min-h-full bg-[#051F20] text-[#D6EFE2] font-sans selection:bg-[#235347] selection:text-[#D6EFE2]">
          <SocketProvider>{children}</SocketProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
