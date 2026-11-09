import { createFileRoute } from "@tanstack/react-router";
import StudioApp from "@/components/studio/StudioApp";

export const Route = createFileRoute("/canvas")({
  head: () => ({
    meta: [
      { title: "Express’Arte Canvas — Fluxos 3D" },
      {
        name: "description",
        content: "Organize ferramentas de criação 3D em fluxos visuais reutilizáveis.",
      },
    ],
  }),
  component: () => <StudioApp page="canvas" />,
});
