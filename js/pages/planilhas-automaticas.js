// Ferramentas de automação: o cartão do programa Gestão DP mostra a última versão publicada.
// O downloads/gestao-dp.json é gravado pelo ferramentas/publicar.py do Gestão DP a cada versão nova (não editar à
// mão): versão, data, tamanho, novidades e o link do instalador. O link aponta para ".../releases/latest/download/",
// que no GitHub sempre entrega a versão mais nova. Se o arquivo não carregar, fica o texto escrito no HTML.
(function automationToolsPage() {
  const card = document.getElementById("gestao-dp");
  if (!card) return;

  const escape = (text) => String(text).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
  const inline = (text) => escape(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Novidades vêm do CHANGELOG do programa (Markdown simples): "### Título" e itens "- texto".
  function notesHtml(text) {
    let html = "";
    let open = false;
    for (const raw of String(text).split("\n")) {
      const line = raw.trim();
      if (line.startsWith("- ") || line.startsWith("* ")) {
        if (!open) { html += "<ul>"; open = true; }
        html += `<li>${inline(line.slice(2))}</li>`;
        continue;
      }
      if (open) { html += "</ul>"; open = false; }
      if (line.startsWith("#")) html += `<h3>${inline(line.replace(/^#+\s*/, ""))}</h3>`;
      else if (line) html += `<p>${inline(line)}</p>`;
    }
    return open ? `${html}</ul>` : html;
  }

  const fill = (selector, value) => card.querySelectorAll(selector).forEach((el) => { el.textContent = value; });

  fetch("downloads/gestao-dp.json", { cache: "no-cache" })
    .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
    .then((info) => {
      fill("[data-gdp-versao]", info.versao);
      fill("[data-gdp-data]", info.data);
      fill("[data-gdp-tamanho]", String(info.tamanho_mb).replace(".", ","));
      if (info.url) card.querySelector("[data-gdp-link]").href = info.url;
      if (info.notas) {
        card.querySelector("[data-gdp-notas]").innerHTML = notesHtml(info.notas);
        card.querySelector("[data-gdp-novidades]").hidden = false;
      }
    })
    .catch(() => {}); // sem o arquivo, o cartão continua com o que está no HTML
})();
