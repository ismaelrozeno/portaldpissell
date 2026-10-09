// Barra de filtros por perfil, no padrão das listas do GitHub/Gmail: Situação · Período · Ordenar · Limpar filtros.
// Cada perfil tem a sua configuração em PROFILES (todos os perfis do Meu portal); perfil sem configuração continua
// com o filtro antigo (De/Até + Ordenar, js/core/date-filter.js e sort-filter.js).
//
// Cada lista (individual e coletiva) tem a SUA barra, com filtros separados. A "Situação" tem as mesmas opções dos
// cartões do resumo (que somam as duas listas): clicar num cartão aplica a situação nas duas listas de uma vez, e o
// cartão fica aceso enquanto as duas estiverem nela.
//
// A barra não filtra sozinha: ela escreve nos campos escondidos do filtro antigo (De/Até e Ordenar), que as telas já
// leem, e a Situação a tela consulta com matchesStatus(). Período personalizado usa o flatpickr (calendário de intervalo).
//
// No HTML: <input type="search" data-date-filter data-sort-filter data-filter-bar>. A tela chama use(perfil) ao abrir.
(() => {
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const localDay = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : iso(date);
  };
  const daysFromToday = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return iso(date);
  };
  const brDay = (day) => day ? day.split("-").reverse().join("/") : "";

  // Mesmas regras dos cartões do resumo (statRules em js/pages/portal.js e refreshStats das coletivas).
  // Os "value" que têm cartão (pending, approved, bonus, launched) precisam existir para o clique no cartão filtrar;
  // aliases: cartão que, naquele perfil, é a mesma Situação de outro (no engenheiro, "bonus" = "pending").
  // defaultSort: ordem com que a lista abre e para a qual o "Limpar filtros" volta.
  const today = () => iso(new Date());
  const RULES = {
    approvedToday: (record, stage) => ["gate", "exited"].includes(stage)
      && (record.dpDecisionAt ? localDay(record.dpDecisionAt) : record.date) === today(),
    awaitingBonus: (record, stage) => !record.bonusStatus && !["foreman", "closed"].includes(stage)
  };
  const BASIC_SORTS = [["recent", "Mais recentes"], ["old", "Mais antigos"], ["name", "Nome (A–Z)"]];
  // Encarregado, analista, estagiário e segurança do trabalho: acompanham o que eles mesmos pediram.
  const CHIEF = {
    statuses: [
      { value: "all", label: "Todas" },
      { value: "pending", label: "Em andamento · engenheiro ou DP", test: (record, stage) => ["engineer", "foreman", "dp"].includes(stage) },
      { value: "refused", label: "Recusadas · para ajustar e reenviar", test: (record, stage) => stage === "foreman" },
      { value: "approved", label: "Autorizadas hoje", test: RULES.approvedToday },
      { value: "bonus", label: "Abono · aguardando engenheiro", test: RULES.awaitingBonus },
      { value: "bonusYes", label: "Abonadas", test: (record) => record.bonusStatus === "approved" },
      { value: "bonusNo", label: "Não abonadas", test: (record) => record.bonusStatus === "denied" },
      { value: "exited", label: "Saída confirmada na portaria", test: (record, stage) => stage === "exited" },
      { value: "launched", label: "Abono · lançado no RM", test: (record) => !!record.abonoLaunchedAt },
      { value: "retroactive", label: "Retroativas · registradas", test: (record, stage) => stage === "registered" }
    ],
    sorts: BASIC_SORTS
  };

  const PROFILES = {
    encarregado: CHIEF,
    analista: CHIEF,
    estagiario_engenharia: CHIEF,
    seguranca_trabalho: CHIEF,
    engenheiro: {
      statuses: [
        { value: "all", label: "Todas" },
        { value: "pending", label: "Aguardando seu abono", test: RULES.awaitingBonus },
        { value: "bonusYes", label: "Abonadas", test: (record) => record.bonusStatus === "approved" },
        { value: "bonusNo", label: "Não abonadas", test: (record) => record.bonusStatus === "denied" },
        { value: "refused", label: "Recusadas · devolvidas ao solicitante", test: (record, stage) => stage === "foreman" },
        { value: "approved", label: "Autorizadas hoje", test: RULES.approvedToday },
        { value: "launched", label: "Abono · lançado no RM", test: (record) => !!record.abonoLaunchedAt },
        { value: "retroactive", label: "Retroativas · registradas", test: (record, stage) => stage === "registered" }
      ],
      aliases: { bonus: "pending" },
      sorts: [["unbonusedRecent", "Pendentes de abono mais recentes"], ["unbonused", "Pendentes de abono mais antigas"], ["recent", "Mais recentes"], ["old", "Mais antigos"], ["name", "Nome (A–Z)"]],
      defaultSort: "unbonusedRecent"
    },
    portaria: {
      statuses: [
        { value: "all", label: "Todas" },
        { value: "gate", label: "Aguardando saída", test: (record, stage) => stage === "gate" },
        { value: "approved", label: "Autorizadas hoje", test: RULES.approvedToday },
        { value: "exitedToday", label: "Saíram hoje", test: (record, stage) => stage === "exited" && localDay(record.exitConfirmedAt) === today() },
        { value: "exited", label: "Saída confirmada", test: (record, stage) => stage === "exited" }
      ],
      sorts: BASIC_SORTS
    },
    dp: {
      statuses: [
        { value: "all", label: "Todas" },
        { value: "pending", label: "Pendentes · aguardando DP", test: (record, stage) => stage === "dp" },
        { value: "approved", label: "Autorizadas hoje", test: (record, stage) => ["gate", "exited"].includes(stage)
          && (record.dpDecisionAt ? localDay(record.dpDecisionAt) : record.date) === iso(new Date()) },
        { value: "bonus", label: "Abono · aguardando engenheiro", test: (record, stage) => !record.bonusStatus && !["foreman", "closed"].includes(stage) },
        { value: "toLaunch", label: "Abono · por lançar no RM", test: (record) => record.bonusStatus === "approved" && !record.abonoLaunchedAt },
        { value: "launched", label: "Abono · lançado no RM", test: (record) => !!record.abonoLaunchedAt },
        // Data anterior ao dia em que foi criada: sem autorização de saída nem portaria (não tem cartão próprio).
        { value: "retroactive", label: "Retroativas · registradas", test: (record, stage) => stage === "registered" }
      ],
      sorts: [["recent", "Mais recentes"], ["old", "Mais antigos"], ["name", "Nome (A–Z)"]]
    }
  };

  const PERIODS = [
    ["any", "Qualquer data", () => ["", ""]],
    ["today", "Hoje", () => [daysFromToday(0), daysFromToday(0)]],
    ["yesterday", "Ontem", () => [daysFromToday(-1), daysFromToday(-1)]],
    ["week", "Últimos 7 dias", () => [daysFromToday(-6), daysFromToday(0)]],
    ["month", "Este mês", () => { const now = new Date(); return [iso(new Date(now.getFullYear(), now.getMonth(), 1)), daysFromToday(0)]; }],
    ["lastMonth", "Mês passado", () => { const now = new Date(); return [iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)), iso(new Date(now.getFullYear(), now.getMonth(), 0))]; }],
    ["custom", "Escolher datas…", null]
  ];
  const CUSTOM_LABEL = "Escolher datas…";

  let config = null;
  const bars = [];
  const defaultSort = () => config?.defaultSort || "recent";
  const isClean = (bar) => bar.status.value === "all" && bar.period.value === "any" && bar.sort.value === defaultSort() && !bar.search.value;

  const legacyRow = (search) => search.nextElementSibling?.classList.contains("date-filter") ? search.nextElementSibling : null;

  // Escreve o filtro nos campos escondidos do filtro antigo, que as telas já leem.
  function write(bar) {
    const { search } = bar;
    // Sem o calendário (bar.native), a pessoa digita as datas direto nos campos De/Até.
    if (search._dateFrom && !bar.native) search._dateFrom.value = bar.range[0];
    if (search._dateTo && !bar.native) search._dateTo.value = bar.range[1];
    if (search._sortSelect) {
      search._sortSelect.value = bar.sort.value;
      search._sortTouched = true;
    }
    bar.clear.hidden = isClean(bar);
  }

  // Redesenha a lista (a tela já escuta o "input" do campo de busca; a paginação volta para a página 1).
  function apply(bar) {
    write(bar);
    bar.search.dispatchEvent(new Event("input", { bubbles: true }));
  }

  const statusChanged = () => document.dispatchEvent(new CustomEvent("portal-filter-status"));

  function setPeriod(bar, value, range) {
    bar.period.value = value;
    bar.range = range || (PERIODS.find(([v]) => v === value)?.[2]?.() ?? ["", ""]);
    bar.customOption.textContent = value === "custom" && bar.range[0]
      ? (bar.range[0] === bar.range[1] ? brDay(bar.range[0]) : `${brDay(bar.range[0])} – ${brDay(bar.range[1])}`)
      : CUSTOM_LABEL;
    bar.lastPeriod = value;
  }

  // Calendário de intervalo (flatpickr). Sem a biblioteca (internet ruim), volta para os campos De/Até do navegador.
  function openCustom(bar) {
    if (!window.flatpickr) {
      const row = legacyRow(bar.search);
      if (row) {
        row.hidden = false;
        row.querySelector(".sort-filter")?.setAttribute("hidden", "");
        bar.native = true;
        bar.period.value = "custom";
        bar.lastPeriod = "custom";
      }
      return;
    }
    if (!bar.picker) {
      bar.picker = window.flatpickr(bar.rangeInput, {
        mode: "range",
        dateFormat: "Y-m-d",
        maxDate: "today",
        locale: window.flatpickr.l10n?.pt || "default",
        positionElement: bar.period,
        onClose: (dates) => {
          // Fechou sem escolher: fica o período que estava.
          if (!dates.length) return;
          const days = dates.map(iso);
          setPeriod(bar, "custom", [days[0], days[days.length - 1]]);
          apply(bar);
        }
      });
    }
    bar.picker.setDate(bar.range[0] ? bar.range : [], false);
    bar.picker.open();
  }

  function closeNative(bar) {
    if (!bar.native) return;
    const row = legacyRow(bar.search);
    if (row) row.hidden = true;
    row?.querySelector(".sort-filter")?.removeAttribute("hidden");
    bar.native = false;
  }

  function attach(search) {
    if (search._filterBar) return search._filterBar;
    const el = document.createElement("div");
    el.className = "filter-bar";
    el.hidden = true;
    el.innerHTML = `
      <label class="filter-bar-field"><span>Situação</span><select class="filter-bar-select" data-filter="status" aria-label="Situação"></select></label>
      <label class="filter-bar-field"><span>Período</span><select class="filter-bar-select" data-filter="period" aria-label="Período">${PERIODS.map(([v, t]) => `<option value="${v}">${t}</option>`).join("")}</select></label>
      <input class="filter-bar-range" type="text" tabindex="-1" aria-hidden="true">
      <label class="filter-bar-field"><span>Ordenar</span><select class="filter-bar-select" data-filter="sort" aria-label="Ordenar por"></select></label>
      <button class="filter-bar-clear" type="button" hidden>Limpar filtros</button>`;
    (legacyRow(search) || search).insertAdjacentElement("afterend", el);
    const bar = {
      search, el,
      status: el.querySelector('[data-filter="status"]'),
      period: el.querySelector('[data-filter="period"]'),
      sort: el.querySelector('[data-filter="sort"]'),
      rangeInput: el.querySelector(".filter-bar-range"),
      clear: el.querySelector(".filter-bar-clear"),
      range: ["", ""],
      lastPeriod: "any"
    };
    bar.customOption = bar.period.querySelector('option[value="custom"]');
    bar.status.addEventListener("change", () => { apply(bar); statusChanged(); });
    bar.sort.addEventListener("change", () => apply(bar));
    bar.period.addEventListener("change", () => {
      if (bar.period.value === "custom") {
        // O período só muda quando a pessoa escolhe as datas no calendário.
        bar.period.value = bar.lastPeriod;
        return openCustom(bar);
      }
      closeNative(bar);
      setPeriod(bar, bar.period.value);
      apply(bar);
    });
    bar.clear.addEventListener("click", () => {
      search.value = "";
      bar.status.value = "all";
      bar.sort.value = defaultSort();
      closeNative(bar);
      setPeriod(bar, "any");
      apply(bar);
      statusChanged();
    });
    // Digitar na busca também acende o "Limpar filtros".
    search.addEventListener("input", () => { if (config) bar.clear.hidden = isClean(bar); });
    search._filterBar = bar;
    bars.push(bar);
    return bar;
  }

  // Abre a barra do perfil (ou volta ao filtro antigo, se o perfil não tiver configuração). Trocar de perfil zera os filtros.
  function use(profileKey) {
    const next = PROFILES[profileKey] || null;
    const changed = next !== config;
    config = next;
    document.querySelectorAll('input[type="search"][data-filter-bar]').forEach((search) => {
      const bar = attach(search);
      const row = legacyRow(search);
      if (row) row.hidden = !!config;
      bar.el.hidden = !config;
      if (!changed) return;
      bar.native = false;
      row?.querySelector(".sort-filter")?.removeAttribute("hidden");
      if (config) {
        bar.status.innerHTML = config.statuses.map(({ value, label }) => `<option value="${value}">${label}</option>`).join("");
        bar.sort.innerHTML = config.sorts.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
        bar.status.value = "all";
        bar.sort.value = defaultSort();
        setPeriod(bar, "any");
        write(bar);
      } else {
        // Volta ao filtro antigo limpo; a ordem padrão do perfil (setDefault) entra no próximo desenho.
        if (search._dateFrom) search._dateFrom.value = "";
        if (search._dateTo) search._dateTo.value = "";
        search._sortTouched = false;
      }
    });
  }

  const active = () => !!config;
  const status = (search) => (config && search?._filterBar?.status.value) || "all";

  // true se o registro entra na Situação escolhida na barra daquela lista (ou se não há barra/situação).
  function matchesStatus(search, record, stage, collective = false) {
    const value = status(search);
    if (value === "all") return true;
    const rule = config.statuses.find((item) => item.value === value);
    return !rule?.test || rule.test(record, stage, collective);
  }

  // Cartão do resumo: aplica a situação nas duas listas (ou tira, com "all").
  function setStatusAll(value) {
    if (!config) return;
    value = config.aliases?.[value] || value;
    bars.forEach((bar) => {
      if (bar.el.hidden) return;
      bar.status.value = config.statuses.some((item) => item.value === value) ? value : "all";
      apply(bar);
    });
    statusChanged();
  }

  // Situação comum às listas visíveis (o cartão aceso), ou null se estão diferentes ou em "Todas".
  function sharedStatus() {
    if (!config) return null;
    const values = [...new Set(bars.filter((bar) => !bar.el.hidden).map((bar) => bar.status.value))];
    return values.length === 1 && values[0] !== "all" ? values[0] : null;
  }

  const aliases = () => config?.aliases || {};

  window.portalFilterBar = Object.freeze({ use, active, status, matchesStatus, setStatusAll, sharedStatus, aliases });
})();
