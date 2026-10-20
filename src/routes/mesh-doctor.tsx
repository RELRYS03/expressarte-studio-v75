import { createFileRoute } from "@tanstack/react-router";
import StudioApp from "@/components/studio/StudioApp";
export const Route = createFileRoute("/mesh-doctor")({
  head: () => ({
    meta: [
      { title: "Mesh Doctor — ExpressArte" },
      { name: "description", content: "Inspecione dimensões e conectividade de malhas STL." },
      { property: "og:title", content: "Mesh Doctor — ExpressArte" },
      {
        property: "og:description",
        content: "Inspecione dimensões e conectividade de malhas STL.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <StudioApp page="mesh" />,
});
