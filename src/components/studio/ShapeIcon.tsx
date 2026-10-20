import type { ShapeKind } from "@/lib/studio/model";
const paths: Record<ShapeKind, string> = {
  circle: "M25 3a22 22 0 1 0 0 44a22 22 0 1 0 0-44",
  hexagon: "M25 3 44 14v22L25 47 6 36V14Z",
  shield: "M7 6h36v18c0 11-10 18-18 23C17 42 7 35 7 24Z",
  square: "M6 6h38v38H6Z",
  heart: "M25 45C18 38 3 29 3 16C3 1 19 1 25 12C31 1 47 1 47 16C47 29 32 38 25 45Z",
  star: "m25 2 7 15 16 2-12 12 3 16-14-8-14 8 3-16L2 19l16-2Z",
  oval: "M25 7a22 18 0 1 0 0 36a22 18 0 1 0 0-36",
  rectangle: "M3 10h44v30H3Z",
  triangle: "M25 3 48 44H2Z",
  pentagon: "m25 2 23 17-9 27H11L2 19Z",
  octagon: "M15 3h20l12 12v20L35 47H15L3 35V15Z",
  diamond: "M25 2 46 25 25 48 4 25Z",
  flower: "M25 10C39-5 54 13 40 25c15 14-3 29-15 15C11 55-4 37 10 25C-5 11 13-4 25 10Z",
  cross: "M17 3h16v14h14v16H33v14H17V33H3V17h14Z",
  arch: "M5 45V23a20 20 0 0 1 40 0v22Z",
};
export function ShapeIcon({ kind }: { kind: ShapeKind }) {
  return (
    <svg className="shape-icon" viewBox="0 0 50 50" aria-hidden="true">
      <path
        d={paths[kind]}
        fill="currentColor"
        fillOpacity=".22"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d={paths[kind]}
        fill="none"
        stroke="currentColor"
        strokeWidth=".6"
        transform="translate(5 5) scale(.8)"
        opacity=".6"
      />
    </svg>
  );
}
