import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
const GlbInspector = lazy(() => import("@/components/studio/GlbInspector"));
export const Route = createFileRoute("/inspecionar-glb")({
  head: () => ({ meta: [{ title: "Inspetor GLB | Express'Arte" }] }),
  component: () => <Suspense fallback={<p>Carregando visualizador 3D...</p>}><GlbInspector /></Suspense>,
});
