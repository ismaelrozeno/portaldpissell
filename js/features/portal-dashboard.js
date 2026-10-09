// Meu portal em formato de dashboard (css/components/portal-dashboard.css): páginas pelo endereço (#individuais,
// #coletivas, #indicadores, #equipe; sem nada = visão geral), menu lateral no computador / barra de abas no celular,
// "Esteira do fluxo" (quantas liberações paradas em cada etapa, com a etapa de quem está logado em destaque),
// "Para você agora" e o botão "+" de nova liberação no celular. Não muda nenhuma regra: só organiza e mostra.
// Recebe os dados de writeStats (js/pages/portal.js): window.portalDashboard.update({ profileKey, releases, sheets }).
(() => {
  const PAGES = ["overview", "individuais", "coletivas", "indicadores", "equipe"];
  const CHIEFS = ["encarregado", "analista", "estagiario_engenharia", "seguranca_trabalho"];
  const body = document.body;
  if (!body.classList.contains("dash")) return;

  const $ = (selector) => document.querySelector(selector);
  const esc = (value) => window.escapeHtml(value);
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const pad = (n) => String(n).padStart(2, "0");
  const dayOf = (value) => {
    const date = value ? new Date(value) : null;
    return !date || Number.isNaN(date.getTime()) ? "" : `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };

  const ICON = {
    foreman: '<path d="M4 18v-1a6 6 0 0 1 12 0v1"/><path d="M5 11a5 5 0 0 1 10 0"/><path d="M3 11h14"/><circle cx="10" cy="14" r="0.01"/>',
    engineer: '<path d="M4 20l4-4"/><path d="M14.5 4.5l5 5-8 8H6.5v-5z"/>',
    dp: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    gate: '<path d="M4 20V6l7-3v17"/><path d="M11 9h9v11"/><path d="M15 14h1"/>',
    done: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/>'
  };
  const svg = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`;

  // ---------- Páginas ----------
  const pageFromHash = () => {
    const key = (location.hash || "").replace("#", "");
    return PAGES.includes(key) ? key : "overview";
  };
  // A barra Lixeira / Concluídas / Apagar tudo é uma só para as duas listas: vai para a página aberta.
  const toolbarHome = { parent: null, next: null };
  function placeToolbar(page) {
    const toolbar = $("#records-toolbar");
    const notice = $("#trash-notice");
    const collective = $("#collective-section");
    if (!toolbar) return;
    if (!toolbarHome.parent) { toolbarHome.parent = toolbar.parentElement; toolbarHome.next = notice?.nextElementSibling || null; }
    // Com a lixeira aberta, a barra fica junto da tabela da lixeira (senão não daria para sair dela).
    if (page === "coletivas" && collective && !window.portalIsTrashMode?.()) {
      const anchor = collective.querySelector(".card-heading");
      anchor?.after(toolbar);
      if (notice) toolbar.after(notice);
    } else if (toolbar.parentElement !== toolbarHome.parent) {
      toolbarHome.parent.insertBefore(toolbar, toolbarHome.next);
      if (notice) toolbar.after(notice);
    }
  }
  const syncTrash = () => {
    body.classList.toggle("dash-trash", !!window.portalIsTrashMode?.());
    placeToolbar(body.dataset.page);
  };
  // O portal redesenha a barra sempre que entra ou sai da lixeira/concluídas: aí a barra vai para o lugar certo.
  const toolbarEl = $("#records-toolbar");
  if (toolbarEl) new MutationObserver(() => syncTrash()).observe(toolbarEl, { childList: true });

  function showPage(page, { scroll = true } = {}) {
    body.dataset.page = page;
    syncTrash();
    document.querySelectorAll("[data-dash-page]").forEach((item) => {
      const active = item.dataset.dashPage === page;
      item.classList.toggle("is-active", active);
      if (active) item.setAttribute("aria-current", "page"); else item.removeAttribute("aria-current");
    });
    // Indicadores: a seção já aberta (os gráficos se redesenham ao abrir).
    const insights = $("#portal-insights");
    if (insights && page === "indicadores" && !insights.open) insights.open = true;
    if (scroll) window.scrollTo({ top: 0, behavior: "auto" });
    closeFab();
  }
  // Quantas trocas de página foram feitas aqui (para o "Voltar" saber se dá para voltar dentro do portal).
  let steps = 0;
  function go(page, status) {
    if (location.hash.replace("#", "") !== (page === "overview" ? "" : page)) {
      history.pushState(null, "", page === "overview" ? location.pathname + location.search : `#${page}`);
      steps += 1;
    }
    showPage(page);
    // Situação na barra de filtros das duas listas (só quando veio da esteira / "Para você agora": o menu não mexe
    // no filtro). Se o perfil não tiver essa opção, mostra tudo.
    const bar = window.portalFilterBar;
    if (status !== undefined && bar?.active()) bar.setStatusAll(status || "all");
  }
  window.addEventListener("popstate", () => { steps = Math.max(0, steps - 1); showPage(pageFromHash()); });
  // "Voltar": página anterior dentro do portal; se entrou direto num link (#individuais...), vai para a visão geral.
  $("#dash-back")?.addEventListener("click", () => {
    if (steps > 0) history.back();
    else go("overview");
  });
  window.addEventListener("hashchange", () => showPage(pageFromHash()));
  document.addEventListener("click", (event) => {
    const link = event.target.closest("[data-dash-page]");
    if (!link) return;
    event.preventDefault();
    go(link.dataset.dashPage);
  });
  // Links antigos dos atalhos (#foreman-summary, #activity-section, #records-section...) levam à página certa.
  const ANCHOR_PAGE = { "#foreman-summary": "equipe", "#activity-section": "overview", "#records-section": "individuais", "#collective-section": "coletivas", "#guidance-section": "equipe" };
  document.addEventListener("click", (event) => {
    const anchor = event.target.closest(Object.keys(ANCHOR_PAGE).map((href) => `a[href="${href}"]`).join(", "));
    if (!anchor) return;
    event.preventDefault();
    go(ANCHOR_PAGE[anchor.getAttribute("href")]);
    setTimeout(() => document.querySelector(anchor.getAttribute("href"))?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  });

  // ---------- Botão "+" (celular) ----------
  const fab = $("#dash-fab");
  const fabMenu = $("#dash-fab-menu");
  function closeFab() {
    if (!fab) return;
    fab.setAttribute("aria-expanded", "false");
    fabMenu.hidden = true;
  }
  fab?.addEventListener("click", (event) => {
    event.stopPropagation();
    const open = fab.getAttribute("aria-expanded") !== "true";
    fab.setAttribute("aria-expanded", String(open));
    fabMenu.hidden = !open;
    if (open) fabMenu.querySelector("a")?.focus();
  });
  document.addEventListener("click", (event) => { if (fabMenu && !fabMenu.hidden && !event.target.closest("#dash-fab-menu")) closeFab(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeFab(); });

  // ---------- Esteira do fluxo + Para você agora ----------
  // Situação usada pela barra de filtros de cada perfil (quando não existir, mostra a lista inteira).
  const STATUS_FOR = {
    dp: { engineer: "bonus", dp: "pending", toLaunch: "toLaunch" },
    engenheiro: { engineer: "pending" },
    portaria: { gate: "gate", exited: "exitedToday" },
    chief: { foreman: "refused", engineer: "bonus", exited: "exited" }
  };
  const roleKey = (profileKey) => (CHIEFS.includes(profileKey) ? "chief" : profileKey);
  const MINE = { chief: "foreman", engenheiro: "engineer", dp: "dp", portaria: "gate" };

  let lastProfile = "";
  function update({ profileKey, releases = [], sheets = [] }) {
    lastProfile = profileKey;
    const flow = window.portalReleaseFlow;
    const col = window.portalCollectiveSheet;
    const stageInd = (r) => flow.stageOf(r);
    const stageCol = (s) => col?.stageOf(s) || s.stage || "engineer";
    const live = (stage) => !["foreman", "closed"].includes(stage);
    const all = [
      ...releases.map((r) => ({ r, kind: "ind", stage: stageInd(r), people: 1 })),
      ...sheets.map((s) => ({ r: s, kind: "col", stage: stageCol(s), people: (s.participants || []).length }))
    ];
    const today = dayOf(Date.now());
    const count = (test) => all.filter(test);
    const groups = {
      foreman: count((x) => x.stage === "foreman"),
      engineer: count((x) => !x.r.bonusStatus && live(x.stage)),
      dp: count((x) => x.stage === "dp"),
      gate: count((x) => x.stage === "gate"),
      exited: count((x) => x.stage === "exited" && dayOf(x.r.exitConfirmedAt) === today)
    };
    const role = roleKey(profileKey);
    const statusFor = STATUS_FOR[role] || {};
    const people = (list) => list.reduce((sum, x) => sum + x.people, 0);
    const stations = [
      { key: "foreman", icon: "foreman", name: "Encarregado", sub: "recusadas, para ajustar", list: groups.foreman },
      { key: "engineer", icon: "engineer", name: "Engenheiro", sub: "aguardando o abono", list: groups.engineer },
      { key: "dp", icon: "dp", name: "DP", sub: "aguardando autorização", list: groups.dp },
      { key: "gate", icon: "gate", name: "Portaria", sub: `aguardando saída · ${plural(people(groups.gate), "pessoa", "pessoas")}`, list: groups.gate },
      { key: "exited", icon: "done", name: "Saíram hoje", sub: plural(people(groups.exited), "pessoa", "pessoas"), list: groups.exited, done: true }
    ];
    const flowEl = $("#dash-flow");
    if (flowEl) {
      flowEl.hidden = false;
      const mine = MINE[role];
      flowEl.querySelector("#dash-stations").innerHTML = stations.map((st) => {
        const n = st.list.length;
        const isMine = st.key === mine;
        return `<li class="dash-station${isMine ? " is-mine" : ""}${n ? "" : " is-zero"}${st.done ? " is-done" : ""}">
          <button type="button" class="dash-station-btn" data-flow="${st.key}" aria-label="${esc(`${st.name}: ${n}, ${st.sub}`)}">
            <span class="dash-station-dot">${svg(st.icon)}</span>
            <span class="dash-station-name">${esc(st.name)}${isMine ? '<span class="dash-mine-tag">Sua vez</span>' : ""}</span>
            <span class="dash-station-sub">${esc(st.sub)}</span>
            <span class="dash-num">${n}</span>
          </button></li>`;
      }).join("");
      flowEl.querySelector("#dash-flow-note").textContent = `${plural(all.filter((x) => live(x.stage) && x.stage !== "exited" && x.stage !== "registered").length, "liberação em andamento", "liberações em andamento")}`;
    }

    // Para você agora: o que esse perfil precisa fazer (até 3 itens)
    const items = [];
    const add = (list, title, note, page, status) => items.push({ n: list.length, title, note, page, status });
    if (role === "dp") {
      add(groups.dp, "aguardando sua autorização", "o engenheiro já assinou o abono", "individuais", statusFor.dp);
      add(count((x) => live(x.stage) && (x.kind === "ind" ? x.r.employeeSignature?.method !== "biometria" : (col?.signedCount(x.r) || 0) < x.people)), "com digital pendente", "o colaborador ainda não assinou com a digital", "individuais");
      add(count((x) => x.r.bonusStatus === "approved" && !x.r.abonoLaunchedAt), "abonos por lançar no RM", "abonados pelo engenheiro, sem o carimbo do DP", "individuais", statusFor.toLaunch);
    } else if (role === "engenheiro") {
      add(groups.engineer, "aguardando seu abono", "marque abonado ou não abonado", "individuais", statusFor.engineer);
      add(count((x) => x.stage === "engineer" && !x.r.bonusStatus && x.r.dpReturnReason), "devolvidas pelo DP", "o DP pediu para rever o abono", "individuais", statusFor.engineer);
    } else if (role === "portaria") {
      add(groups.gate, "aguardando saída", "confirme quando o colaborador passar", "individuais", statusFor.gate);
      add(count((x) => x.kind === "col" && x.stage === "gate" && (col?.exitedCount(x.r) || 0) > 0), "coletivas com saída pela metade", "ainda falta gente passar pela portaria", "coletivas", statusFor.gate);
    } else {
      add(groups.foreman, "recusadas para ajustar", "corrija e reenvie ao engenheiro", "individuais", statusFor.foreman);
      add(groups.engineer, "aguardando o engenheiro", "o abono ainda não foi decidido", "individuais", statusFor.engineer);
      add(groups.gate, "autorizadas, aguardando saída", "liberadas pelo DP", "individuais");
    }
    const nowEl = $("#dash-now");
    if (nowEl) {
      const pending = items.filter((item) => item.n > 0);
      nowEl.querySelector("#dash-now-list").innerHTML = pending.length
        ? pending.map((item, i) => `<li><button type="button" class="dash-now-item${i ? " is-calm" : ""}" data-now="${i}">
            <span class="dash-num">${item.n}</span>
            <span class="dash-now-text"><strong>${esc(item.title)}</strong><small>${esc(item.note)}</small></span>
            <span class="dash-now-go">${svg("chevron")}</span></button></li>`).join("")
        : `<li class="dash-now-empty">${svg("check")}Tudo em dia. Nada esperando por você agora.</li>`;
      nowEl._items = pending;
    }

    // Números no menu: o que espera pelo perfil em cada lista
    const mineKey = MINE[role];
    const badgeCount = (kind) => (groups[mineKey] || []).filter((x) => x.kind === kind).length;
    setBadge("individuais", badgeCount("ind"));
    setBadge("coletivas", badgeCount("col"));

    // Ações de nova liberação (a portaria não cria) e o link de Equipe (chefes de equipe e DP)
    const canCreate = !$("#primary-action")?.hidden && profileKey !== "portaria";
    if (fab) fab.hidden = !canCreate;
    const actions = $("#dash-nav-actions");
    if (actions) actions.hidden = !canCreate;
    document.querySelectorAll('[data-dash-page="equipe"]').forEach((item) => { item.hidden = profileKey === "portaria"; });
    const equipesItem = $("#dash-nav-equipes");
    if (equipesItem) equipesItem.hidden = profileKey === "portaria";
    // "Administração" no menu lateral: só para o Administrador Analista (mesma regra do menu de cima).
    const session = window.portalAuthDemo?.getSession();
    const adminItem = $("#dash-nav-admin");
    if (adminItem) adminItem.hidden = !(session?.roleValue === "administrador-analista" || session?.role === "Administrador Analista");
    // Abriu direto no BI Dados (#indicadores): a seção dos indicadores só existe depois dos dados; abre agora.
    const insights = $("#portal-insights");
    if (body.dataset.page === "indicadores" && insights && !insights.open) insights.open = true;
    // PowerPoint do mês no BI Dados: só no perfil do DP (usa todas as liberações da obra, como em Backup).
    const exportBox = $("#dash-export");
    if (exportBox) exportBox.hidden = profileKey !== "dp";
    if (profileKey === "portaria" && body.dataset.page === "equipe") go("overview");
  }
  function setBadge(page, n) {
    document.querySelectorAll(`[data-dash-page="${page}"] .dash-badge`).forEach((badge) => {
      badge.textContent = n > 99 ? "99+" : String(n);
      badge.hidden = !n;
    });
  }

  // Cartões do dia e "Aguardando <engenheiro>" na visão geral: o portal aplica o filtro (no clique dele) e aqui a
  // página vira Individuais, onde a lista está. Clicar de novo no cartão (tirando o filtro) não troca de página.
  document.addEventListener("click", (event) => {
    const card = event.target.closest(".portal-stats .stat-card[data-stat]:not([data-stat='team']), [data-engineer-filter]");
    if (!card || card.disabled || body.dataset.page !== "overview") return;
    setTimeout(() => {
      if (window.portalFilterBar?.sharedStatus()) go("individuais");
    }, 60);
  });

  // Cliques na esteira e no "Para você agora"
  document.addEventListener("click", (event) => {
    const station = event.target.closest("[data-flow]");
    if (station) {
      const key = station.dataset.flow;
      const status = (STATUS_FOR[roleKey(lastProfile)] || {})[key];
      go("individuais", status || "all");
      return;
    }
    const now = event.target.closest("[data-now]");
    if (now) {
      const item = $("#dash-now")?._items?.[Number(now.dataset.now)];
      if (item) go(item.page, item.status || "all");
    }
  });

  window.portalDashboard = Object.freeze({ update, go, showPage });
  showPage(pageFromHash(), { scroll: false });
})();
