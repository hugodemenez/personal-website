import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Header } from "../components/app-header";
import { SafariThemeSampler } from "../components/safari-theme-sampler";

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
  // Deliberately no themeColor: declaring one makes Safari paint solid bars
  // over its chrome. Left unset, it samples the page and runs edge to edge.
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
        <SafariThemeSampler />
        <div className="min-h-screen flex flex-col pb-[calc(6rem+env(safe-area-inset-bottom))]">
          <main className="max-w-4xl mx-auto px-4 sm:px-8 py-12 container grow">
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
