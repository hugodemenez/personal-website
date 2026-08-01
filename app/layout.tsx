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
  manifest: "/manifest.webmanifest",
  // Added to the Home Screen, the page runs the full height of the display:
  // no bottom toolbar, and a translucent status bar with content behind it.
  appleWebApp: {
    capable: true,
    title: "Hugo Demenez",
    statusBarStyle: "black-translucent",
  },
  other: {
    // Next emits the standardized mobile-web-app-capable; iOS before 16.4
    // only recognizes the Apple-prefixed spelling.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  // Safari tints its status bar and bottom toolbar with these instead of
  // falling back to its own opaque chrome, so the page reads edge to edge.
  themeColor: [
    { color: "#FDFBF7", media: "(prefers-color-scheme: light)" },
    { color: "#14120b", media: "(prefers-color-scheme: dark)" },
  ],
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
