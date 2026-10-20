import { createFileRoute } from "@tanstack/react-router";
import StudioApp from "@/components/studio/StudioApp";
export const Route = createFileRoute("/catalogo")({
  head: () => ({ meta: [{ title: "Catálogo — Express'Arte" }, { name: "description", content: "Cadastre personalizados e prepare pedidos para WhatsApp." }] }),
  component: () => <StudioApp page="catalogo" />,
});
