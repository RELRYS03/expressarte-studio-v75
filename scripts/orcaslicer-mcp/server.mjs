import { spawn } from "node:child_process";
import { access, mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";

const DEFAULT_EXE = String.raw`C:\Program Files\OrcaSlicer\orca-slicer.exe`;
const MODEL_EXTENSIONS = new Set([".stl", ".3mf", ".obj", ".amf", ".step", ".stp"]);
const PROFILE_KINDS = ["machine", "filament", "process"];

export function isSupportedModel(filePath) {
  return MODEL_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

export function isSafeOutputName(name) {
  return (
    typeof name === "string" &&
    /^[^<>:"/\\|?*\u0000-\u001f]+\.3mf$/i.test(name) &&
    name !== "." &&
    name !== ".."
  );
}

export function buildSliceArgs(inputFile, outputDir, outputName, plate = 0) {
  return [
    "--slice",
    String(plate),
    "--export-3mf",
    outputName,
    "--outputdir",
    outputDir,
    inputFile
  ];
}

function getExecutable() {
  return process.env.ORCASLICER_EXE || DEFAULT_EXE;
}

async function assertExecutable() {
  const executable = getExecutable();
  await access(executable);
  return executable;
}

function runProcess(executable, args, timeoutMs = 10 * 60 * 1000) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      if (stdout.length > 200_000) stdout = stdout.slice(-200_000);
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      if (stderr.length > 200_000) stderr = stderr.slice(-200_000);
    });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);

    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      if (timedOut) {
        reject(new Error("OrcaSlicer excedeu o tempo limite de execução."));
        return;
      }
      if (code !== 0) {
        reject(
          new Error(
            `OrcaSlicer encerrou com código ${code}. ${stderr || stdout || "Sem detalhes no log."}`
          )
        );
        return;
      }
      resolve({ code, stdout, stderr });
    });
  });
}

async function listJsonFiles(directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
      .map((entry) => entry.name.replace(/\.json$/i, ""))
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

export async function collectProfiles(appData = process.env.APPDATA) {
  if (!appData) return { machine: [], filament: [], process: [] };

  const root = path.join(appData, "OrcaSlicer");
  const profileDirs = {
    machine: [path.join(root, "system", "BBL", "machine")],
    filament: [path.join(root, "system", "BBL", "filament")],
    process: [path.join(root, "system", "BBL", "process")]
  };

  const userRoot = path.join(root, "user");
  try {
    const users = await readdir(userRoot, { withFileTypes: true });
    for (const user of users.filter((entry) => entry.isDirectory())) {
      for (const kind of PROFILE_KINDS) {
        profileDirs[kind].push(path.join(userRoot, user.name, kind));
      }
    }
  } catch {
    // The system profiles can still be listed when no user profile folder exists.
  }

  const result = {};
  for (const kind of PROFILE_KINDS) {
    const groups = await Promise.all(profileDirs[kind].map(listJsonFiles));
    result[kind] = [...new Set(groups.flat())].sort((a, b) => a.localeCompare(b));
  }
  return result;
}

function textResult(text) {
  return { content: [{ type: "text", text }] };
}

const server = new McpServer(
  { name: "expressarte-orcaslicer", version: "0.1.0" },
  {
    instructions:
      "Controla o OrcaSlicer localmente. Antes de fatiar, confirme no OrcaSlicer que a impressora ativa é Bambu Lab A1 e que o bico e filamento correspondem ao trabalho. Este servidor não envia trabalhos para a impressora e não inicia impressões."
  }
);

server.registerTool(
  "orcaslicer_status",
  {
    description: "Verifica o executável local e as opções de linha de comando do OrcaSlicer.",
    inputSchema: z.object({})
  },
  async () => {
    try {
      const executable = await assertExecutable();
      const { stdout, stderr } = await runProcess(executable, ["--help"], 20_000);
      const help = `${stdout}\n${stderr}`;
      const supported = ["--slice", "--export-3mf", "--export-stl", "--outputdir"]
        .filter((flag) => help.includes(flag));
      return textResult(
        [
          "OrcaSlicer encontrado.",
          `Executável: ${executable}`,
          `Opções detectadas: ${supported.join(", ") || "não identificadas"}`,
          "Nenhuma impressão foi enviada."
        ].join("\n")
      );
    } catch (error) {
      return textResult(`Falha ao verificar OrcaSlicer: ${error.message}`);
    }
  }
);

server.registerTool(
  "orcaslicer_list_profiles",
  {
    description: "Lista os nomes dos perfis locais de máquina, filamento e processo.",
    inputSchema: z.object({})
  },
  async () => {
    const profiles = await collectProfiles();
    const lines = ["Perfis locais do OrcaSlicer:"];
    for (const kind of PROFILE_KINDS) {
      lines.push(`\n${kind.toUpperCase()} (${profiles[kind].length}):`);
      lines.push(...(profiles[kind].slice(0, 100).map((name) => `- ${name}`)));
      if (profiles[kind].length > 100) lines.push("- ... lista limitada a 100 nomes");
    }
    return textResult(lines.join("\n"));
  }
);

server.registerTool(
  "orcaslicer_open_model",
  {
    description: "Abre um arquivo 3D no OrcaSlicer para conferência visual. Não inicia impressão.",
    inputSchema: z.object({
      inputFile: z.string().min(1).describe("Caminho absoluto do arquivo STL, 3MF, OBJ, AMF ou STEP.")
    })
  },
  async ({ inputFile }) => {
    try {
      const file = path.resolve(inputFile);
      if (!isSupportedModel(file)) throw new Error("Formato não permitido.");
      await access(file);
      const executable = await assertExecutable();
      const child = spawn(executable, [file], {
        detached: true,
        shell: false,
        stdio: "ignore",
        windowsHide: false
      });
      await new Promise((resolve, reject) => {
        child.once("spawn", resolve);
        child.once("error", reject);
      });
      child.unref();
      return textResult(`Arquivo aberto no OrcaSlicer: ${file}`);
    } catch (error) {
      return textResult(`Não foi possível abrir o modelo: ${error.message}`);
    }
  }
);

server.registerTool(
  "orcaslicer_slice_export_3mf",
  {
    description:
      "Fatia um modelo local usando a configuração atualmente salva no OrcaSlicer e exporta um 3MF para revisão. Não envia o arquivo à impressora.",
    inputSchema: z.object({
      inputFile: z.string().min(1).describe("Caminho absoluto do modelo STL, 3MF, OBJ, AMF ou STEP."),
      outputDir: z.string().min(1).describe("Pasta de saída local."),
      outputName: z.string().regex(/^[^<>:"/\\|?*\u0000-\u001f]+\.3mf$/i).describe("Nome simples do arquivo final, terminando em .3mf."),
      plate: z.number().int().min(0).max(99).default(0).describe("Índice da mesa; 0 representa todas as mesas.")
    })
  },
  async ({ inputFile, outputDir, outputName, plate }) => {
    try {
      const input = path.resolve(inputFile);
      const output = path.resolve(outputDir);
      if (!isSupportedModel(input)) throw new Error("Formato de modelo não permitido.");
      if (!isSafeOutputName(outputName)) throw new Error("Nome de saída inválido. Informe apenas um nome de arquivo .3mf.");
      await access(input);
      const executable = await assertExecutable();
      await mkdir(output, { recursive: true });

      const args = buildSliceArgs(input, output, outputName, plate);
      const { stdout, stderr } = await runProcess(executable, args);
      const outputFile = path.join(output, outputName);
      const outputStats = await stat(outputFile).catch(() => null);
      if (!outputStats?.isFile() || outputStats.size === 0) {
        throw new Error(
          `O processo terminou, mas o 3MF esperado não foi encontrado em ${outputFile}. ${stderr || stdout}`
        );
      }

      return textResult(
        [
          "Fatiamento concluído e arquivo 3MF exportado.",
          `Entrada: ${input}`,
          `Saída: ${outputFile}`,
          `Tamanho: ${outputStats.size} bytes`,
          "Confira o 3MF no OrcaSlicer antes de qualquer impressão.",
          "O servidor não enviou o trabalho à impressora."
        ].join("\n")
      );
    } catch (error) {
      return textResult(`Falha no fatiamento/exportação: ${error.message}`);
    }
  }
);

console.error("Express'Arte OrcaSlicer MCP iniciado (stdio).");
await serveStdio(() => server);
