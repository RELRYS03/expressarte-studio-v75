# Plano mestre de integração — Express'Arte Studio 3D

**Branch:** feat/expressarte-engine-registry-mvp  
**Base:** integration/studio-v7.5-candidate  
**Hardware homologado para planejamento:** Windows, AMD Radeon RX 580 2048SP 4 GB, Intel i5-3570, 16 GB RAM, Blender 5.2.2, Python 3.11.9, ONNX Runtime DirectML 1.24.4.  
**Regra:** não clonar coleções de repositórios; estudar algoritmos e reimplementar módulos próprios. Não confundir licença de código com licença de pesos.

## Decisão de execução

- Backend local: ONNX Runtime + DirectML. Não instalar CUDA nesta RX 580.
- Blender: processo externo oficial via CLI, com scripts bpy isolados.
- Python IA: 3.11 em C:\ExpressArte-AI\venv.
- Python Blender: 3.13.13, gerenciado pelo Blender; não instalar pacotes nele.
- Geração neural 3D pesada: worker remoto CUDA. Localmente, usar o criador paramétrico já existente e processamento ONNX compatível.
- Não baixar pesos nem consumir créditos sem autorização explícita.
- Estados de licença: CLEAR = licença de código e pesos verificadas; CONDITIONAL = condições comerciais; BLOCKED = pesos não liberados ou licença não verificada.

## Tabela mestre

| # | Área / funcionalidade | Principal / alternativa | Algoritmo a reproduzir | Licença de código / pesos e uso comercial | Integração e stack | Fase / aceite |
|---|---|---|---|---|---|---|
| 1 | GPU, VRAM, driver e Python | Windows CIM + ONNX Runtime / nvidia-smi | Identificar adaptadores, VRAM, driver e provedor de execução | Ferramentas do sistema; sem pesos | PowerShell + Python 3.11 | F1: RX 580/DirectML detectados, Python e Blender separados |
| 2 | Texto → 3D | Shap-E / gerador paramétrico Express'Arte | Difusão condicionada por texto gera funções implícitas 3D, depois extraídas como malha | Shap-E código MIT e model card do checkpoint MIT; comercial permitido com avisos; gerador paramétrico é próprio | Worker isolado + API local + painel; CPU/servidor, não prometer inferência rápida em 4 GB | F1: prompt gera GLB editável; MVP local usa vocabulário paramétrico já existente |
| 3 | Imagem única → 3D | Stable Fast 3D / InstantMesh | Reconstrução feed-forward por transformer, extração de superfície, UV e geração de textura/material; InstantMesh combina vistas esparsas geradas por difusão com LRM e permite exportar mapa UV | SF3D código/pesos sob Stability AI Community License: comercial permitido até US$1M/ano com registro; acima disso exige Enterprise. InstantMesh código/model card Apache-2.0; verificar licenças dos componentes/base-models | Worker remoto CUDA + API local + painel de upload; importar GLB texturizado no Blender | F1: uma foto gera GLB UV-texturizado; remoto porque ambos excedem o alvo de 4 GB/DirectML; InstantMesh usa CUDA/xformers no upstream |
| 4 | Multi-view → 3D | COLMAP / Meshroom (AliceVision) | Structure-from-Motion estima câmeras e poses; Multi-View Stereo reconstrói nuvem densa, malha e textura | COLMAP BSD-3-Clause, sem pesos; Meshroom/AliceVision MPL-2.0, sem pesos; comercial permitido respeitando notices e obrigações MPL | CLI externo/worker CPU; importar OBJ/PLY/mesh texturizada na oficina Blender | F3: 4+ fotos com sobreposição produzem reconstrução alinhada e texturizada; processamento local pode ser lento no i5 |
| 5 | Remoção de fundo / matting | BiRefNet / rembg | Segmentação de primeiro plano com refinamento de bordas e máscara alfa | BiRefNet código MIT e checkpoint HF marcado MIT; comercial permitido com avisos. rembg código MIT; cada peso é independente; não usar BRIA RMBG-2.0 comercial sem contrato | Exportar/usar ONNX e executar DmlExecutionProvider; API local + painel | F1: PNG RGBA com alfa limpo; validar DirectML e checkpoint |
| 6 | Upscale de imagem/textura | SwinIR / Real-ESRGAN | Transformer com residual Swin blocks reconstrói detalhes e reduz ruído; Real-ESRGAN usa GAN para super-resolução perceptual | SwinIR código Apache-2.0; usar somente checkpoint com model card Apache-2.0 (ex.: deepinv/swinir) e guardar sua licença. Real-ESRGAN código BSD-3-Clause; licença de pesos varia por checkpoint e deve ser comprovada | ONNX DirectML em tiles ou CPU; botão no editor de textura | F2: 1K→4K, PSNR/SSIM e inspeção visual; sem artefato grave |
| 7 | Modelagem paramétrica e edição mesh | Blender bpy/Geometry Nodes / Manifold | Modificadores, grafos de nós, operações booleanas e geometria procedural | Blender GPL; não incorporar código Blender no Studio. Manifold MIT | Blender CLI externo + scripts bpy compatíveis com GPL; Manifold WASM já existente | F1: editar, extrudar, boolean e undo |
| 8 | Escultura, remesh e voxel | Blender Voxel Remesh / OpenVDB | Converter superfície em volume voxel e reconstruir superfície | Blender GPL; OpenVDB MPL-2.0; sem pesos | CLI bpy, Sculpt Mode e Geometry Nodes | F2: remesh preserva volume e detalhe dentro de tolerância |
| 9 | Retopologia automática | Instant Meshes / QuadriFlow | Campo direcional de orientação e geração de quads alinhados à curvatura | Instant Meshes BSD-3-Clause; QuadriFlow integrado ao Blender/GPL; sem pesos | Executável/CLI externo ou operador Blender | F2: quad mesh com contagem alvo e fluxo visual limpo |
| 10 | UV automático | xatlas / Blender Smart UV | Parametrização de superfície, corte em ilhas e empacotamento de atlas | xatlas MIT; Blender GPL; sem pesos | Biblioteca xatlas isolada ou CLI bpy | F2: UV sem sobreposição involuntária |
| 11 | PBR de foto/texto | Material Anything / materiais procedurais próprios | Estimar albedo, roughness, metallic e bump em múltiplas vistas e refinar no UV | Material Anything código MIT; licenças dos checkpoints estimator/refiner ainda não comprovadas; BLOCKED comercial até confirmar. Alternativa procedural própria sem pesos | Worker remoto; importar mapas PBR no Blender via bpy | F2: albedo/roughness/metallic/normal aplicados e renderizados |
| 12 | Pintura/projeção por IA | Blender Texture Paint + projeção própria / Paint3D | Projetar inpainting em múltiplas vistas e reconciliar seams em UV | Blender GPL via processo externo; Paint3D código/pesos a verificar, não comercial até liberação | API local/remota + Blender UV/Texture Paint | F3: textura sem costuras visíveis em turntable |
| 13 | Auto-rigging | UniRig / Mixamo | Predição autoregressiva de esqueleto e skinning weights a partir da geometria do personagem | UniRig código MIT e checkpoint VAST-AI/UniRig marcado MIT; confirmar dataset Articulation-XL2.0 e versão exata. Mixamo proprietário/cloud, sujeito aos termos Adobe | Worker remoto CUDA + importação de armature/weights por bpy | F2: rig com pose de teste sem colapso de pesos |
| 14 | Pose/retarget/animação | Blender Rigify/NLA / BVH retarget próprio | IK/FK, hierarquia óssea, mapeamento de joints e interpolação temporal | Rigify/Blender GPL via Blender externo; BVH é formato, direitos do movimento/dataset separados | CLI bpy + biblioteca de poses | F3: animação toca na viewport e exporta |
| 15 | Reparo de malha | trimesh / MeshLab | Detectar buracos, bordas abertas, non-manifold, componentes e normais; reparar só operações seguras | trimesh MIT; MeshLab GPL; sem pesos | Python local + Blender CLI; MeshLab somente processo separado | F1: relatório topológico e zero defeitos-alvo após reparo verificável |
| 16 | Decimation/LOD | meshoptimizer / Blender Decimate | Simplificação por colapso de arestas com erro geométrico e preservação de atributos | meshoptimizer MIT; Blender GPL; sem pesos | Biblioteca/CLI ou bpy | F2: reduzir 70% dos triângulos com erro de silhueta medido |
| 17 | Slicing, orientação e suportes | OrcaSlicer / PrusaSlicer | Fatiamento em camadas, perímetros, infill, suportes tree e geração de G-code | Ambos AGPL-3.0; não copiar nem linkar código. Chamar executável externo e cumprir avisos/obrigações se redistribuir | CLI do slicer instalado separadamente; integração por subprocess e leitura de saída | F2: gerar 3MF/G-code sem erro no perfil Bambu A1 |
| 18 | Validação de imprimibilidade | trimesh / Blender 3D Print Toolbox | Medir manifold, volume, normais, espessura estimada e overhang | trimesh MIT; Toolbox GPL-3.0-or-later | Python local + painel; Blender CLI para inspeções adicionais | F2: relatório com coordenadas e correções sugeridas |
| 19 | Exportação multiformato | Blender exporters / Assimp | Converter malha, UV, materiais, transformações e eixos entre GLB/OBJ/FBX/STL | Blender GPL via executável externo; Assimp BSD-3-Clause | Menu Studio chama API local, que invoca Blender CLI; 3MF pelo slicer | F1: arquivos reabrem em Blender, navegador e slicer |
| 20 | Fila, VRAM, cache e logs | Gerenciador próprio / Celery | Fila persistente, limite de concorrência, cache por hash, unload de modelos, retry e logs estruturados | Próprio; Celery BSD-3-Clause; sem pesos | Python 3.11 + SQLite + subprocess; sem Redis no MVP | F1: 2 jobs sequenciais, sem vazamento e com status rastreável |

## Fases de execução

### F1 — MVP visível
1. Engine Registry e status local (esta branch).
2. Ponte Blender existente em 127.0.0.1:8766.
3. Criador paramétrico por texto (já existe na candidata).
4. Importar GLB, editar no Workbench e exportar GLB/STL.
5. BiRefNet ONNX: converter/obter checkpoint autorizado, validar DML e produzir PNG alfa.
6. Image-to-3D: adaptador worker remoto; sem consumo de crédito e sem alegar geração enquanto não houver servidor/pesos configurados.

Aceite: criar chaveiro/organizador por texto, remover fundo de imagem, importar GLB real no Blender e exportar STL.

### F2 — Edição e fabricação
Remesh, retopo, UV, PBR licenciado, decimation, reparo, relatório de espessura/overhang, OrcaSlicer CLI e validação no Bambu Studio.

Aceite: objeto editado, fechado, escala em mm, 3MF/G-code fatiado sem erro.

### F3 — Avançado
Multi-view, pintura por difusão, rigging, retarget, TRELLIS.2/Hunyuan3D em GPU remota de alta memória.

Aceite: personagem multi-view texturizado, rig funcional e asset de fabricação validado.

## Setup Windows idempotente

O script scripts/expressarte_setup_windows.ps1:
- usa py -3.11, nunca o alias python da Store;
- preserva C:\ExpressArte-AI\venv;
- só instala ONNX Runtime DirectML se o pacote estiver ausente;
- não reinstala pacote já disponível;
- não instala CUDA nem PyTorch nesta AMD;
- define EXPRESSARTE_AI_PYTHON e EXPRESSARTE_BLENDER_EXE;
- pode iniciar a ponte existente com -StartBridge;
- não baixa pesos de IA.

## Ponte existente

O repositório já possui scripts/blender_bridge.py, servidor HTTP restrito a 127.0.0.1:8766, com operações de malha, chaveiro e rota TripoSR opcional. Esta branch acrescenta somente rotas de leitura /v1/engine/status e /v1/engines; não executa geração nem baixa pesos.

## Licenciamento — bloqueios comerciais

- Nunca inferir licença de pesos a partir da licença do código.
- BiRefNet: usar checkpoint com licença MIT explícita; evitar variantes sem licença declarada.
- rembg: o código é MIT, mas cada modelo tem licença própria; BRIA RMBG-2.0 exige acordo pago para uso comercial.
- Material Anything: código MIT; pesos estimator/refiner precisam de confirmação independente.
- UniRig: código MIT; checkpoint exato precisa de confirmação.
- Real-ESRGAN: código BSD-3-Clause; conservar bloqueio de redistribuição de pesos até prova documental.
- Hunyuan3D: licença comunitária tem restrições territoriais/condições comerciais; não usar no produto sem análise dos termos aplicáveis.
- TRELLIS.2 e TripoSR: conferir licença do checkpoint exato e manter notices.
- OrcaSlicer/PrusaSlicer: AGPL-3.0; processos externos separados, sem incorporar código. Distribuição dos executáveis exige revisão de compliance.
- Blender: GPL; usar instalação externa e scripts bpy compatíveis com a licença quando distribuídos.

## Armadilhas e segurança

1. Python do Blender 3.13.13 não é o Python 3.11 do venv.
2. Nunca instalar ONNX/PyTorch dentro da pasta Python do Blender.
3. Não instalar CUDA em AMD.
4. Não misturar onnxruntime CPU com onnxruntime-directml no mesmo ambiente.
5. 4 GB VRAM não comportam TRELLIS.2/Hunyuan3D/UniRig localmente.
6. xformers é dependência CUDA/PyTorch de alguns projetos; não instalar nesta máquina.
7. Diretórios de pesos devem ficar fora do Git; usar hash, licença e origem por checkpoint.
8. Ponte local restrita a loopback, CORS allowlist, limite de upload, timeout e operações fixas; nunca aceitar comando/código arbitrário do navegador.
9. Não declarar GLB imprimível sem auditoria de malha e fatiamento.
10. Não afirmar que um motor está operacional apenas porque o adaptador ou caminho do modelo existe.

## Estado desta entrega

- Implementado nesta branch: inventário de motores e endpoints read-only de status.
- Não executado nesta sessão: instalação no Windows, download de pesos, inferência BiRefNet, geração neural 3D, slicing ou impressão física.
- main preservada; PR deve ter como base integration/studio-v7.5-candidate.
