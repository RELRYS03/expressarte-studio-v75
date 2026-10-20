import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import { defaultConfig, type ModelConfig } from "@/lib/studio/model";
import { readLocal, validConfig, writeLocal } from "@/lib/studio/persistence";
export type Project = { id: number; config: ModelConfig };
function validProjects(value: unknown): value is Project[] {
  return Array.isArray(value) && value.length <= 1000 && value.every((p) =>
    p && typeof p.id === "number" && Number.isFinite(p.id) && validConfig(p.config),
  );
}
const StudioContext = createContext<{
  config: ModelConfig;
  setConfig: Dispatch<SetStateAction<ModelConfig>>;
  projects: Project[];
  setProjects: Dispatch<SetStateAction<Project[]>>;
  storageReady: boolean;
} | null>(null);
export function StudioProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ModelConfig>(defaultConfig);
  const [projects, setProjects] = useState<Project[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  useEffect(() => {
    setConfig(readLocal("current", defaultConfig, validConfig));
    setProjects(readLocal("projects", [], validProjects));
    setStorageReady(true);
  }, []);
  useEffect(() => {
    if (storageReady) writeLocal("current", config);
  }, [config, storageReady]);
  useEffect(() => {
    if (storageReady) writeLocal("projects", projects);
  }, [projects, storageReady]);
  return (
    <StudioContext.Provider value={{ config, setConfig, projects, setProjects, storageReady }}>
      {children}
    </StudioContext.Provider>
  );
}
export function useStudio() {
  const context = useContext(StudioContext);
  if (!context) throw new Error("StudioProvider is required");
  return context;
}
