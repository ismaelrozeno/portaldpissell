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
    ["unbonused", "Pendentes de abono mais antigas"],
    ["unbonusedRecent", "Pendentes de abono mais recentes"],
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
      // A pessoa escolheu: o padrao do perfil nao muda mais a escolha dela.
      search._sortTouched = true;
      // Reaproveita o listener de busca que a tela ja tem, para redesenhar.
      search.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  // Ordem padrao do perfil (ex.: engenheiro = pendentes de abono primeiro). Nao troca o que a pessoa ja escolheu.
  function setDefault(search, mode) {
    if (!search) return;
    enhance(search);
    if (search._sortTouched || !OPTIONS.some(([v]) => v === mode)) return;
    search._sortSelect.value = mode;
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
      case "unbonused":
      case "unbonusedRecent": {
        // Aguardando decisão de abono: sem abono definido e ainda ativa (nem recusada, nem encerrada).
        // Entre as pendentes: "mais antigas" = fila (quem espera ha mais tempo no topo); "mais recentes" = a ultima
        // que chegou no topo. O resto vem depois, sempre mais recentes primeiro.
        const waiting = (r) => (!bonus(r) && !["foreman", "closed", "exited"].includes(stage(r))) ? 0 : 1;
        const oldestFirst = mode === "unbonused";
        copy.sort((a, b) => {
          const ra = waiting(a), rb = waiting(b);
          if (ra !== rb) return ra - rb;
          return ra === 0 && oldestFirst ? createdAt(a).localeCompare(createdAt(b)) : byRecent(a, b);
        });
        break;
      }
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

  window.portalSortFilter = Object.freeze({ init, value, sort, setDefault, OPTIONS });
})();
