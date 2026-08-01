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
        <main className="container mx-auto min-h-lvh max-w-4xl overflow-visible px-4 pt-12 sm:px-8">
          <Header />
          <div className="mx-auto mt-4 max-w-xl overflow-visible sm:mt-12">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
