// Paginação das listas do Meu portal (liberações individuais e coletivas), para a página não virar um rolo gigante:
// "Exibindo de 1 até 10 de 212 registros", 10/25/50/100 por página e « Primeira ‹ Anterior 1 2 3 Próxima › Última ».
//
// Uso:
//   const pager = window.portalPagination.create({ key: "individuais", after: elementoDaTabela, search: campoDeBusca, onChange: redesenhar });
//   const daPagina = pager.slice(listaInteira);   // desenha os controles e devolve só os itens da página atual
//   pager.hide();                                  // esconde os controles (ex.: lixeira)
// Buscar, filtrar por data ou mudar a ordem (evento "input" no campo de busca) volta para a página 1.
(() => {
  const SIZES = [10, 25, 50, 100];
  const storageKey = (key) => `portal-por-pagina-${key}`;
  const readSize = (key) => {
    try { return Number(window.localStorage.getItem(storageKey(key))) || 0; } catch { return 0; }
  };
  const saveSize = (key, size) => {
    try { window.localStorage.setItem(storageKey(key), String(size)); } catch { /* sem armazenamento: vale só nesta visita */ }
  };

  function create({ key, after, search, onChange }) {
    let page = 1;
    let perPage = SIZES.includes(readSize(key)) ? readSize(key) : SIZES[0];
    const bar = document.createElement("nav");
    bar.className = "pager";
    bar.setAttribute("aria-label", "Páginas da lista");
    bar.hidden = true;
    after.insertAdjacentElement("afterend", bar);

    // Captura: roda antes do redesenho que a tela faz no mesmo evento de busca.
    search?.addEventListener("input", () => { page = 1; }, true);

    bar.addEventListener("click", (event) => {
      const button = event.target.closest("[data-page]");
      if (!button || button.disabled) return;
      page = Number(button.dataset.page);
      onChange();
      // Volta ao topo da lista, para começar a ler a página nova do começo.
      const top = after.getBoundingClientRect().top + window.scrollY - 90;
      if (window.scrollY > top) window.scrollTo({ top, behavior: "smooth" });
    });
    bar.addEventListener("change", (event) => {
      if (!event.target.matches(".pager-size")) return;
      perPage = Number(event.target.value);
      saveSize(key, perPage);
      page = 1;
      onChange();
    });

    function render(total, pages, start, count) {
      bar.hidden = total === 0;
      if (!total) return;
      const button = (target, label, { current = false, aria } = {}) =>
        `<button type="button" class="pager-btn${current ? " is-current" : ""}" data-page="${target}"${current || target < 1 || target > pages ? " disabled" : ""}${current ? ' aria-current="page"' : ""}${aria ? ` aria-label="${aria}"` : ""}>${label}</button>`;
      // Até 5 números em volta da página atual.
      const first = Math.max(1, Math.min(page - 2, pages - 4));
      const numbers = Array.from({ length: Math.min(5, pages) }, (_, i) => first + i).map((n) => button(n, n, { current: n === page, aria: `Página ${n}` })).join("");
      bar.innerHTML = `
        <div class="pager-info">
          <span>Exibindo de ${start + 1} até ${start + count} de ${total} ${total === 1 ? "registro" : "registros"}</span>
          <label class="pager-size-label"><select class="pager-size" aria-label="Registros por página">${SIZES.map((size) => `<option value="${size}"${size === perPage ? " selected" : ""}>${size}</option>`).join("")}</select> por página</label>
        </div>
        ${pages > 1 ? `<div class="pager-buttons">
          ${button(1, "«", { aria: "Primeira página" })}${button(page - 1, "‹ Anterior", { aria: "Página anterior" })}
          ${numbers}
          ${button(page + 1, "Próxima ›", { aria: "Próxima página" })}${button(pages, "»", { aria: "Última página" })}
        </div>` : ""}`;
    }

    return {
      slice(list) {
        const total = list.length;
        const pages = Math.max(1, Math.ceil(total / perPage));
        page = Math.min(Math.max(1, page), pages); // a lista pode ter diminuído (ex.: alguém apagou)
        const start = (page - 1) * perPage;
        const items = list.slice(start, start + perPage);
        render(total, pages, start, items.length);
        return items;
      },
      hide() { bar.hidden = true; },
      reset() { page = 1; }
    };
  }

  window.portalPagination = Object.freeze({ create, SIZES });
})();
