import type { Metadata } from 'next';
import { Bricolage_Grotesque, Inter } from 'next/font/google';
import '@/styles/globals.css';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Team 1 | NYC Taxi Mobility Analytics',
  description: 'Explore urban mobility patterns in New York City through taxi trip data analysis',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" defer></script>
      </head>
      <body className={`${bricolage.variable} ${inter.variable} min-h-screen bg-background text-foreground`}>
        {children}
      </body>
    </html>
  );
}
