// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import Module, { type ManifoldToplevel } from "manifold-3d";
import { createRequire } from "node:module";
import { BufferAttribute, BufferGeometry, Mesh, MeshStandardMaterial } from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { creationDefaults, parseCreationPrompt } from "./creation-spec";
import { guidedSolidInputs, geometryToPrintableMesh } from "./creation-geometry";
import { operateSolid } from "./solid-mesh";

let api: ManifoldToplevel;
beforeAll(async () => {
  api = await Module({ locateFile: () => createRequire(import.meta.url).resolve("manifold-3d/manifold.wasm") });
  api.setup();
});

describe("description to guided object", () => {
  it("recognizes keychain name, shape and physical dimensions", () => {
    const result = parseCreationPrompt('Chaveiro retangular, 60 x 35 x 3 mm, nome "ANA"', creationDefaults.figure);
    expect(result).toMatchObject({kind:"keychain", shape:"rectangle-keychain",width:60,length:35,height:3,name:"ANA"});
  });
  it("recognizes organizer dimensions and decimal commas", () => {
    expect(parseCreationPrompt("Organizador 180,5 x 120 x 40 mm", creationDefaults.figure)).toMatchObject({kind:"organizer",width:180.5,length:120,height:40});
  });
  it("recognizes a collectible with a cap and rejects impossible dimensions", () => {
    expect(parseCreationPrompt("Funko com boné, altura de 100 mm",creationDefaults.figure)).toMatchObject({kind:"figure",hat:true,height:100});
    expect(() => parseCreationPrompt("Organizador 900 x 10 x 1 mm",creationDefaults.figure)).toThrow();
  });
  it("does not claim unsupported organic reconstruction or different compartments", () => {
    expect(() => parseCreationPrompt("Boneco dragão com asas",creationDefaults.figure)).toThrow("personagem livre");
    expect(() => parseCreationPrompt("Organizador com 8 compartimentos",creationDefaults.organizer)).toThrow("quatro");
  });
});

describe("real generated solids and STL", () => {
  const specimens = [
    {...creationDefaults.figure,hat:false}, {...creationDefaults.figure,hat:true,height:80},
    {...creationDefaults.organizer}, {...creationDefaults.keychain,shape:"rectangle-keychain" as const,name:"ANA"},
    {...creationDefaults.keychain,shape:"hex-keychain" as const,name:"JOAO"},
    {...creationDefaults.keychain,name:"MARIA"},
  ];
  for (const spec of specimens) it(`${spec.kind} ${spec.shape} hat=${spec.hat} becomes one closed printable-scale body`, () => {
    const parts = guidedSolidInputs(spec);
    const vertices = operateSolid(api,parts[0]!,{kind:"union-many",parts:parts.length > 1 ? parts.slice(1) : [parts[0]!]});
    const geometry = new BufferGeometry().setAttribute("position",new BufferAttribute(vertices,3));
    const material = new MeshStandardMaterial();
    try {
      const mesh = geometryToPrintableMesh(geometry);
      expect(mesh.volumeMm3).toBeGreaterThan(0);
      expect(mesh.depthMm).toBeCloseTo(spec.kind === "keychain" && spec.name ? spec.height + .85 : spec.height, 3);
      const input = new api.Mesh({numProp:3,vertProperties:vertices,triVerts:Uint32Array.from({length:vertices.length/3},(_,i)=>i)});
      input.merge();
      const solid = new api.Manifold(input);
      const bodies = solid.decompose();
      try { expect(solid.status()).toBe("NoError"); expect(bodies).toHaveLength(1); }
      finally { bodies.forEach(body => body.delete()); solid.delete(); }
      const binary = new STLExporter().parse(new Mesh(geometry,material),{binary:true});
      const restored = new STLLoader().parse(binary.buffer.slice(binary.byteOffset,binary.byteOffset+binary.byteLength) as ArrayBuffer);
      try { expect(restored.getAttribute("position").count).toBe(vertices.length/3); }
      finally { restored.dispose(); }
    } finally { geometry.dispose(); material.dispose(); }
  });
});
