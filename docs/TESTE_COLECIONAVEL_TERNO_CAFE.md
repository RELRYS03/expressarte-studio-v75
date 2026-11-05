# Teste: colecionável de terno segurando xícara

Data: 05/11/2026. Referência visual fornecida pelo usuário: cabeça grande, cabelo castanho ondulado, olhos pretos, terno escuro e xícara branca.

## Método

Modelo aproximado construído por geometria procedural conforme a referência, sem serviço pago e sem afirmar reconstrução automática por IA. Perfil e traseira foram inferidos, porque a imagem mostra uma única vista.

Gerador reproduzível: `scripts/create-reference-collectible.mjs`. Com as dependências do projeto instaladas:

```bash
node scripts/create-reference-collectible.mjs /caminho/para/saida
```

O programa cria STL unido, GLB colorido com partes nomeadas e relatório JSON. Os arquivos do teste foram entregues separadamente ao usuário, sem adicionar binários ao repositório.

## Validação executada

| Medida / verificação | Resultado |
| --- | --- |
| Altura | 100 mm |
| Largura | 59,816 mm |
| Profundidade | 49,684 mm |
| STL | 19.482 triângulos |
| Corpos conectados no STL | 1 |
| Status Manifold | NoError |
| Volume geométrico maciço | 109.863,03 mm³; não é estimativa de consumo com infill |
| STL reaberto com STLLoader | Passou |
| GLB 2.0, tamanho declarado e JSON | Passou |
| Partes / materiais no GLB | 67 / 9 |

Os tubos de cabelo e sobrancelhas têm extremidades fechadas antes da união; a primeira versão aberta foi rejeitada pela validação e corrigida. O STL foi unido por booleanos. O GLB mantém partes sobrepostas para visualização em cores e edição, portanto não é equivalente ao STL em topologia.

## Como testar

- **Editor Model Workbench (`/workbench`):** Abrir arquivo STL → selecionar `Colecionavel_Terno_Cafe_100mm.stl`. Conferir dimensões e orientação. A importação interativa deste arquivo no Workbench não foi validada nesta execução; o teste de reabertura foi feito com o STLLoader utilizado pelo editor.
- **Oficina GLB (`/modelo-ia`):** selecionar `Colecionavel_Terno_Cafe_Colorido.glb`. O glTF foi salvo em metros, Y-up; altura física correspondente a 100 mm. A oficina pode inferir o eixo vertical; conferir antes de exportar.
- **Bambu Studio:** importar o STL, revisar tamanho, suportes, paredes/infill e prévia de camadas antes de imprimir.

## Limites

É uma aproximação de teste, não uma réplica fiel da referência. Cabelo, lapelas e mãos são simplificados; a xícara é um sólido com superfície de café e alça. Não houve teste no Bambu Studio nem impressão física. A geração deste exemplo por script não torna operacional a criação automática de qualquer personagem por imagem ou texto no site. Não houve publicação.
