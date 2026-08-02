import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Header } from "./_components/app-header";

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
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.className}>
      <body className="antialiased">
        <Header />
        {children}
      </body>
    </html>
  );
}
