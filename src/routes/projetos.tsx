import { createFileRoute } from "@tanstack/react-router";
import StudioApp from "@/components/studio/StudioApp";
export const Route = createFileRoute("/projetos")({
  head: () => ({
    meta: [
      { title: "Meus projetos — ExpressArte" },
      {
        name: "description",
        content: "Importe e organize suas criações ExpressArte nesta sessão.",
      },
      { property: "og:title", content: "Meus projetos — ExpressArte" },
      {
        property: "og:description",
        content: "Importe e organize suas criações ExpressArte nesta sessão.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <StudioApp page="projetos" />,
});
