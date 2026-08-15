import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Header } from "./_components/app-header";
import { PinnedShell } from "./_components/pinned-shell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://hugodemenez.fr"),
  title: {
    default: "Hugo Demenez",
    template: "%s | Hugo Demenez",
  },
  description: "Developer, trader, and entrepreneur.",
  // iPad/iOS Safari ignores a lone /favicon.ico (especially a 256px PNG-in-ICO)
  // unless a PNG icon and apple-touch-icon are linked at stable public URLs.
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
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
      {/* Inlined rather than put in globals.css: Tailwind v4's Lightning CSS
          pass strips animation-timeline and the whole @supports block before it
          ever reaches the browser (verified — zero matches in the served CSS).
          This drives pinning on the compositor so it stays in lockstep with
          scroll, and unlike position:sticky it does not make iOS Safari reserve
          a strip at its bottom bar. PinnedShell supplies the two measurements
          and falls back to JS if this rule does not apply. */}
      <style
        href="pinned-shell"
        precedence="default"
        dangerouslySetInnerHTML={{
          __html: `
@keyframes pinShell {
  from { transform: translateY(0); }
  to { transform: translateY(var(--pin-distance, 0px)); }
}
@supports (animation-timeline: scroll()) {
  [data-pinned="timeline"] {
    animation: pinShell linear both;
    animation-timeline: scroll(root block);
    animation-range: var(--pin-start, 0px) var(--pin-end, 100%);
  }
}`,
        }}
      />
      <body className="antialiased">
        {/* -mt/pt pair extends the backdrop upward without moving the content,
            so the pinned header also covers the status-bar strip that page
            content flows into. offset matches the extension. */}
        <PinnedShell
          className="relative z-40 -mx-4 -mt-24 mb-10 px-4 pt-24 sm:mb-14"
          offset={-96}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-background"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-full h-10 bg-linear-to-b from-background to-transparent backdrop-blur-md [mask-image:linear-gradient(to_bottom,black,transparent)]"
          />
          <div className="relative">
            <Header />
          </div>
        </PinnedShell>
        {children}
      </body>
    </html>
  );
}
