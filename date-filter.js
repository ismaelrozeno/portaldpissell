// Filtro de data padrao, ao lado de cada campo de busca que peca por ele.
// No HTML, basta marcar o <input type="search" data-date-filter> e este
// script injeta "De / Ate" ao lado. A tela aplica o filtro chamando
// window.portalDateFilter.matches(campoDeBusca, diaISO) dentro do seu filtro.
(function () {
  "use strict";

  function enhance(search) {
    if (search.dataset.dateReady) return;
    search.dataset.dateReady = "1";
    const wrap = document.createElement("div");
    wrap.className = "date-filter";
    wrap.innerHTML =
      '<label class="date-filter-field">De <input type="date" class="date-filter-from" aria-label="Data inicial"></label>' +
      '<label class="date-filter-field">Até <input type="date" class="date-filter-to" aria-label="Data final"></label>' +
      '<button type="button" class="date-filter-clear" hidden>Limpar data</button>';
    search.insertAdjacentElement("afterend", wrap);
    const from = wrap.querySelector(".date-filter-from");
    const to = wrap.querySelector(".date-filter-to");
    const clear = wrap.querySelector(".date-filter-clear");
    // Guarda a referencia para o matches() ler o intervalo escolhido.
    search._dateFrom = from;
    search._dateTo = to;
    const fire = () => {
      clear.hidden = !(from.value || to.value);
      // Reaproveita o listener de busca que a tela ja tem, para redesenhar.
      search.dispatchEvent(new Event("input", { bubbles: true }));
    };
    from.addEventListener("change", fire);
    to.addEventListener("change", fire);
    clear.addEventListener("click", () => {
      from.value = "";
      to.value = "";
      fire();
    });
  }

  // true se o dia (YYYY-MM-DD) estiver dentro do intervalo escolhido (ou sem filtro).
  function matches(search, day) {
    if (!search) return true;
    const from = search._dateFrom && search._dateFrom.value;
    const to = search._dateTo && search._dateTo.value;
    if (from && (!day || day < from)) return false;
    if (to && (!day || day > to)) return false;
    return true;
  }

  function init(root) {
    (root || document).querySelectorAll('input[type="search"][data-date-filter]').forEach(enhance);
  }

  // Dia de um registro: usa a data da liberacao e, se faltar, a data de criacao.
  function dayOf(record) {
    return (record && (record.date || (record.createdAt ? String(record.createdAt).slice(0, 10) : ""))) || "";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => init());
  } else {
    init();
  }

  window.portalDateFilter = Object.freeze({ init, matches, dayOf });
})();
