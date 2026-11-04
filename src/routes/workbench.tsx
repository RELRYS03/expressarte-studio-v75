import { createFileRoute } from "@tanstack/react-router";
import StudioApp from "@/components/studio/StudioApp";

export const Route = createFileRoute("/workbench")({
  head: () => ({
    meta: [
      { title: "Editor avançado — Express’Arte Studio" },
      { name: "description", content: "Modelagem 3D por objetos, transformações e edição de malha." },
    ],
  }),
  component: () => <StudioApp page="workbench" />,
});
