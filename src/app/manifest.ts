import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Trovaa — Sua conversa, seu lugar",
    short_name: "Trovaa",
    description:
      "Converse em tempo real por estado. Chat privado, salas por região e plano VIP.",
    start_url: "/salas",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#faf8ff",
    theme_color: "#7c3aed",
    lang: "pt-BR",
    dir: "ltr",
    categories: ["social", "communication"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
