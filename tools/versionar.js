// Atualiza o "?v=..." de todo JS/CSS/partial do portal com a impressão digital (hash) do conteúdo do arquivo.
// Assim o navegador baixa de novo só o que mudou, e ninguém precisa trocar números à mão.
//
// Uso (na pasta do projeto, antes de publicar):   node tools/versionar.js
// Para só conferir, sem alterar nada:            node tools/versionar.js --conferir
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.resolve(__dirname, "..");
const check = process.argv.includes("--conferir");

// Referência a um arquivo local de js/, css/ ou partials/ entre aspas (src, href, loadScript, fetch, new URL),
// com ou sem ?v= antigo. Só aspas: caminho citado em comentário "(js/...)" não é carregamento e fica como está.
const REF = /(["'`])((?:js|css|partials)\/[A-Za-z0-9_./-]+\.(?:js|css|html))(?:\?v=[A-Za-z0-9_-]*)?(["'`])/g;

const skip = new Set([".git", "downloads", "tools", "node_modules", ".well-known", "icons", "images"]);
const walk = (dir) => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => {
  if (skip.has(e.name)) return [];
  const rel = dir ? `${dir}/${e.name}` : e.name;
  return e.isDirectory() ? walk(rel) : [rel];
});
const files = walk("").filter((f) => /\.(html|js|css)$/.test(f));
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const hash = (text) => crypto.createHash("sha1").update(text).digest("hex").slice(0, 8);

const content = Object.fromEntries(files.map((f) => [f, read(f)]));
const missing = new Set();
// Um arquivo pode citar outro (ex.: collective-release-sheet.js carrega o PDF): repete até nada mudar.
for (let pass = 0; pass < 10; pass += 1) {
  let changed = false;
  for (const f of files) {
    const next = content[f].replace(REF, (all, a, ref, b) => {
      if (!(ref in content)) { missing.add(`${f} -> ${ref}`); return all; }
      return `${a}${ref}?v=${hash(content[ref])}${b}`;
    });
    if (next !== content[f]) { content[f] = next; changed = true; }
  }
  if (!changed) break;
}

if (missing.size) {
  console.error("Referências para arquivos que não existem:\n  " + [...missing].join("\n  "));
  process.exitCode = 1;
}
const touched = files.filter((f) => content[f] !== read(f));
if (check) {
  console.log(touched.length ? `Desatualizados (${touched.length}): ${touched.join(", ")}` : "Tudo com a versão certa.");
  if (touched.length) process.exitCode = 1;
} else {
  touched.forEach((f) => fs.writeFileSync(path.join(root, f), content[f], "utf8"));
  console.log(touched.length ? `Versões atualizadas em ${touched.length} arquivo(s).` : "Nada para atualizar.");
}
