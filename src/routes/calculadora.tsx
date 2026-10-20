import { createFileRoute } from "@tanstack/react-router";
import StudioApp from "@/components/studio/StudioApp";
export const Route = createFileRoute("/calculadora")({
  head: () => ({
    meta: [
      { title: "Calculadora de impressão — ExpressArte" },
      { name: "description", content: "Calcule custos de filamento e energia para impressão 3D." },
      { property: "og:title", content: "Calculadora de impressão — ExpressArte" },
      {
        property: "og:description",
        content: "Calcule custos de filamento e energia para impressão 3D.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <StudioApp page="calculadora" />,
});
