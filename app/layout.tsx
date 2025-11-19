import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ViewTransition } from 'react';
import { Header } from '../components/Header';
import { ThemeProvider } from '../components/theme-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'Hugo Demenez',
    template: '%s | Hugo Demenez',
  },
  description: 'Developer, trader, and entrepreneur.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="min-h-screen flex flex-col">
            <main className="max-w-4xl mx-auto px-4 sm:px-8 py-12 container flex-grow">
              <Header />
              <div className="mt-4 sm:mt-12">
                <ViewTransition>
                  {children}
                </ViewTransition>
              </div>
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
