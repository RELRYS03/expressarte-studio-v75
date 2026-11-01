import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSliceArgs,
  isSafeOutputName,
  isSupportedModel
} from "./server.mjs";

test("aceita formatos 3D suportados sem diferenciar maiúsculas", () => {
  for (const file of ["modelo.stl", "modelo.3MF", "modelo.obj", "modelo.amf", "modelo.step", "modelo.stp"]) {
    assert.equal(isSupportedModel(file), true, file);
  }
});

test("rejeita formatos que não são modelos 3D", () => {
  for (const file of ["arquivo.gcode", "documento.pdf", "imagem.png", "modelo"]) {
    assert.equal(isSupportedModel(file), false, file);
  }
});

test("aceita somente nome simples de saída 3MF", () => {
  assert.equal(isSafeOutputName("chaveiro-a1.3mf"), true);
  assert.equal(isSafeOutputName("resultado final.3MF"), true);
  assert.equal(isSafeOutputName("../fora.3mf"), false);
  assert.equal(isSafeOutputName("C:\\temp\\fora.3mf"), false);
  assert.equal(isSafeOutputName("arquivo.gcode"), false);
});

test("monta argumentos sem shell e preserva caminhos com espaços", () => {
  assert.deepEqual(
    buildSliceArgs("C:\\Modelos 3D\\chaveiro.stl", "C:\\Saida Orca", "chaveiro-fatiado.3mf", 0),
    [
      "--slice",
      "0",
      "--export-3mf",
      "chaveiro-fatiado.3mf",
      "--outputdir",
      "C:\\Saida Orca",
      "C:\\Modelos 3D\\chaveiro.stl"
    ]
  );
});
