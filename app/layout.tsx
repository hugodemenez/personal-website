import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ViewTransition } from "react";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.className}>
      <body className="antialiased bg-background text-foreground">
        <div className="min-h-screen flex flex-col">
          <main className="max-w-4xl mx-auto px-4 sm:px-8 py-12 container grow">
            <Header />
            <div className="mt-4 sm:mt-12  max-w-xl mx-auto">
              <ViewTransition>{children}</ViewTransition>
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
