import { createFileRoute } from "@tanstack/react-router";
import ModeloIAWorkshop from "@/components/studio/ModeloIAWorkshop";

export const Route = createFileRoute("/modelo-ia")({
  head: () => ({
    meta: [
      { title: "Oficina de Modelos IA — Express’Arte Studio" },
      { name: "description", content: "Importe GLB gerado por IA, inspecione materiais e dimensões e exporte STL ou GLB." },
    ],
  }),
  component: ModeloIAWorkshop,
});
