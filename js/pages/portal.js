(async () => {
  await window.portalAuthDemo?.ready();
  const profiles = {
    encarregado: {
      title: "Painel do encarregado",
      description: "Acompanhe sua equipe e registre as liberações do dia.",
      eyebrow: "Minha equipe",
      tableTitle: "Minhas liberações",
      action: "Nova liberação individual",
      actionHref: "Liberacao.html",
      team: "0",
      pending: "0",
      approved: "0",
      bonus: "0",
      shortcuts: ["Nova liberação individual", "Nova liberação coletiva", "Consultar minha equipe", "Equipes e Excel", "Ver histórico"],
      shortcutHrefs: ["Liberacao.html", "Liberacao-Coletiva.html", "#foreman-summary", "Equipes.html", "#activity-section"]
    },
    // Analista: chefe de equipe como o encarregado, mais a importação do relatório do RM. Com acessos dados pelo
    // administrador, também abre os painéis do DP, do engenheiro e da segurança do trabalho.
    analista: {
      title: "Painel do analista",
      description: "Acompanhe sua equipe e registre as liberações do dia.",
      eyebrow: "Minha equipe",
      tableTitle: "Minhas liberações",
      action: "Nova liberação individual",
      actionHref: "Liberacao.html",
      team: "0",
      pending: "0",
      approved: "0",
      bonus: "0",
      shortcuts: ["Nova liberação individual", "Nova liberação coletiva", "Consultar minha equipe", "Equipes e Excel", "Importar relatório do RM", "Ver histórico"],
      shortcutHrefs: ["Liberacao.html", "Liberacao-Coletiva.html", "#foreman-summary", "Equipes.html", "Importar-Colaboradores.html", "#activity-section"]
    },
    estagiario_engenharia: {
      title: "Painel do estagiário de engenharia",
      description: "Acompanhe sua equipe e registre as liberações do dia.",
      eyebrow: "Minha equipe",
      tableTitle: "Minhas liberações",
      action: "Nova liberação individual",
      actionHref: "Liberacao.html",
      team: "0",
      pending: "0",
      approved: "0",
      bonus: "0",
      shortcuts: ["Nova liberação individual", "Nova liberação coletiva", "Consultar minha equipe", "Equipes e Excel", "Ver histórico"],
      shortcutHrefs: ["Liberacao.html", "Liberacao-Coletiva.html", "#foreman-summary", "Equipes.html", "#activity-section"]
    },
    seguranca_trabalho: {
      title: "Painel da segurança do trabalho",
      description: "Acompanhe sua equipe e registre as liberações do dia.",
      eyebrow: "Minha equipe",
      tableTitle: "Minhas liberações",
      action: "Nova liberação individual",
      actionHref: "Liberacao.html",
      team: "0",
      pending: "0",
      approved: "0",
      bonus: "0",
      shortcuts: ["Nova liberação individual", "Nova liberação coletiva", "Consultar minha equipe", "Equipes e Excel", "Ver histórico"],
      shortcutHrefs: ["Liberacao.html", "Liberacao-Coletiva.html", "#foreman-summary", "Equipes.html", "#activity-section"]
    },
    dp: {
      title: "Painel do Departamento Pessoal",
      description: "Confira as liberações, autorize saídas e organize os registros.",
      eyebrow: "Conferência do DP",
      tableTitle: "Liberações da obra",
      action: "Nova liberação individual",
      actionHref: "Liberacao.html",
      team: "0",
      pending: "0",
      approved: "0",
      bonus: "0",
      shortcuts: ["Conferir liberações", "Nova liberação individual", "Nova liberação coletiva", "Equipes e Excel", "Importar relatório do RM", "Fechamento mensal", "Backup e Excel", "Digitais dos colaboradores"],
      shortcutHrefs: ["#records-section", "Liberacao.html", "Liberacao-Coletiva.html", "Equipes.html", "Importar-Colaboradores.html", "Fechamento.html", "Backup.html", "Biometria.html"]
    },
    engenheiro: {
      title: "Painel do engenheiro responsável",
      description: "Você recebe as liberações primeiro: decida o abono ou recuse devolvendo ao encarregado.",
      eyebrow: "Assinaturas pendentes",
      tableTitle: "Liberações para análise",
      action: "Nova liberação individual",
      actionHref: "Liberacao.html",
      team: "0",
      pending: "0",
      approved: "0",
      bonus: "0",
      shortcuts: ["Assinar abono", "Nova liberação individual", "Nova liberação coletiva", "Equipes e Excel", "Histórico de assinaturas"],
      shortcutHrefs: ["#records-section", "Liberacao.html", "Liberacao-Coletiva.html", "Equipes.html", "#activity-section"]
    },
    portaria: {
      title: "Painel da portaria",
      description: "Consulte as autorizações registradas antes de liberar a saída.",
      eyebrow: "Consulta de hoje",
      tableTitle: "Autorizações do dia",
      action: "",
      actionHref: "",
      team: "—",
      pending: "0",
      approved: "0",
      bonus: "—",
      shortcuts: ["Consultar matrícula", "Ver histórico", "Orientações da portaria"],
      shortcutHrefs: ["#records-section", "#activity-section", "#guidance-section"]
    }
  };
  const adminSession = window.portalAuthDemo?.getSession();

  const elements = {
    adminSwitcher: document.querySelector("#admin-portal-switcher"),
    adminProfile: document.querySelector("#admin-profile-select"),
    title: document.querySelector("#portal-title"),
    description: document.querySelector("#portal-description"),
    eyebrow: document.querySelector("#table-eyebrow"),
    tableTitle: document.querySelector("#table-title"),
    primaryAction: document.querySelector("#primary-action"),
    secondaryAction: document.querySelector("#secondary-action"),
    collectiveAction: document.querySelector("#collective-action"),
    shortcutTitle: document.querySelector("#shortcut-title"),
    shortcutList: document.querySelector("#shortcut-list"),
    table: document.querySelector("#records-table"),
    recordsSearch: document.querySelector("#records-search"),
    team: document.querySelector("#stat-team"),
    pending: document.querySelector("#stat-pending"),
    approved: document.querySelector("#stat-approved"),
    bonus: document.querySelector("#stat-bonus"),
    launched: document.querySelector("#stat-launched"),
    launchedNote: document.querySelector("#stat-launched-note"),
    launchedProgress: document.querySelector("#stat-launched-progress"),
    launchedBar: document.querySelector("#stat-launched-bar"),
    statCards: [...document.querySelectorAll(".portal-stats .stat-card")],
    activity: document.querySelector("#activity-list"),
    foremanSummary: document.querySelector("#foreman-summary"),
    foremanName: document.querySelector("#foreman-name"),
    foremanSpecialty: document.querySelector("#foreman-specialty"),
    foremanTeamCount: document.querySelector("#foreman-team-count"),
    foremanTeamList: document.querySelector("#foreman-team-list")
  };

  const specialtyLabels = {
    geral: "Encarregado Geral",
    producao: "Encarregado de Produção",
    "infraestrutura-terraplenagem": "Encarregado de Infraestrutura / Terraplenagem",
    eletrica: "Encarregado de Elétrica",
    hidraulica: "Encarregado de Hidráulica",
    "alvenaria-estrutural": "Encarregado de Alvenaria Estrutural",
    "formas-carpintaria": "Encarregado de Formas / Carpintaria",
    "armacao-ferragem": "Encarregado de Armação / Ferragem",
    concretagem: "Encarregado de Concretagem",
    "acabamento-revestimento": "Encarregado de Acabamento / Revestimento",
    "logistica-almoxarifado": "Encarregado de Logística / Almoxarifado"
  };

  const foremanRoleValues = ["encarregado", "estagiario_engenharia", "analista", "seguranca_trabalho"];
  // Perfis que trabalham na equipe do encarregado a quem estão vinculados. O analista não: ele é chefe da própria equipe.
  const linkedRoleValues = ["estagiario_engenharia"];

  function renderForemanSummary(profileKey, employees) {
    const session = window.portalAuthDemo?.getSession();
    const isForeman = foremanRoleValues.includes(profileKey);
    elements.foremanSummary.hidden = !isForeman;
    if (!isForeman) return;

    const isActingForeman = foremanRoleValues.includes(session?.roleValue);
    const name = isActingForeman && session.name
      ? session.name
      : session?.name || "Encarregado";
    const specialty = session?.roleValue === "encarregado"
      ? specialtyLabels[session.especialidade] || "área não informada"
      : session?.roleValue === "estagiario_engenharia"
        ? (session.linkedForeman ? `Estagiário de Engenharia · vinculado a ${session.linkedForeman}` : "Estagiário de Engenharia · escolha seu encarregado em Equipes e Excel")
        : session?.roleValue === "analista"
          ? "Analista · chefe de equipe"
        : session?.roleValue === "seguranca_trabalho"
          ? "Segurança do trabalho"
          : "selecione um cadastro de encarregado para visualizar";
    // O estagiário cuida da equipe do encarregado a quem está vinculado (além de uma equipe que tenha no próprio nome).
    const teamOwners = [session?.name, linkedRoleValues.includes(session?.roleValue) ? session?.linkedForeman : ""]
      .map((name) => String(name || "").trim().toLowerCase()).filter(Boolean);
    const team = isActingForeman
      ? employees.filter((employee) => teamOwners.includes(employee.encarregado?.trim().toLowerCase()))
      : [];

    elements.foremanName.textContent = name;
    elements.foremanSpecialty.textContent = specialty;
    elements.foremanTeamCount.textContent = `${team.length} ${team.length === 1 ? "colaborador" : "colaboradores"}`;
    elements.foremanTeamList.innerHTML = team.length
      ? team.map((employee) => `<li><a href="Liberacao.html?employee=${encodeURIComponent(employee.matricula)}" title="Criar liberação para ${escapeHtml(employee.nome)}"><strong>${escapeHtml(employee.nome)}</strong><small>${escapeHtml(employee.funcao)} · Matrícula ${escapeHtml(employee.matricula)}</small></a></li>`).join("")
      : "<li>Nenhum colaborador vinculado a este encarregado.</li>";
  }

  // Resumo visual das assinaturas já feitas (engenheiro, DP, portaria) para dar para ler a situação de relance.
  // Engenheiro responsável na linha da liberação (no lugar do antigo "Equipe local"): quem assinou o abono; antes
  // disso, o engenheiro para quem foi enviada ou "todos os engenheiros".
  const engineerLabel = (release) => String(release.engineer || release.targetEngineer || "").trim() || "todos os engenheiros";

  function signatureChips(release, stage) {
    const short = (name) => escapeHtml(String(name || "").trim());
    const chip = (tone, html, hint) => `<span class="sig-chip sig-${tone}"${hint ? ` title="${escapeHtml(hint)}"` : ""}>${html}</span>`;
    const chips = [];
    if (stage === "foreman") {
      chips.push(chip("no", `Recusada por <b>${short(release.refusedBy)}</b>${release.refusalReason ? ` · ${escapeHtml(release.refusalReason)}` : ""}`));
    } else {
      // Pedido do encarregado (o que ele marcou no formulário) aparece sempre que existir, mesmo depois de
      // o engenheiro decidir, para dar para comparar o que foi pedido com o que foi assinado.
      if (release.bonusRequest) {
        chips.push(chip("info", `Pedido do encarregado: <b>${release.bonusRequest === "abonado" ? "Abonado" : "Não abonado"}</b>`));
      }
      // Devolvida pelo DP: o engenheiro vê o motivo e o que tinha marcado, até decidir de novo.
      if (stage === "engineer" && !release.bonusStatus && release.dpReturnReason) {
        const prev = release.dpReturnPrevBonus === "approved" ? " · estava abonado" : release.dpReturnPrevBonus === "denied" ? " · estava não abonado" : "";
        chips.push(chip("no", `Devolvida pelo DP <b>${short(release.dpReturnBy)}</b>: ${escapeHtml(release.dpReturnReason)}${prev}`));
      }
      if (release.engineer && release.bonusStatus) {
        chips.push(chip(release.bonusStatus === "approved" ? "yes" : "no", `Eng. <b>${short(release.engineer)}</b> · ${release.bonusStatus === "approved" ? "assinou como abonado" : "assinou como não abonado"}`));
      } else {
        // Mostra para qual engenheiro foi enviada (como na coletiva); sem destino, foi para todos.
        chips.push(chip("wait", `Engenheiro: aguardando${release.targetEngineer ? ` (${short(release.targetEngineer)})` : ""}`));
      }
    }
    if (stage !== "foreman") {
      if (release.dpSigner) {
        chips.push(chip(stage === "closed" ? "no" : "yes", `DP <b>${short(release.dpSigner)}</b> · ${stage === "closed" ? "negou" : "assinou"}`));
      } else if (window.portalReleaseFlow.isRetroactive(release)) {
        // Data anterior ao dia em que foi criada: o colaborador já saiu, não há saída para autorizar nem confirmar.
        chips.push(chip("info", "Retroativa · sem autorização de saída nem portaria", "A data da liberação é anterior ao dia em que ela foi criada, ou entrada e saída foram marcadas juntas (o colaborador não bateu o ponto). Depois do engenheiro, ela já fica registrada; o DP só lança o abono no RM."));
      } else {
        chips.push(chip("wait", stage === "engineer" ? "DP: aguardando o engenheiro assinar" : "DP: aguardando"));
      }
      if (release.exitConfirmedBy) {
        chips.push(chip("info", `Portaria <b>${short(release.exitConfirmedBy)}</b> · assinou`));
      } else if (stage === "gate") {
        chips.push(chip("wait", "Portaria: aguardando saída"));
      }
      // Digital do colaborador (como o "Digitais: X de Y" da coletiva): o DP sempre vê; os outros, só depois de assinada.
      if (release.employeeSignature?.method === "biometria") chips.push(chip("yes", `Colaborador <b>${short(release.employeeSignature.nome || release.name)}</b> · assinou por digital`));
      else if (activeProfileKey === "dp" && stage !== "closed") chips.push(chip("wait", "Digital do colaborador: aguardando", "O colaborador assina com a digital no DP, inclusive depois que a portaria confirmou a saída."));
    }
    return `<div class="sig-chips">${chips.join("")}</div>`;
  }

  // Botões de ação de cada liberação, conforme o perfil aberto (tudo na tela inicial).
  function actionsFor(profile, release, stage) {
    const actions = window.portalReleaseActions;
    const id = escapeHtml(release.id);
    const btn = (cls, action, label) => `<button class="${cls}" type="button" data-row-action="${action}" data-release-id="${id}">${label}</button>`;
    const view = btn("release-view-btn", "view", "Visualizar liberação");
    const del = btn("row-delete-btn", "delete", "Apagar");
    if (profile === "portaria") {
      return `${stage === "gate" && actions.canConfirmExit() ? btn("gate-confirm-btn", "confirm-exit", "Confirmar saída") : ""}${view}${del}`;
    }
    if (profile === "engenheiro") {
      const decide = actions.engineerCanAct(release)
        ? `${btn("row-yes-btn", "approved", release.bonusStatus === "approved" ? "Abonado ✓" : "Abonado")}${btn("row-no-btn", "denied", release.bonusStatus === "denied" ? "Não abonado ✓" : "Não abonado")}`
        : "";
      // Recusar vale mesmo depois de o DP autorizar a saída.
      const refuse = actions.engineerCanRefuse(release) ? btn("row-no-btn", "refuse", "Recusar") : "";
      return `${decide}${refuse}${view}${del}`;
    }
    if (profile === "dp") {
      const sign = actions.canSignBiometric(release) ? btn("row-bio-btn", "sign-bio", "Assinar com digital") : "";
      const decide = actions.dpCanDecide(release) ? `${btn("row-yes-btn", "authorize", "Autorizar saída")}${btn("row-no-btn", "dp-refuse", "Recusar")}` : "";
      // O lançamento do abono no RM é feito só na folha de liberação ("Visualizar liberação").
      return `${sign}${decide}${view}${del}`;
    }
    // Encarregado / estagiário: só edita e reenvia quando o engenheiro recusou. "Apagar" só some do histórico dele.
    const edit = stage === "foreman" ? `<a class="table-action" href="Liberacao.html?edit=${encodeURIComponent(release.id)}">Editar e reenviar</a>` : "";
    return `${view}${edit}${del}`;
  }

  // Lixeira: cada usuário tem a sua. "Apagar" manda para ela; de lá restaura ou apaga de vez.
  let trashMode = false;
  window.portalIsTrashMode = () => trashMode;
  // Caixa "Concluídas": as liberações com todas as assinaturas (portalReleaseFlow.isConcluded), fora das pendências.
  let doneMode = false;
  window.portalIsDoneMode = () => doneMode;
  // Últimos números da barra, para a barra recalcular quando as liberações coletivas terminarem de carregar.
  let lastToolbarCounts = [0, 0, 0];
  window.portalToolbarRefresh = () => renderToolbar(...lastToolbarCounts);
  let shownReleases = [];

  // Cartões do resumo: a mesma regra conta o número e, ao clicar no cartão, filtra a tabela.
  const statLabels = { pending: "Liberações pendentes", approved: "Autorizadas hoje", bonus: "Pendências de abono", launched: "Abonos lançados no RM" };
  let statFilter = null;
  const localDay = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };
  function statRules(profileKey) {
    const stageOf = window.portalReleaseFlow.stageOf;
    const today = localDay(Date.now());
    // "Pendências de abono · aguardando engenheiro": liberações em andamento cujo abono o engenheiro ainda não decidiu.
    const awaitingBonus = (release) => !release.bonusStatus && !["foreman", "closed"].includes(stageOf(release));
    const pendingStages = { dp: ["dp"], portaria: [] }[profileKey] || ["engineer", "foreman", "dp"];
    return {
      // Engenheiro: conta pelo abono ainda nao decidido, nao só pelo estágio — o DP pode
      // autorizar a saída antes dele decidir, então a pendência dele continua existindo
      // mesmo quando a liberação já passou para "dp"/"gate"/"exited".
      pending: profileKey === "engenheiro" ? awaitingBonus : (release) => pendingStages.includes(stageOf(release)),
      // "Autorizadas hoje": só as que o DP autorizou hoje (data local), não todas as já autorizadas.
      approved: (release) => ["gate", "exited"].includes(stageOf(release))
        && (release.dpDecisionAt ? localDay(release.dpDecisionAt) : release.date) === today,
      bonus: awaitingBonus,
      launched: (release) => !!release.abonoLaunchedAt,
      toLaunch: (release) => release.bonusStatus === "approved" && !release.abonoLaunchedAt
    };
  }

  // Liberações da última vez que a tela foi desenhada: o clique age na hora com elas, sem esperar o servidor.
  let releaseById = new Map();

  function renderToolbar(individualVisible, individualTrash, individualDone = lastToolbarCounts[2]) {
    lastToolbarCounts = [individualVisible, individualTrash, individualDone];
    // A barra é uma só: conta também as liberações coletivas.
    const collective = window.portalCollectivePanel?.counts?.() || { visible: 0, trash: 0, done: 0 };
    const visibleCount = individualVisible + collective.visible;
    const trashCount = individualTrash + collective.trash;
    const doneCount = individualDone + (collective.done || 0);
    const canHard = window.portalReleaseActions.canHardDelete(activeProfileKey === "dp");
    const notice = document.querySelector("#trash-notice");
    const toolbar = document.querySelector("#records-toolbar");
    if (doneMode) {
      toolbar.innerHTML = `
        <button class="toolbar-btn" type="button" data-toolbar="back">← Voltar às pendências</button>
        <span class="toolbar-count">✅ ${doneCount} ${doneCount === 1 ? "concluída" : "concluídas"}</span>`;
      notice.hidden = false;
      notice.className = "trash-notice done-notice";
      notice.innerHTML = "<strong>Concluídas:</strong> engenheiro, DP e portaria assinaram (na retroativa, só o engenheiro), o colaborador assinou com a digital e, se abonada, o abono já foi lançado no RM. Não há mais pendência nelas; continuam contando nos cartões e relatórios.";
      return;
    }
    if (trashMode) {
      toolbar.innerHTML = `
        <button class="toolbar-btn" type="button" data-toolbar="back">← Voltar às liberações</button>
        <button class="toolbar-btn" type="button" data-toolbar="restore-all" ${trashCount ? "" : "disabled"}>Restaurar tudo</button>
        <button class="toolbar-btn toolbar-danger" type="button" data-toolbar="empty" ${trashCount ? "" : "disabled"}>${canHard ? "Esvaziar lixeira (apaga do banco)" : "Esvaziar lixeira"}</button>`;
      notice.hidden = false;
      notice.className = `trash-notice ${canHard ? "trash-notice-danger" : ""}`;
      notice.innerHTML = canHard
        ? "<strong>⚠ Atenção:</strong> para o DP e o Administrador, apagar da lixeira <strong>APAGA DO BANCO DE DADOS</strong>, para <strong>todos os perfis</strong>, e <strong>não tem como recuperar</strong>. Se só quer limpar a tela, deixe na lixeira."
        : "Estas liberações saíram da sua tela inicial. Restaure para trazer de volta, ou apague de vez para sumir só do <strong>seu</strong> histórico (o DP continua vendo).";
    } else {
      toolbar.innerHTML = `
        <button class="toolbar-btn" type="button" data-toolbar="open-trash">🗑 Lixeira${trashCount ? ` (${trashCount})` : ""}</button>
        <button class="toolbar-btn toolbar-done" type="button" data-toolbar="open-done" title="Liberações com todas as assinaturas, fora das pendências">✅ Concluídas${doneCount ? ` (${doneCount})` : ""}</button>
        <button class="toolbar-btn toolbar-danger" type="button" data-toolbar="trash-all" ${visibleCount ? "" : "disabled"}>Apagar tudo (mover para a lixeira)</button>
        ${statFilter ? `<button class="stat-filter-chip" type="button" data-toolbar="clear-stat" title="Mostrar todas as liberações">Filtro: ${statLabels[statFilter]} ✕</button>` : ""}`;
      notice.hidden = true;
    }
  }

  // "Criada 05/10/2026 · 10:44": quando a liberação foi enviada (o engenheiro abona pela ordem de chegada).
  function createdLabel(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return "";
    const day = date.toLocaleDateString("pt-BR");
    const hour = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return `<small class="row-created" title="Criada em ${day} às ${hour}">Criada ${day} · ${hour}</small>`;
  }
  window.portalCreatedLabel = createdLabel;

  // Paginação da lista (10/25/50/100 por página). Fora da lixeira; na lixeira a lista é curta e mostra tudo.
  let recordsPager = null;
  const pager = () => recordsPager || (recordsPager = window.portalPagination.create({
    key: "individuais",
    after: elements.table.closest(".table-responsive"),
    search: elements.recordsSearch,
    onChange: () => renderRecords(activeProfileKey)
  }));

  async function renderRecords(profile, prefetched) {
    // Engenheiro: por padrão, pendentes de abono primeiro (a mais recente no topo). Os outros perfis: mais recentes.
    window.portalSortFilter.setDefault(elements.recordsSearch, profile === "engenheiro" ? "unbonusedRecent" : "recent");
    const session = window.portalAuthDemo?.getSession();
    const actions = window.portalReleaseActions;
    const allReleases = prefetched || await window.portalDemoStore?.getReleases() || [];
    releaseById = new Map(allReleases.map((release) => [release.id, release]));
    const trashed = actions.trashFor(allReleases);
    const releases = actions.visibleFor(allReleases);
    const flow = window.portalReleaseFlow;
    const query = window.normalizeSearchText(elements.recordsSearch?.value || "");
    // Busca por texto + filtro por data (De/Até ao lado da busca).
    const matchesText = (release) => !query || window.normalizeSearchText(`${release.name} ${release.team} ${release.engineer || ""} ${release.targetEngineer || ""}`).includes(query);
    const matchesDate = (release) => window.portalDateFilter.matches(elements.recordsSearch, window.portalDateFilter.dayOf(release));
    const matches = (release) => matchesText(release) && matchesDate(release);
    // Barra de filtros do perfil (js/core/filter-bar.js): a Situação dela faz o papel do cartão clicado.
    const filterBar = window.portalFilterBar?.active() ? window.portalFilterBar : null;
    const filtering = !!query || !window.portalDateFilter.matches(elements.recordsSearch, "")
      || (filterBar && filterBar.status(elements.recordsSearch) !== "all");

    if (trashMode) {
      pager().hide();
      const rows = window.portalSortFilter.sort(trashed.filter(matches), elements.recordsSearch);
      shownReleases = rows;
      renderToolbar(releases.length, trashed.length);
      elements.table.innerHTML = rows.length ? rows.map((release) => {
        const stage = flow.stageOf(release);
        return `
      <tr>
        <td data-label="Colaborador" class="col-who"><strong>${escapeHtml(release.name)}</strong><small class="row-role">${escapeHtml(release.role || "Função não informada")}</small><small class="row-who">Solicitante: ${escapeHtml(release.requester)}</small><small class="row-meta">Eng. ${escapeHtml(engineerLabel(release))}${release.time ? ` · ${escapeHtml(release.time)}` : ""}</small>${createdLabel(release.createdAt || release.requestedAt)}${signatureChips(release, stage)}</td>
        <td data-label="Engenheiro" class="col-frente">${escapeHtml(engineerLabel(release))}</td>
        <td data-label="Horário" class="col-horario">${escapeHtml(release.time)}</td>
        <td data-label="Status" class="col-status"><span class="status-badge status-${flow.stages[stage].tone}">${flow.stages[stage].label}</span></td>
        <td class="text-end row-actions col-actions" data-label="Ação">
          <button class="row-yes-btn" type="button" data-row-action="restore" data-release-id="${escapeHtml(release.id)}">Restaurar</button>
          <button class="release-view-btn" type="button" data-row-action="view" data-release-id="${escapeHtml(release.id)}">Visualizar liberação</button>
          <button class="row-delete-btn" type="button" data-row-action="purge" data-release-id="${escapeHtml(release.id)}">${actions.canHardDelete(activeProfileKey === "dp") ? "Apagar do banco" : "Apagar de vez"}</button>
        </td>
      </tr>`;
      }).join("") : `<tr><td colspan="5" class="empty-state">${filtering ? "Nenhum registro encontrado para os filtros." : "A lixeira está vazia."}</td></tr>`;
      window.portalCollectivePanel?.injectTrashRows?.();
      return;
    }

    // Perfil de encarregado/estagiário/segurança (inclusive quando o administrador o abre para testar):
    // só o que a própria pessoa logada solicitou.
    const profileReleases = foremanRoleValues.includes(profile)
      ? releases.filter((release) => release.requester?.trim().toLowerCase() === session.name?.trim().toLowerCase())
      : releases;
    // Ordem: sempre por data de criação, mais recente primeiro (já vem assim do banco), igual para
    // todos os perfis — nada de agrupar "o que precisa de ação" antes, senão uma liberação recente já
    // decidida parece "sumir" atrás de uma antiga ainda pendente.
    let rows = profileReleases.map((release) => ({ release, stage: flow.stageOf(release) }));
    // Portaria: só o que o DP autorizou.
    if (profile === "portaria") rows = rows.filter((row) => row.stage === "gate" || row.stage === "exited");
    // Concluídas (todas as assinaturas e, se abonada, lançada no RM) saem da lista e vão para a caixa "Concluídas".
    // Com um cartão/Situação escolhido, a lista mostra tudo o que entra no número do cartão, inclusive as concluídas.
    const concluded = (row) => flow.isConcluded(row.release);
    const doneCount = rows.filter(concluded).length;
    const byStatus = filterBar ? filterBar.status(elements.recordsSearch) !== "all" : !!statFilter;
    if (doneMode) rows = rows.filter(concluded);
    else if (!byStatus) rows = rows.filter((row) => !concluded(row));
    // Cartão do resumo clicado (ou Situação da barra): só as liberações que entram naquele número.
    if (filterBar) {
      rows = rows.filter((row) => filterBar.matchesStatus(elements.recordsSearch, row.release, row.stage));
    } else if (statFilter) {
      const rule = statRules(profile)[statFilter];
      rows = rows.filter((row) => rule(row.release));
    }
    const visible = window.portalSortFilter.sort(rows.filter((row) => matches(row.release)), elements.recordsSearch, {
      createdAt: (row) => String(row.release.createdAt || row.release.date || ""),
      stage: (row) => row.stage,
      name: (row) => row.release.name || "",
      bonus: (row) => row.release.bonusStatus || ""
    });
    // "Apagar tudo" e os números da barra valem para a lista inteira filtrada, não só para a página.
    shownReleases = visible.map((row) => row.release);
    renderToolbar(visible.length, trashed.length, doneCount);
    const pageRows = pager().slice(visible);
    elements.table.innerHTML = pageRows.length ? pageRows.map(({ release, stage }) => `
      <tr>
        <td data-label="Colaborador" class="col-who"><strong>${escapeHtml(release.name)}</strong><small class="row-role">${escapeHtml(release.role || "Função não informada")}</small><small class="row-who">Solicitante: ${escapeHtml(release.requester)}</small><small class="row-meta">Eng. ${escapeHtml(engineerLabel(release))}${release.time ? ` · ${escapeHtml(release.time)}` : ""}</small>${createdLabel(release.createdAt || release.requestedAt)}${signatureChips(release, stage)}</td>
        <td data-label="Engenheiro" class="col-frente">${escapeHtml(engineerLabel(release))}</td>
        <td data-label="Horário" class="col-horario">${escapeHtml(release.time)}</td>
        <td data-label="Status" class="col-status"><span class="status-badge status-${flow.stages[stage].tone}">${flow.stages[stage].label}</span>${release.abonoLaunchedAt ? '<small class="row-launched">Abono lançado no RM</small>' : ""}${!doneMode && flow.isConcluded(release) ? '<small class="row-concluded">✓ Concluída</small>' : ""}</td>
        <td class="text-end row-actions col-actions" data-label="Ação">${actionsFor(profile, release, stage)}</td>
      </tr>
    `).join("") : `<tr><td colspan="5" class="empty-state">${filtering || statFilter ? "Nenhum registro encontrado para os filtros." : doneMode ? "Nenhuma liberação concluída ainda." : "Nenhuma pendência: tudo o que foi concluído está em ✅ Concluídas."}</td></tr>`;
  }

  // Clique nos cartões do resumo: "Equipe vinculada" abre a equipe; os outros filtram a tabela (clicar de novo tira o filtro).
  // Cartão "Aguardando <engenheiro>": escolhe a mesma opção na Situação das duas listas (clicar de novo tira).
  document.querySelector("#engineer-stats")?.addEventListener("click", async (event) => {
    const card = event.target.closest("[data-engineer-filter]");
    const filterBar = window.portalFilterBar;
    if (!card || card.disabled || !filterBar?.active()) return;
    const value = card.dataset.engineerFilter;
    const next = filterBar.sharedStatus() === value ? "all" : value;
    if (trashMode || doneMode) {
      trashMode = false;
      doneMode = false;
      await renderRecords(activeProfileKey);
    }
    filterBar.setStatusAll(next);
    if (next !== "all") document.querySelector("#records-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  document.querySelector(".portal-stats").addEventListener("click", async (event) => {
    const card = event.target.closest(".stat-card");
    if (!card || card.disabled || !activeProfileKey) return;
    const key = card.dataset.stat;
    if (key === "team") {
      if (foremanRoleValues.includes(activeProfileKey)) document.querySelector("#foreman-summary")?.scrollIntoView({ behavior: "smooth", block: "start" });
      else window.location.href = "Equipes.html";
      return;
    }
    // Perfil com barra de filtros: o cartão escolhe a Situação nas duas listas (individual e coletiva), cada uma na sua barra.
    const filterBar = window.portalFilterBar;
    if (filterBar?.active()) {
      const next = filterBar.sharedStatus() === (filterBar.aliases()[key] || key) ? "all" : key;
      // Sai da lixeira/concluídas: o cartão filtra a lista principal.
      if (trashMode || doneMode) {
        trashMode = false;
        doneMode = false;
        await renderRecords(activeProfileKey);
      }
      filterBar.setStatusAll(next);
      if (next !== "all") document.querySelector("#records-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    statFilter = statFilter === key ? null : key;
    trashMode = false;
    doneMode = false;
    pager().reset();
    // Na tela estreita, volta para a aba das individuais, onde o filtro aparece.
    const individualTab = document.querySelector("#tab-individual");
    if (statFilter && !document.querySelector("#portal-view-tabs")?.hidden && !individualTab?.classList.contains("is-active")) individualTab?.click();
    await renderProfile(activeProfileKey);
    if (statFilter) document.querySelector("#records-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // Botões da barra (Lixeira, Apagar tudo, Restaurar tudo, Esvaziar lixeira).
  document.querySelector("#records-toolbar").addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-toolbar]");
    if (!button || button.disabled) return;
    const actions = window.portalReleaseActions;
    const refresh = () => renderProfile(activeProfileKey);
    const kind = button.dataset.toolbar;
    if (kind === "clear-stat") {
      statFilter = null;
      pager().reset();
      return refresh();
    }
    if (kind === "open-trash" || kind === "open-done" || kind === "back") {
      trashMode = kind === "open-trash";
      doneMode = kind === "open-done";
      pager().reset();
      await renderRecords(activeProfileKey);
      window.portalCollectivePanel?.render(activeProfileKey);
      return;
    }
    // Uma só lixeira: as liberações coletivas da lista entram junto nas ações em lote.
    const collectiveCount = window.portalCollectivePanel?.items?.().length || 0;
    if (!shownReleases.length && !collectiveCount) return;
    const list = [...shownReleases];
    const total = list.length + collectiveCount;
    const dpContext = activeProfileKey === "dp";
    if (kind === "trash-all" && !await actions.confirmText(actions.trashAllQuestion(total))) return;
    if (kind === "restore-all" && !await actions.confirmText(actions.restoreAllQuestion(total))) return;
    if (kind === "empty") {
      if (!await actions.confirmText(actions.emptyQuestion(total, null, dpContext))) return;
      // Apagar do banco (DP/Admin) pede uma segunda confirmação: não tem volta.
      if (actions.canHardDelete(dpContext) && !await actions.confirmText("ÚLTIMO AVISO\n" + total + " liberação(ões) serão APAGADAS DO BANCO DE DADOS agora.\nIsso NÃO pode ser desfeito.", "Apagar do banco")) return;
    }
    const toolbarButtons = [...document.querySelectorAll("#records-toolbar button")];
    toolbarButtons.forEach((item) => { item.disabled = true; });
    const label = button.textContent;
    button.textContent = "Salvando…";
    try {
      if (kind === "trash-all") await actions.trashMany(list);
      else if (kind === "restore-all") await actions.restoreMany(list);
      else if (kind === "empty") await actions.emptyTrashMany(list, dpContext);
      await window.portalCollectivePanel?.bulk(kind, dpContext);
    } catch (error) {
      console.error("Não foi possível concluir a ação na lista.", error);
      await actions.ask({ title: "Não foi possível salvar", message: "Verifique a internet e tente de novo.", okText: "OK", cancelText: null });
    } finally {
      button.textContent = label;
      toolbarButtons.forEach((item) => { item.disabled = false; });
    }
    return refresh();
  });

  // Enquanto uma ação é gravada, os botões da linha ficam desativados e o clicado mostra "Salvando…".
  // Sempre destrava no final, mesmo com erro.
  // Cliques numa mesma liberação entram numa fila e são feitos um depois do outro, cada um com o estado mais
  // novo (nenhum clique se perde, mesmo com internet lenta). Só o toque duplo acidental no MESMO botão, em
  // menos de 0,8 s, é ignorado.
  const releaseQueues = new Map();
  let lastTap = { key: "", at: 0 };
  function isDoubleTap(key) {
    const now = Date.now();
    const repeated = lastTap.key === key && now - lastTap.at < 800;
    lastTap = { key, at: now };
    return repeated;
  }
  function enqueue(id, task) {
    const previous = releaseQueues.get(id) || Promise.resolve();
    const current = previous.catch(() => {}).then(task);
    releaseQueues.set(id, current);
    current.finally(() => { if (releaseQueues.get(id) === current) releaseQueues.delete(id); });
    return current;
  }
  function setRowBusy(button, on) {
    button.closest("tr")?.querySelectorAll("button").forEach((item) => { item.disabled = on; });
    if (on) {
      if (button.textContent !== "Salvando…") button.dataset.label = button.textContent;
      button.textContent = "Salvando…";
    } else if (button.dataset.label) {
      button.textContent = button.dataset.label;
    }
  }

  // Todas as ações da tabela passam por aqui.
  elements.table.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-row-action]");
    if (!button || button.disabled) return;
    const id = button.dataset.releaseId;
    const action = button.dataset.rowAction;
    if (isDoubleTap(`${id}:${action}`)) return;
    if (action !== "view" && button.textContent !== "Salvando…") {
      button.dataset.label = button.textContent;
      button.textContent = "Salvando…";
    }
    return enqueue(id, () => handleRowAction(button, id, action));
  });

  async function handleRowAction(button, id, action) {
    const actions = window.portalReleaseActions;
    const flow = window.portalReleaseFlow;
    const refresh = () => renderProfile(activeProfileKey);
    // A tela pode ter sido redesenhada enquanto esperava na fila: usa a liberação mais nova.
    try {
      const release = releaseById.get(id)
        || (await window.portalDemoStore?.getReleases() || []).find((item) => item.id === id);
      if (!release) return refresh();
      if (action === "view") {
        window.portalReleasePreview.show(release, { dpContext: activeProfileKey === "dp" });
        return;
      }

      // 1) Perguntas e permissões (antes de travar os botões).
      const dpContext = activeProfileKey === "dp";
      let run = null;
      if (action === "delete") {
        if (!await actions.confirmText(actions.trashQuestion(release), "Mover para a lixeira")) return;
        run = () => actions.trashRelease(release);
      } else if (action === "restore") {
        run = () => actions.restoreRelease(release);
      } else if (action === "purge") {
        if (!await actions.confirmText(actions.emptyQuestion(1, release, dpContext), "Apagar")) return;
        run = () => actions.emptyTrashItem(release, dpContext);
      } else if (action === "confirm-exit") {
        if (flow.stageOf(release) !== "gate") return refresh();
        if (!await actions.confirmText(`Confirmar a saída de ${release.name}?`)) return;
        run = () => actions.confirmExit(release);
      } else if (action === "sign-bio") {
        if (!actions.canSignBiometric(release)) return refresh();
        run = () => actions.signBiometric(release);
      } else if (action === "authorize") {
        if (!actions.dpCanDecide(release)) return refresh();
        run = () => actions.dpDecide(release, true);
      } else if (action === "dp-refuse") {
        // DP recusa devolvendo ao engenheiro, com o motivo escrito, para ele refazer o abonado / não abonado.
        if (!actions.dpCanDecide(release)) return refresh();
        actions.openDpReturnDialog(release, refresh, {
          target: `${release.name} · Eng. ${release.engineer || "—"} marcou ${release.bonusStatus === "approved" ? "abonado" : release.bonusStatus === "denied" ? "não abonado" : "—"}`,
          save: (text) => actions.dpRefuse(release, [text])
        });
        return;
      } else {
        // Engenheiro: abonar, não abonar ou recusar (exige a assinatura do engenheiro)
        if (action === "refuse" ? !actions.engineerCanRefuse(release) : !actions.engineerCanAct(release)) return refresh();
        if (!await actions.ensureEngineerSignature()) return;
        if (action === "refuse") {
          actions.openRefuseDialog(release, refresh);
          return;
        }
        run = () => actions.engineerToggleDecision(release, action);
      }

      // 2) Grava com os botões da linha travados e "Salvando…" no clicado.
      setRowBusy(button, true);
      try {
        await run();
      } catch (error) {
        console.error("Não foi possível salvar a ação na liberação.", error);
        await actions.ask({ title: "Não foi possível salvar", message: `${release.name}\nVerifique a internet e tente de novo.`, okText: "OK", cancelText: null });
      } finally {
        setRowBusy(button, false);
      }
      return refresh();
    } finally {
      // Clique cancelado (pergunta respondida com "Cancelar"): devolve o texto do botão.
      if (button.isConnected && button.textContent === "Salvando…" && !button.disabled) {
        button.textContent = button.dataset.label || button.textContent;
        refresh();
      }
    }
  }

  let activeProfileKey = null;

  // Colaboradores (só para contar a equipe): com internet ruim não prende a tela, usa a última lista carregada.
  let lastEmployees = [];
  async function employeesQuick() {
    try {
      const fresh = await Promise.race([window.portalEmployeeStore?.getAll(), new Promise((resolve) => setTimeout(() => resolve(null), 4000))]);
      if (fresh) lastEmployees = fresh;
    } catch (error) {
      console.warn("Não foi possível atualizar os colaboradores.", error);
    }
    return lastEmployees;
  }
  document.addEventListener("portal:release-changed", () => { if (activeProfileKey) renderProfile(activeProfileKey); });
  // Lista ao vivo mudou (outra pessoa, ou a própria gravação confirmada): atualiza sozinho.
  document.addEventListener("portal:releases-updated", () => { if (activeProfileKey) renderProfile(activeProfileKey); });

  // Redesenhos em fila: se chegar um pedido enquanto outro roda (ex.: vários cliques seguidos), roda só mais
  // uma vez no final com os dados mais novos, em vez de vários redesenhos ao mesmo tempo se atropelando.
  let renderRunning = null;
  let renderAgain = false;
  function renderProfile(profileKey) {
    activeProfileKey = profileKey;
    if (renderRunning) {
      renderAgain = true;
      return renderRunning;
    }
    renderRunning = (async () => {
      try {
        do {
          renderAgain = false;
          await renderProfileNow(activeProfileKey);
        } while (renderAgain);
      } catch (error) {
        console.error("Falha ao atualizar o painel.", error);
      } finally {
        renderRunning = null;
      }
    })();
    return renderRunning;
  }

  // ---------- Cartões do resumo ----------
  // O número soma individuais + coletivas (mesmas regras) e, embaixo, mostra de onde ele vem: quantas de cada,
  // quantas pessoas nas coletivas, há quanto tempo a mais antiga espera e quantas já saíram.
  let individualStats = null;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const createdOf = (record) => record.createdAt || record.requestedAt || "";
  function waitingLabel(list) {
    const times = list.map((record) => new Date(createdOf(record)).getTime()).filter((time) => !Number.isNaN(time));
    if (!times.length) return "";
    const minutes = Math.max(0, Math.round((Date.now() - Math.min(...times)) / 60000));
    const age = minutes < 60 ? plural(minutes, "minuto", "minutos")
      : minutes < 1440 ? plural(Math.floor(minutes / 60), "hora", "horas")
        : plural(Math.floor(minutes / 1440), "dia", "dias");
    return `mais antiga esperando há ${age}`;
  }
  function splitLabel(individual, collective) {
    const people = collective.reduce((sum, sheet) => sum + (sheet.participants?.length || 0), 0);
    return `${plural(individual.length, "individual", "individuais")} · ${plural(collective.length, "coletiva", "coletivas")}${collective.length ? ` (${plural(people, "pessoa", "pessoas")})` : ""}`;
  }
  const pendingNotes = { dp: "aguardando o DP", engenheiro: "aguardando seu abono", portaria: "não se aplica à portaria" };

  // Pendências de abono por engenheiro de destino (o "Enviar para" da liberação, nome do cadastro dele) e as enviadas
  // a todos. Primeiro nome; se dois têm o mesmo primeiro nome, os dois primeiros. Viram os cartões "Aguardando ..." e as
  // opções "Aguardando por engenheiro" da Situação (js/core/filter-bar.js).
  // field: "targetEngineer" (para quem foi enviada) ou "engineer" (quem assinou o abono, nas "Abonadas por").
  function byEngineerGroups(individual, collective, field = "targetEngineer") {
    const title = (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    const groups = new Map();
    const add = (record, kind) => {
      const name = String(record[field] || "").trim().replace(/\s+/g, " ");
      const key = name.toLowerCase();
      if (!groups.has(key)) groups.set(key, { key, name, count: 0, ind: 0, col: 0 });
      const group = groups.get(key);
      group.count += 1;
      group[kind] += 1;
    };
    individual.forEach((record) => add(record, "ind"));
    collective.forEach((record) => add(record, "col"));
    const named = [...groups.values()].filter((group) => group.name);
    const first = (name) => name.split(" ")[0].toLowerCase();
    const short = (name) => {
      const clash = named.some((other) => other.key !== name.toLowerCase() && first(other.name) === first(name));
      return name.split(" ").slice(0, clash ? 2 : 1).map(title).join(" ");
    };
    const list = named.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).map((group) => ({ ...group, label: short(group.name) }));
    const all = groups.get("");
    if (all) list.push({ ...all, label: "Todos os engenheiros" });
    return list;
  }

  // Um cartão por engenheiro: "Aguardando abono" em destaque (o número grande, o que importa agora) e, embaixo, as
  // "abonadas" por ele (quem assinou o abono). As duas partes filtram as listas; as mesmas opções ficam na Situação
  // (js/core/filter-bar.js). As enviadas a "todos os engenheiros" têm o cartão delas, só com o aguardando.
  // Engenheiros gestores (privilégio "gestor" no cadastro): o cartão deles ganha a etiqueta "Gestor" (abonam em último
  // caso). A lista vem do cadastro uma vez; quando chega, os cartões são redesenhados.
  let managerNames = new Set();
  let lastEngineerCards = null;
  window.portalAuthDemo?.getTeamDirectory?.().then((directory) => {
    managerNames = new Set((directory?.all || [])
      .filter((user) => user.roleValue === "engenheiro" && (user.privileges || []).includes("gestor"))
      .map((user) => String(user.name || "").trim().replace(/\s+/g, " ").toLowerCase()));
    if (managerNames.size && lastEngineerCards) renderEngineerCards(...lastEngineerCards);
  }).catch(() => { /* sem a lista, os cartões ficam sem a etiqueta */ });

  function renderEngineerCards(groups, approvedGroups, hidden) {
    lastEngineerCards = [groups, approvedGroups, hidden];
    const host = document.querySelector("#engineer-stats");
    if (!host) return;
    const approved = approvedGroups.filter((group) => group.key);
    host.hidden = hidden || (!groups.length && !approved.length);
    const filterBar = window.portalFilterBar;
    const options = (list) => list.map(({ key, label, count }) => ({ key, label, count }));
    // "Aguardando por engenheiro" na Situação: TODOS os engenheiros (também quem está com 0), com a pendência de cada um.
    const pendingKeys = new Set(groups.map((group) => group.key));
    const everyEngineer = [...groups.filter((group) => group.key), ...approved.filter((group) => !pendingKeys.has(group.key)).map((group) => ({ ...group, count: 0 })), ...groups.filter((group) => !group.key)];
    window.portalFilterBar?.setEngineers(hidden ? [] : options(everyEngineer), hidden ? [] : options(approved));
    if (host.hidden) { host.innerHTML = ""; return; }
    // Junta pelo nome: quem tem pendência e quem já abonou (o rótulo curto vem de quem tiver).
    const splitOf = (group) => [group?.ind ? plural(group.ind, "individual", "individuais") : "", group?.col ? plural(group.col, "coletiva", "coletivas") : ""].filter(Boolean).join(" · ");
    const byKey = new Map();
    groups.forEach((group) => byKey.set(group.key, { key: group.key, label: group.label, pending: group }));
    approved.forEach((group) => {
      const item = byKey.get(group.key) || { key: group.key, label: group.label };
      item.approved = group;
      byKey.set(group.key, item);
    });
    const items = [...byKey.values()].sort((a, b) => (!a.key) - (!b.key)
      || (b.pending?.count || 0) - (a.pending?.count || 0) || (b.approved?.count || 0) - (a.approved?.count || 0) || a.label.localeCompare(b.label));
    host.innerHTML = items.map((item) => {
      const waiting = item.pending?.count || 0;
      const done = item.approved?.count || 0;
      const name = item.key ? item.label : "todos os engenheiros";
      // A parte de cima filtra o aguardando; sem nada aguardando, filtra as abonadas (o clique sempre leva a uma lista).
      const mainFilter = waiting || !done ? filterBar?.engineerValue(item.key) : filterBar?.engineerValue(item.key, "approved");
      const main = `<button class="stat-engineer-main" type="button" data-engineer-filter="${escapeHtml(mainFilter || "")}">
          <span>Aguardando abono</span><b class="stat-engineer-name">${escapeHtml(name)}${managerNames.has(item.key) ? ' <em class="stat-engineer-tag">Gestor</em>' : ""}</b>
          <strong>${waiting}</strong><small class="stat-detail">${escapeHtml(waiting ? splitOf(item.pending) : "nada esperando")}</small></button>`;
      const approvedLine = item.key
        ? `<button class="stat-engineer-approved" type="button" data-engineer-filter="${escapeHtml(filterBar?.engineerValue(item.key, "approved") || "")}"${done ? "" : " disabled"}><b>✓</b> ${escapeHtml(plural(done, "abonada", "abonadas"))}${done ? ` <small>· ${escapeHtml(splitOf(item.approved))}</small>` : ""}</button>`
        : "";
      // Total do engenheiro: aguardando + abonadas, com a mesma divisão.
      const total = waiting + done;
      const both = { ind: (item.pending?.ind || 0) + (item.approved?.ind || 0), col: (item.pending?.col || 0) + (item.approved?.col || 0) };
      const totalLine = item.key ? `<p class="stat-engineer-total"><b>Total ${total}</b>${total ? ` <small>· ${escapeHtml(splitOf(both))}</small>` : ""}</p>` : "";
      return `<div class="stat-card stat-card-engineer">${main}${approvedLine}${totalLine}</div>`;
    }).join("");
    highlightStatCard();
  }

  // collective = { pending, approved, bonus, stageOf } das coletivas (js/features/collective-panel.js), ou null.
  function writeStats(collective) {
    if (!individualStats) return;
    const { profileKey, pending, approved, bonus, launched, toLaunch } = individualStats;
    const col = collective || { pending: [], approved: [], bonus: [], stageOf: () => "" };
    const detail = (id, lines) => {
      const el = document.querySelector(`#${id}`);
      if (el) el.innerHTML = lines.filter(Boolean).map(escapeHtml).join("<br>");
    };
    const isPortaria = profileKey === "portaria";

    elements.pending.textContent = pending.length + col.pending.length;
    document.querySelector("#stat-pending-note").textContent = pendingNotes[profileKey] || "em andamento (engenheiro ou DP)";
    detail("stat-pending-detail", isPortaria ? [] : [splitLabel(pending, col.pending), waitingLabel([...pending, ...col.pending])]);

    const exited = approved.filter((release) => window.portalReleaseFlow.stageOf(release) === "exited").length
      + col.approved.filter((sheet) => col.stageOf(sheet) === "exited").length;
    const approvedTotal = approved.length + col.approved.length;
    elements.approved.textContent = approvedTotal;
    document.querySelector("#stat-approved-note").textContent = "autorizadas pelo DP hoje";
    detail("stat-approved-detail", [
      approvedTotal ? `${plural(exited, "já saiu", "já saíram")} · ${approvedTotal - exited} aguardando portaria` : "",
      splitLabel(approved, col.approved)
    ]);

    elements.bonus.textContent = isPortaria ? profiles.portaria.bonus : bonus.length + col.bonus.length;
    detail("stat-bonus-detail", isPortaria ? [] : [splitLabel(bonus, col.bonus), waitingLabel([...bonus, ...col.bonus])]);
    // "Abonadas por <engenheiro>": de todas as liberações que o perfil vê, as que o engenheiro marcou como abonadas.
    // O Administrador Analista (perfil de teste e correções) não entra nos cartões.
    const byAdmin = (record) => /administrador/i.test(`${record.engineerRole || ""} ${record.engineer || ""}`);
    const approvedBy = (list) => (list || []).filter((record) => record.bonusStatus === "approved" && !byAdmin(record));
    renderEngineerCards(byEngineerGroups(bonus, col.bonus), byEngineerGroups(approvedBy(individualStats.all), approvedBy(col.all), "engineer"), isPortaria);

    // "Abonos lançados no RM": os que o DP já carimbou como lançados (individuais + coletivas).
    const launchedAll = launched.length + (col.launched || []).length;
    const toLaunchAll = toLaunch.length + (col.toLaunch || []).length;
    const abonados = launchedAll + toLaunchAll;
    const percent = abonados ? Math.round((launchedAll / abonados) * 100) : 0;
    elements.launched.textContent = isPortaria ? "—" : launchedAll;
    elements.launchedNote.textContent = isPortaria ? "carimbados pelo DP" : `${toLaunchAll} por lançar no RM`;
    detail("stat-launched-detail", isPortaria ? [] : [`${launchedAll} de ${abonados} abonados (${percent}%)`, splitLabel(launched, col.launched || [])]);
    elements.launchedProgress.hidden = isPortaria;
    elements.launchedBar.style.width = `${percent}%`;
    elements.launchedProgress.title = `${launchedAll} de ${abonados} abonos lançados no RM`;

    // "Indicadores do mês" (js/features/portal-insights.js), com as mesmas listas que o perfil vê.
    window.portalInsights?.render({ profileKey, releases: individualStats.all || [], sheets: col.all || [] });
    // Dashboard (js/features/portal-dashboard.js): esteira do fluxo, "Para você agora" e números do menu.
    window.portalDashboard?.update({ profileKey, releases: individualStats.all || [], sheets: col.all || [] });
  }
  window.portalWriteStats = writeStats;

  // Cartão aceso: o clicado (filtro antigo) ou, com a barra de filtros, a Situação que as duas listas têm em comum.
  function highlightStatCard() {
    const filterBar = window.portalFilterBar;
    const current = filterBar?.active() ? filterBar.sharedStatus() : statFilter;
    const aliases = filterBar?.aliases?.() || {};
    elements.statCards.forEach((card) => card.classList.toggle("is-active", !!current && (aliases[card.dataset.stat] || card.dataset.stat) === current));
    document.querySelectorAll("[data-engineer-filter]").forEach((card) => card.classList.toggle("is-active", !!current && card.dataset.engineerFilter === current));
  }
  document.addEventListener("portal-filter-status", highlightStatCard);

  async function renderProfileNow(profileKey) {
    activeProfileKey = profileKey;
    // Filtros do perfil (cada perfil tem a sua configuração; sem configuração fica o filtro antigo).
    window.portalFilterBar?.use(profileKey);
    // Link de outra tela com a lista já filtrada (Portal.html?situacao=...): aplica assim que a barra do perfil existe.
    window.portalDashboard?.applyUrlStatus();
    const profile = profiles[profileKey];
    elements.title.textContent = profile.title;
    elements.description.textContent = profile.description;
    elements.eyebrow.textContent = profile.eyebrow;
    elements.tableTitle.textContent = profile.tableTitle;
    // A portaria não cria liberação: sem botão principal (tudo fica na tabela).
    elements.primaryAction.hidden = !profile.action;
    elements.primaryAction.textContent = profile.action;
    elements.primaryAction.href = profile.actionHref || "#";
    // Liberação coletiva (lista de presença): fica ao lado da "Nova liberação individual", para os mesmos perfis.
    elements.collectiveAction.hidden = !profile.action;
    // Botão extra ao lado do principal: "Equipes" é um poder do estagiário de engenharia.
    elements.secondaryAction.hidden = !linkedRoleValues.includes(profileKey);
    // Link discreto do DP para o cadastro de digitais (leitor biométrico).
    const bioLink = document.querySelector("#dp-bio-link");
    if (bioLink) bioLink.hidden = profileKey !== "dp";
    const employees = await employeesQuick();
    const session = window.portalAuthDemo?.getSession();
    const allReleases = await window.portalDemoStore?.getReleases() || [];
    const allVisible = window.portalReleaseActions.visibleFor(allReleases);
    // Encarregado, estagiário e segurança do trabalho veem (tabela, números e histórico) só o que eles mesmos solicitaram.
    const releases = foremanRoleValues.includes(profileKey)
      ? allVisible.filter((release) => release.requester?.trim().toLowerCase() === session.name?.trim().toLowerCase())
      : allVisible;
    // Mesma regra do quadro "Minha equipe": o administrador abrindo o perfil de encarregado não tem equipe própria.
    const foremanTeam = foremanRoleValues.includes(session?.roleValue)
      ? employees.filter((employee) => [session.name, linkedRoleValues.includes(session.roleValue) ? session.linkedForeman : ""].some((owner) => owner && employee.encarregado?.trim().toLowerCase() === owner.trim().toLowerCase()))
      : [];
    elements.team.textContent = foremanRoleValues.includes(profileKey) ? foremanTeam.length : ["dp", "engenheiro"].includes(profileKey) ? employees.length : profile.team;
    const stageOf = window.portalReleaseFlow.stageOf;
    const rules = statRules(profileKey);
    // Individuais de cada cartão; o painel das coletivas soma as dele por cima (writeStats, chamado por refreshStats).
    individualStats = {
      profileKey,
      all: releases,
      pending: releases.filter(rules.pending),
      approved: releases.filter(rules.approved),
      bonus: releases.filter(rules.bonus),
      launched: releases.filter(rules.launched),
      toLaunch: releases.filter(rules.toLaunch)
    };
    elements.statCards.forEach((card) => {
      const key = card.dataset.stat;
      card.disabled = profileKey === "portaria" && ["team", "bonus", "launched"].includes(key);
    });
    highlightStatCard();
    if (window.portalCollectivePanel?.refreshStats) window.portalCollectivePanel.refreshStats();
    else writeStats(null);
    renderForemanSummary(profileKey, employees);
    const shortcutTitle = profile.title.replace(/^Painel d[oa] /, "");
    elements.shortcutTitle.textContent = foremanRoleValues.includes(profileKey) ? "Operação" : shortcutTitle.charAt(0).toUpperCase() + shortcutTitle.slice(1);
    elements.shortcutList.innerHTML = profile.shortcuts.map((shortcut, index) => {
      const href = (profile.shortcutHrefs && profile.shortcutHrefs[index]) || (foremanRoleValues.includes(profileKey) && index === 0 ? "Liberacao.html" : `#${profileKey}-${index + 1}`);
      return `<a class="shortcut-item" href="${href}"><span class="shortcut-icon">${index + 1}</span>${shortcut}</a>`;
    }).join("");
    await renderRecords(profileKey, allReleases);
    window.portalCollectivePanel?.render(profileKey);
    const recent = releases.slice(0, 3);
    elements.activity.innerHTML = recent.length ? recent.map((release) => `
      <li><span class="activity-dot ${["gate", "exited", "registered"].includes(stageOf(release)) ? "is-success" : ["engineer", "dp"].includes(stageOf(release)) ? "is-warning" : ""}"></span><div><strong>${escapeHtml(window.portalReleaseFlow.stages[stageOf(release)].label)}</strong><small>${escapeHtml(release.name)} · ${escapeHtml(release.time)}</small></div></li>
    `).join("") : "<li><div><strong>Nenhuma atividade local</strong><small>Cadastre colaboradores e registre liberações para começar.</small></div></li>";
  }

  const session = window.portalAuthDemo?.getSession();
  const isAdministrator = session?.roleValue === "administrador-analista" || session?.role === "Administrador Analista";
  // Analista com acessos dados pelo administrador (DP, engenheiro, segurança do trabalho): alterna entre o painel de
  // analista e só os painéis a que ele tem acesso.
  const analystAccess = window.portalAuthDemo?.analystAccess?.() || [];
  const isDpDelegate = analystAccess.length > 0;
  const delegateProfiles = ["analista", ...analystAccess];
  // O cadastro salva o perfil como "porteiro", mas o painel dele se chama "portaria".
  const profileKey = (session?.roleValue === "porteiro" ? "portaria" : session?.roleValue)
    || (session?.role?.toLowerCase().includes("engenheiro") ? "engenheiro"
      : session?.role?.toLowerCase().includes("porteiro") ? "portaria"
        : isAdministrator ? "dp" : "dp");
  // O administrador volta ao último perfil que escolheu (não ao DP) ao retornar de outras telas.
  const adminProfileKey = "issellPortalAdminProfile";
  const savedAdminProfile = () => {
    try {
      const saved = localStorage.getItem(adminProfileKey);
      if (isDpDelegate) return delegateProfiles.includes(saved) ? saved : "analista";
      return profiles[saved] ? saved : "dp";
    } catch (error) {
      return isDpDelegate ? "analista" : "dp";
    }
  };
  let initialProfile = profiles[profileKey] ? profileKey : "dp";
  if (isAdministrator || isDpDelegate) {
    if (isDpDelegate) {
      // Só os painéis a que ele tem direito.
      [...elements.adminProfile.options].forEach((option) => { if (!delegateProfiles.includes(option.value)) option.remove(); });
      const hint = elements.adminSwitcher.querySelector("small");
      const names = [...elements.adminProfile.options].filter((option) => option.value !== "analista").map((option) => option.textContent);
      if (hint) hint.textContent = `Você tem acesso a: ${names.join(", ")}. Alterne entre esses painéis e o de Analista.`;
    }
    initialProfile = savedAdminProfile();
    elements.adminSwitcher.hidden = false;
    elements.adminProfile.value = initialProfile;
    elements.adminProfile.addEventListener("change", (event) => {
      trashMode = false;
      doneMode = false;
      statFilter = null;
      try { localStorage.setItem(adminProfileKey, event.target.value); } catch (error) { /* armazenamento indisponível */ }
      renderProfile(event.target.value);
    });
  }
  elements.recordsSearch?.addEventListener("input", () => renderRecords(activeProfileKey));
  renderProfile(initialProfile);
})();
