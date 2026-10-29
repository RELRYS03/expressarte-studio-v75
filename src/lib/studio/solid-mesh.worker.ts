import Module from "manifold-3d";
import wasmUrl from "manifold-3d/manifold.wasm?url";
import { operateSolid, type SolidOperation } from "./solid-mesh";

self.onmessage = async (event: MessageEvent<{ positions: Float32Array; operation: SolidOperation }>) => {
  try {
    const api = await Module({ locateFile: () => wasmUrl });
    api.setup();
    const positions = operateSolid(api, event.data.positions, event.data.operation);
    self.postMessage({ positions });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : "Não foi possível processar este sólido." });
  }
};
