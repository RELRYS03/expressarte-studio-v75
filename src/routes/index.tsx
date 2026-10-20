import { createFileRoute } from "@tanstack/react-router";
import ImageTo3DApp from "@/components/studio/ImageTo3DApp";
export const Route = createFileRoute("/")({
  head: () => ({meta: [{title:"Imagem para 3D imprimível — Express’Arte Studio"},
    {name:"description", content:"Transforme imagens PNG, JPG, WebP e SVG em relevo, silhueta ou litofania, visualizando e exportando STL/3MF em milímetros."}]}),
  component: ImageTo3DApp,
});
