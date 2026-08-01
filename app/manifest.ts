import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hugo Demenez",
    short_name: "Hugo",
    description: "Developer, trader, and entrepreneur.",
    start_url: "/",
    display: "standalone",
    background_color: "#FDFBF7",
    theme_color: "#FDFBF7",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
