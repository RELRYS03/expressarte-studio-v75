import { createFileRoute } from "@tanstack/react-router";
import StudioApp from "@/components/studio/StudioApp";
export const Route = createFileRoute("/studio")({
  head: () => ({meta: [{title:"Editor de formas — Express’Arte Studio"}, {name:"description",content:"Editor 3D de formas e medalhas Express’Arte."}]}),
  component: () => <StudioApp page="studio" />,
});
