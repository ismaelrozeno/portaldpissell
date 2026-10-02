// Ordenacao padrao ao lado da busca. No HTML, marque o
// <input type="search" data-sort-filter> e este script injeta um seletor
// "Ordenar por". A tela aplica a ordem chamando
// window.portalSortFilter.sort(lista, campoDeBusca, acessores) no seu render.
(function () {
  "use strict";

  const OPTIONS = [
    ["recent", "Mais recentes"],
    ["old", "Mais antigos"],
    ["pending", "Pendentes primeiro"],
    ["bonus", "Abonados primeiro"],
    ["denied", "Não abonados primeiro"],
    ["name", "Nome (A–Z)"]
  ];

  // Fase pendente (precisa de acao) vem antes de autorizada, que vem antes de encerrada.
  const PENDING_RANK = { engineer: 0, foreman: 0, dp: 0, gate: 1, exited: 2, closed: 2 };

  function enhance(search) {
    if (search.dataset.sortReady) return;
    search.dataset.sortReady = "1";
    const wrap = document.createElement("label");
    wrap.className = "sort-filter";
    wrap.innerHTML = 'Ordenar por <select class="sort-filter-select" aria-label="Ordenar por">' +
      OPTIONS.map(([v, t]) => `<option value="${v}">${t}</option>`).join("") + "</select>";
    // Entra junto da linha do filtro de data, se existir; senao, logo apos a busca.
    const dateRow = search.nextElementSibling && search.nextElementSibling.classList.contains("date-filter")
      ? search.nextElementSibling : null;
    if (dateRow) dateRow.appendChild(wrap);
    else search.insertAdjacentElement("afterend", wrap);
    const select = wrap.querySelector(".sort-filter-select");
    search._sortSelect = select;
    select.addEventListener("change", () => {
      // Reaproveita o listener de busca que a tela ja tem, para redesenhar.
      search.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  function value(search) {
    return (search && search._sortSelect && search._sortSelect.value) || "recent";
  }

  // Ordena uma copia da lista conforme o modo escolhido. Os acessores tem
  // padroes que servem para liberacoes; passe outros para coletivas/portaria.
  function sort(list, search, acc) {
    acc = acc || {};
    const createdAt = acc.createdAt || ((r) => String(r.createdAt || r.date || ""));
    const stage = acc.stage || ((r) => (window.portalReleaseFlow ? window.portalReleaseFlow.stageOf(r) : ""));
    const name = acc.name || ((r) => String(r.name || r.motive || ""));
    const bonus = acc.bonus || ((r) => String(r.bonusStatus || ""));
    const mode = value(search);
    const byRecent = (a, b) => createdAt(b).localeCompare(createdAt(a));
    const copy = [...list];
    switch (mode) {
      case "old":
        copy.sort((a, b) => createdAt(a).localeCompare(createdAt(b)));
        break;
      case "pending":
        copy.sort((a, b) => {
          const ra = PENDING_RANK[stage(a)] ?? 1, rb = PENDING_RANK[stage(b)] ?? 1;
          return ra !== rb ? ra - rb : byRecent(a, b);
        });
        break;
      case "bonus":
        copy.sort((a, b) => {
          const ra = bonus(a) === "approved" ? 0 : 1, rb = bonus(b) === "approved" ? 0 : 1;
          return ra !== rb ? ra - rb : byRecent(a, b);
        });
        break;
      case "denied":
        copy.sort((a, b) => {
          const ra = bonus(a) === "denied" ? 0 : 1, rb = bonus(b) === "denied" ? 0 : 1;
          return ra !== rb ? ra - rb : byRecent(a, b);
        });
        break;
      case "name":
        copy.sort((a, b) => name(a).localeCompare(name(b), "pt-BR", { sensitivity: "base" }));
        break;
      default: // recent
        copy.sort(byRecent);
    }
    return copy;
  }

  function init(root) {
    (root || document).querySelectorAll('input[type="search"][data-sort-filter]').forEach(enhance);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => init());
  } else {
    init();
  }

  window.portalSortFilter = Object.freeze({ init, value, sort, OPTIONS });
})();
