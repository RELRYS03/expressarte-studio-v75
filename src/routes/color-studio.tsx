import { createFileRoute } from "@tanstack/react-router";
import ColorStudio from "@/components/studio/ColorStudio";
export const Route = createFileRoute("/color-studio")({
  head: () => ({ meta: [{ title: "Color Studio — Express’Arte" }] }),
  component: ColorStudio,
});
