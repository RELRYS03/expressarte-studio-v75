# Express'Arte AI Creator: contrato do motor 3D

## Estado
O frontend envia solicitações reais para `POST /api/ai-3d/generate`. **Nenhum motor de IA está instalado ou executando** nesta entrega. O endpoint precisa ser implementado no servidor antes de gerar modelos. Não apresentar uma imagem renderizada como STL imprimível.

## Requisição
`multipart/form-data`: `mode` = `text`, `image` ou `both`; `prompt` = texto UTF-8; `heightMm` = número; `image` = arquivo PNG/JPEG/WebP opcional (máximo 10 MB no cliente).

## Resposta HTTP 200
```json
{"modelUrl":"/api/ai-3d/models/uuid.glb","format":"glb","jobId":"uuid"}
```
A URL deve ser relativa à mesma origem, com autorização adequada, e servir o arquivo gerado. Responder 501 se o serviço não estiver configurado. Erros não devem expor credenciais. O servidor deve validar tipo real, tamanho, limites de uso, permissões e duração da tarefa. A geração pesada provavelmente exigirá jobs assíncronos e polling em vez desta API síncrona inicial.

## Próximas decisões
Escolher e licenciar um motor (por exemplo, Hunyuan3D ou TRELLIS), confirmar GPU/infraestrutura e suportes efetivos de texto e imagem. Se o motor aceitar somente imagens, usar etapa de geração de imagem para texto puro e documentar isso. Implementar backend autenticado, fila, armazenamento temporário, conversão para STL/3MF, inspeção de malha e testes. Não colocar chaves no Vite ou no navegador.

## Segurança e qualidade
Verificar URLs e arquivos no backend, impedir SSRF e uploads perigosos, aplicar rate limits e cotas. A altura solicitada é uma intenção; não declarar escala real ou imprimibilidade sem medir a geometria final e validar a malha.
