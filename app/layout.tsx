import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Header } from "../components/app-header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://hugodemenez.fr"),
  title: {
    default: "Hugo Demenez",
    template: "%s | Hugo Demenez",
  },
  description: "Developer, trader, and entrepreneur.",
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  height: "device-height",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.className}>
      <body className="antialiased bg-background text-foreground">
        <div className="flex min-h-lvh flex-col">
          <main className="container mx-auto max-w-4xl grow px-4 pt-12 sm:px-8">
            <Header />
            <div className="mt-4 sm:mt-12  max-w-xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
