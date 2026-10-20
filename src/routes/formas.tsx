import { createFileRoute } from "@tanstack/react-router";
import StudioApp from "@/components/studio/StudioApp";
export const Route = createFileRoute("/formas")({
  head: () => ({
    meta: [
      { title: "Biblioteca de formas — ExpressArte" },
      {
        name: "description",
        content: "Explore formas geométricas para criar medalhas e objetos no ExpressArte.",
      },
      { property: "og:title", content: "Biblioteca de formas — ExpressArte" },
      {
        property: "og:description",
        content: "Explore formas geométricas para criar medalhas e objetos no ExpressArte.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <StudioApp page="formas" />,
});
