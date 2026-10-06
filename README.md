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
