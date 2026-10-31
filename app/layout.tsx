import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

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
      {/* Same reason as pinShell: Lightning CSS drops ::view-transition
          pseudos from globals.css before they reach the browser. */}
      <style
        href="view-transitions"
        precedence="default"
        dangerouslySetInnerHTML={{
          __html: `
::view-transition {
  pointer-events: none;
}
::view-transition-group(.morph) {
  animation-duration: 560ms;
  animation-timing-function: var(--ease-spring);
  z-index: 20;
}
::view-transition-image-pair(.morph) {
  animation-name: via-blur;
}
@keyframes via-blur {
  30% { filter: blur(3px); }
}
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(*),
  ::view-transition-new(*),
  ::view-transition-group(*) {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
  }
}`,
        }}
      />
      <body className="antialiased">{children}</body>
    </html>
  );
}
