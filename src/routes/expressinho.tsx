import { createFileRoute } from "@tanstack/react-router";
import ExpressinhoHub from "@/components/studio/ExpressinhoHub";

export const Route = createFileRoute("/expressinho")({
  head: () => ({
    meta: [
      { title: "Expressinho 3D — Express’Arte Studio" },
      { name: "description", content: "Criação local com Blender e preparação de arquivos STL." },
    ],
  }),
  component: ExpressinhoHub,
});
