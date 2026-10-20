import { defaultConfig, materials, shapes, type ModelConfig } from "./model";

const PREFIX = "expressarte-studio-v74:";
export function readLocal<T>(key: string, fallback: T, validate: (value: unknown) => value is T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return validate(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}
export function writeLocal(key: string, data: unknown): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
export function validConfig(value: unknown): value is ModelConfig {
  if (!value || typeof value !== "object") return false;
  const c = value as Partial<ModelConfig>;
  return (
    typeof c.name === "string" && c.name.length <= 22 &&
    shapes.some((s) => s.kind === c.shape) &&
    typeof c.diameter === "number" && Number.isFinite(c.diameter) && c.diameter >= 35 && c.diameter <= 180 &&
    typeof c.thickness === "number" && Number.isFinite(c.thickness) && c.thickness >= 2 && c.thickness <= 12 &&
    typeof c.textHeight === "number" && Number.isFinite(c.textHeight) && c.textHeight >= 0.4 && c.textHeight <= Math.min(5, c.thickness * 1.5) &&
    materials.some((m) => m.id === c.material) &&
    typeof c.ring === "boolean" && typeof c.border === "boolean"
  );
}
export function coerceConfig(value: unknown): ModelConfig | null {
  if (validConfig(value)) return { ...defaultConfig, ...value };
  // Read both the original plain configuration and the v7.4 envelope.
  if (value && typeof value === "object" && "config" in value) {
    const data = (value as { config: unknown }).config;
    if (validConfig(data)) return { ...defaultConfig, ...data };
  }
  return null;
}
