import { createFileRoute } from "@tanstack/react-router";
import QAStudio from "@/components/studio/QAStudio";

export const Route = createFileRoute("/qa-studio")({
  head: () => ({ meta: [{ title: "QA Studio — Express’Arte" }, { name: "description", content: "Validação de PRs e arquivos 3D do Express’Arte Studio." }] }),
  component: QAStudio,
});
