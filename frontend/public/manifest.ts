import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "X Parks the Spot",
    short_name: "xpark",
    description: "Parking anywhere. Rent and find paid or free spots.",
    theme_color: "#ff9238",
    background_color: "#ff80f4",
    display: "fullscreen",
    orientation: "portrait",
    lang: "en-US",
    dir: "auto",
    icons: [
      {
        src: "icon192_maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "icon512_maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "icon192_rounded.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "icon512_rounded.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    start_url: "/",
    scope: "/",
  }
}
