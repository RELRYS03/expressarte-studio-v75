import { createFileRoute } from "@tanstack/react-router";
import ImageTo3DApp from "@/components/studio/ImageTo3DApp";
export const Route = createFileRoute("/imagem-para-3d")({
  component: ImageTo3DApp,
  head: () => ({meta: [{title:"Imagem para relevo, silhueta e litofania — Express’Arte"}]}),
});
