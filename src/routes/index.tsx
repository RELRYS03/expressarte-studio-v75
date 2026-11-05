import { createFileRoute } from "@tanstack/react-router";
import CreationHub from "@/components/studio/CreationHub";
export const Route = createFileRoute("/")({
  head: () => ({meta: [{title:"Criar objetos 3D — Express’Arte Studio"},
    {name:"description", content:"Crie chaveiros, organizadores e bonecos colecionáveis com modelos guiados. Converta imagens, visualize e exporte STL/3MF."}]}),
  component: CreationHub,
});
