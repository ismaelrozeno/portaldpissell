# Tarefas Online · Portal do DP (Obra 369)

Portal de liberações de saída de colaboradores: encarregado solicita, engenheiro decide o abono, DP autoriza
(e colhe a digital do colaborador) e a portaria confirma a saída. Publicado em https://www.admdf.site (GitHub Pages).

Site estático: HTML, CSS e JavaScript puro, sem etapa de compilação. Dados e login no Firebase (Firestore + Auth).

## Estrutura

```
*.html              Páginas. Ficam na raiz para os endereços (favoritos, links, app) não mudarem.
css/
  site-overrides.css   Estilo comum a todas as páginas
  components/          Peças usadas em várias telas (folha de liberação, painel das coletivas)
  pages/               Um arquivo por página
js/
  core/                Firebase, login, cabeçalho/rodapé, filtros de data e ordenação
  features/            Liberações, coletivas, biometria (Hamster DX), PDF/imagem, backup
  pages/               Um script por página (mesmo nome da página, em minúsculo)
partials/           Cabeçalho e rodapé, injetados por js/core/shared-components.js
images/, icons/     Imagens, avatares e ícones do app
downloads/          Arquivos oferecidos para baixar (APK do app, pacote do leitor biométrico)
tools/
  versionar.js         Atualiza o ?v= dos arquivos (ver abaixo)
  biometria-agente/    Agente C# antigo do leitor (sem uso: o portal fala com a Fingertech-API)
sw.js, manifest.webmanifest   App instalável (o service worker fica na raiz por causa do escopo)
firestore.rules     Regras de segurança do banco
```

Páginas inativadas (DP-Liberacoes, Engenheiro, Portaria, Página-Inicial) só redirecionam: tudo ficou no Meu portal (Portal.html).

## Fluxo das liberações

Individual e coletiva seguem o mesmo caminho: **encarregado (solicitante) → engenheiro → DP → portaria**.

- O engenheiro assina o abono (abonado / não abonado). A liberação pode ser enviada a um engenheiro
  específico ("Enviar para") ou a todos.
- O DP só autoriza ou recusa **depois** da assinatura do engenheiro. A recusa do DP **devolve ao engenheiro**,
  com o motivo escrito, para ele marcar o abono de novo. A recusa do engenheiro devolve ao solicitante.
- A portaria confirma a saída. Na coletiva, marca **cada colaborador** ao passar e só fecha a folha com todos.
- **Retroativa:** data anterior ao dia do registro, ou **entrada e saída marcadas juntas** (não bateu o ponto).
  Depois do engenheiro fica "registrada", sem DP nem portaria; com entrada e saída o horário é opcional.
- O DP lança o abono no RM pela folha ("Lançar abono"), na individual e na coletiva. A digital do colaborador
  pode ser colhida mesmo depois da saída.
- Regras do fluxo: `portalReleaseFlow` em `js/core/firebase-release-store.js` (individual) e
  `js/features/collective-release-sheet.js` (coletiva).

## Meu portal (dashboard)

`Portal.html` é um dashboard com páginas pelo endereço: Visão geral (sem `#`), `#individuais`, `#coletivas`,
`#indicadores` (BI Dados) e `#equipe` (Atalhos). No computador há um menu lateral; no celular, barra de abas
embaixo e botão "+" para nova liberação.

- `js/features/portal-dashboard.js` + `css/components/portal-dashboard.css`: páginas, "Esteira do fluxo"
  (quantas liberações paradas em cada etapa, com a etapa do perfil logado em destaque), "Para você agora" e
  números do menu. Cada bloco do `Portal.html` diz em que página aparece com `data-dash="..."`.
- `js/features/dash-shell.js`: o mesmo menu em outras páginas (`<body data-dash-shell="...">`): Equipes,
  Administração e Aplicativo.
- `js/features/portal-insights.js` e `portal-insights-charts.js`: indicadores e gráficos do mês (BI Dados).
- `js/core/filter-bar.js`: barra Situação · Período · Ordenar de cada perfil (inclui "Aguardando por engenheiro").
- Cores e fontes do visual novo (Barlow) ficam em variáveis no topo de `portal-dashboard.css`.

## Exportações

- **Folha de liberação**: tela (`js/features/release-preview.js`) e PDF (`js/features/release-pdf.js`) usam o
  mesmo desenho em quadros, com as mesmas medidas (794 x 559 px de projeto). A imagem PNG do Backup
  (`release-image.js`) ainda usa o desenho antigo.
- **Backup e exportação** (`Backup.html`): backup .json, folhas em PDF/imagem, Excel e a **apresentação do mês
  em PowerPoint** (`js/features/report-pptx.js`, 12 slides com gráficos editáveis; também no BI Dados, para o DP).

## Testar localmente

Sirva a pasta com qualquer servidor estático na porta 8080 (o login do Firebase aceita `localhost`), por
exemplo `python -m http.server 8080`, e abra `http://localhost:8080/Portal.html`. Se o navegador mostrar
versão antiga, use Ctrl+F5 (ou um servidor que mande `Cache-Control: no-store`).

Ao publicar, não copie para o repositório as pastas `.agents/`, `.claude/` nem o `skills-lock.json`
(ferramentas de desenvolvimento, não fazem parte do site).

## Antes de publicar: versões dos arquivos

Cada `<script>`/`<link>` leva `?v=<código>` para o navegador baixar de novo o que mudou. Não troque esses
códigos à mão. Depois de editar qualquer JS/CSS, rode na pasta do projeto:

```
node tools/versionar.js
```

Para só conferir se está tudo em dia: `node tools/versionar.js --conferir`.

## Regras do banco

O GitHub não aplica o `firestore.rules`. Depois de mudar esse arquivo, publique no console do Firebase
(projeto `admdf-dp` → Firestore → Regras) ou com `firebase deploy --only firestore:rules`.

## Leitor biométrico

A assinatura por digital usa o leitor Hamster DX pela Fingertech-API (`http://localhost:5000/apiservice`),
que precisa estar aberta no computador do DP onde o leitor está ligado. Cadastro das digitais em Biometria.html.
