import { createFileRoute } from "@tanstack/react-router";
import StudioApp from "@/components/studio/StudioApp";
export const Route = createFileRoute("/comunidade")({
  head: () => ({
    meta: [
      { title: "Comunidade — ExpressArte" },
      { name: "description", content: "O espaço de criadores do ExpressArte Studio." },
      { property: "og:title", content: "Comunidade — ExpressArte" },
      { property: "og:description", content: "O espaço de criadores do ExpressArte Studio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <StudioApp page="comunidade" />,
});
