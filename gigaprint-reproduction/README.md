# Express'Arte Lab 3D

Aplicativo independente de reprodução funcional da experiência pública do GigaPrint, com identidade visual Express'Arte.

## Executar localmente

Requer Node.js 20 ou superior.

```powershell
cd .\gigaprint-reproduction
npm install
npm run dev
```

Abra o endereço local informado pelo Vite.

## Conteúdo atual

- Catálogo de ferramentas organizado por categoria, com pesquisa e filtros.
- Área de trabalho independente por ferramenta.
- Pré-visualização 3D com Three.js e OrbitControls.
- Controles paramétricos iniciais.
- Importação de STL e exportação de STL binário.
- Layout responsivo para desktop e celular.

## Estado de implementação

Esta é a primeira entrega executável do novo aplicativo, não uma alegação de paridade completa com todas as ferramentas do GigaPrint. Os cartões e a área de trabalho estão estruturados; cada gerador ainda precisa receber controles específicos e algoritmo geométrico próprio. A importação OBJ/3MF, exportação 3MF multiobjeto, operações booleanas, reparação watertight e os demais fluxos avançados ainda não estão implementados.

## Escopo e propriedade intelectual

A implementação usa código próprio e tecnologias abertas. Reproduz padrões funcionais observáveis, sem copiar código-fonte privado, identidade, textos ou ativos protegidos do serviço de referência.
