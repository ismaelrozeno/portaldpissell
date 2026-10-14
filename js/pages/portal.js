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
    adminPerson: document.querySelector("#admin-person-select"),
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
  // Perfis que trabalham na equipe dos encarregados a quem estão vinculados. O analista também (além de chefiar a própria).
  const linkedRoleValues = ["estagiario_engenharia", "analista"];
  const linkedForemenOf = (user) => window.portalAuthDemo.linkedForemenOf(user);

  // Simulador do administrador ("Acessar como" + pessoa): a tela usa a conta da pessoa escolhida, para ficar
  // exatamente como ela vê. Sem pessoa escolhida (ou fora do simulador), é a conta de quem está logado.
  const viewerSession = () => window.portalViewAs || window.portalAuthDemo?.getSession();
  // Engenheiro comum (não Gestor): a lista dele só tem o que foi enviado a ele, mas as informações
  // (esteira, cartões, BI) são da obra toda, como as do DP. O administrador sem pessoa escolhida já vê tudo.
  const limitedEngineer = (profileKey) => {
    if (profileKey !== "engenheiro") return false;
    const viewer = viewerSession();
    return !!viewer && viewer.roleValue !== "administrador-analista" && !(viewer.privileges || []).includes("gestor");
  };
  // "É minha?": pela conta de quem pediu (liberações novas) ou pelo nome, sem diferença de acento, maiúscula ou espaço.
  const nameKey = (name) => window.normalizeSearchText(name).replace(/\s+/g, " ").trim();
  const requestedBy = (release, person) => (release.requesterUid && person?.uid ? release.requesterUid === person.uid : false)
    || (!!nameKey(person?.name) && nameKey(release.requester) === nameKey(person?.name));

  function renderForemanSummary(profileKey, employees) {
    const session = viewerSession();
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
        ? (linkedForemenOf(session).length ? `Estagiário de Engenharia · vinculado a ${linkedForemenOf(session).join(", ")}` : "Estagiário de Engenharia · escolha seus encarregados em Equipes e Excel")
        : session?.roleValue === "analista"
          ? "Analista · chefe de equipe"
        : session?.roleValue === "seguranca_trabalho"
          ? "Segurança do trabalho"
          : "selecione um cadastro de encarregado para visualizar";
    // O estagiário cuida das equipes dos encarregados a quem está vinculado (além de uma equipe que tenha no próprio nome).
    const teamOwners = [session?.name, ...(linkedRoleValues.includes(session?.roleValue) ? linkedForemenOf(session) : [])]
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
  // disso, o engenheiro para quem foi enviada (o da equipe do encarregado). As antigas, enviadas antes das equipes dos
  // engenheiros (quando existia "todos os engenheiros"), ficam "sem engenheiro" e só o Gestor as vê.
  const engineerLabel = (release) => String(release.engineer || release.targetEngineer || "").trim() || "sem engenheiro";

  function signatureChips(release, stage) {
    const short = (name) => escapeHtml(String(name || "").trim());
    const chip = (tone, html, hint) => `<span class="sig-chip sig-${tone}"${hint ? ` title="${escapeHtml(hint)}"` : ""}>${html}</span>`;
    const chips = [];
    if (stage === "foreman") {
      chips.push(chip("no", `Recusada por: <b>${short(release.refusedBy)}</b>${release.refusalReason ? ` · ${escapeHtml(release.refusalReason)}` : ""}`));
    } else {
      // Pedido do encarregado (o que ele marcou no formulário) aparece sempre que existir, mesmo depois de
      // o engenheiro decidir, para dar para comparar o que foi pedido com o que foi assinado.
      if (release.bonusRequest) {
        chips.push(chip("info", `Pedido do encarregado: <b>${release.bonusRequest === "abonado" ? "Abonado" : "Não abonado"}</b>`));
      }
      // Devolvida pelo DP: o engenheiro vê o motivo e o que tinha marcado, até decidir de novo.
      if (stage === "engineer" && !release.bonusStatus && release.dpReturnReason) {
        const prev = release.dpReturnPrevBonus === "approved" ? " · estava abonado" : release.dpReturnPrevBonus === "denied" ? " · estava não abonado" : "";
        chips.push(chip("no", `Devolvida pelo DP: <b>${short(release.dpReturnBy)}</b> · ${escapeHtml(release.dpReturnReason)}${prev}`));
      }
      if (release.engineer && release.bonusStatus) {
        chips.push(chip(release.bonusStatus === "approved" ? "yes" : "no", `Engenheiro: <b>${release.bonusStatus === "approved" ? "abonado" : "não abonado"}</b> · ${short(release.engineer)}`));
      } else {
        // Mostra para qual engenheiro foi enviada (como na coletiva).
        chips.push(chip("wait", `Engenheiro: <b>aguardando</b>${release.targetEngineer ? ` · ${short(release.targetEngineer)}` : ""}`));
      }
    }
    if (stage !== "foreman") {
      if (release.dpSigner) {
        chips.push(chip(stage === "closed" ? "no" : "yes", `DP: <b>${stage === "closed" ? "negou" : "assinou"}</b> · ${short(release.dpSigner)}`));
      } else if (!window.portalReleaseFlow.isRetroactive(release)) {
        // Retroativa / não bateu o ponto não passa pelo DP para autorizar: o aviso fica nos dados da liberação (flagLine).
        chips.push(chip("wait", `DP: <b>${stage === "engineer" ? "aguardando o engenheiro" : "aguardando"}</b>`));
      }
      // Lançamento do abono no RM (igual à coletiva): quem lançou; para o DP, o que ainda falta lançar.
      if (release.abonoLaunchedAt) chips.push(chip("yes", `Abono no RM: <b>lançado</b> · ${short(release.abonoLaunchedBy || "DP")}`));
      else if (release.bonusStatus === "approved" && activeProfileKey === "dp") chips.push(chip("wait", "Abono no RM: <b>por lançar</b>"));
      if (release.exitConfirmedBy) {
        chips.push(chip("yes", `Portaria: <b>assinou</b> · ${short(release.exitConfirmedBy)}`));
      } else if (stage === "gate") {
        chips.push(chip("wait", "Portaria: <b>aguardando saída</b>"));
      }
      // Digital do colaborador (como o "Digitais: X de Y" da coletiva): o DP sempre vê; os outros, só depois de assinada.
      if (release.employeeSignature?.method === "biometria") chips.push(chip("yes", "Digital do colaborador: <b>assinada</b>"));
      else if (activeProfileKey === "dp" && stage !== "closed") chips.push(chip("wait", "Digital do colaborador: <b>aguardando</b>", "O colaborador assina com a digital no DP, inclusive depois que a portaria confirmou a saída."));
    }
    return `<div class="sig-chips">${chips.join("")}</div>`;
  }

  // Dado da liberação (não é assinatura): retroativa / não bateu o ponto, ou só entrada. Fica junto da data,
  // acima do acompanhamento das assinaturas.
  function flagLine(release) {
    const flow = window.portalReleaseFlow;
    // "Não bateu o ponto" já aparece em "Batida do ponto" (e na coluna Horário): aqui não repete.
    if (flow.isRetroactive(release) && !flow.hasBothMovements(release)) {
      return '<small class="row-flag" title="A data da liberação é anterior ao dia em que ela foi criada. Depois do engenheiro, ela já fica registrada; o DP só lança o abono no RM."><b>Retroativa</b> · sem autorização de saída nem portaria</small>';
    }
    if (flow.isEntryOnly(release)) {
      return '<small class="row-flag" title="O colaborador está chegando: o DP autoriza a entrada e não há saída para a portaria confirmar."><b>Só entrada</b> · sem portaria</small>';
    }
    return "";
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
      const decide = actions.dpCanDecide(release) ? `${btn("row-yes-btn", "authorize", window.portalReleaseFlow.isEntryOnly(release) ? "Autorizar entrada" : "Autorizar saída")}${btn("row-no-btn", "dp-refuse", "Recusar")}` : "";
      // O lançamento do abono no RM é feito só na folha de liberação ("Visualizar liberação").
      return `${sign}${decide}${view}${del}`;
    }
    // Encarregado / estagiário: só edita e reenvia quando o engenheiro recusou. "Apagar" só some do histórico dele.
    const edit = stage === "foreman" ? `<a class="table-action" href="Liberacao.html?edit=${encodeURIComponent(release.id)}">Editar e reenviar</a>` : "";
    return `${view}${edit}${del}`;
  }

  // Lixeira: cada usuário tem a sua. "Apagar" manda para ela; de lá restaura ou apaga de vez.
  // No computador, Lixeira e Concluídas também são páginas do menu lateral (Portal.html#lixeira / #concluidas,
  // js/features/portal-dashboard.js): aberto direto nelas, já começa no modo certo.
  const PAGE_MODE = { lixeira: "trash", concluidas: "done" };
  const pageMode = () => PAGE_MODE[document.body.dataset.page] || PAGE_MODE[location.hash.replace("#", "")] || "";
  let trashMode = pageMode() === "trash";
  window.portalIsTrashMode = () => trashMode;
  // Caixa "Concluídas": as liberações com todas as assinaturas (portalReleaseFlow.isConcluded), fora das pendências.
  let doneMode = pageMode() === "done";
  window.portalIsDoneMode = () => doneMode;
  // Página Lixeira/Concluídas do menu: troca o modo das duas listas ("trash" | "done" | "" = pendências).
  window.portalSetListMode = async (mode) => {
    if ((mode === "trash") === trashMode && (mode === "done") === doneMode) return;
    trashMode = mode === "trash";
    doneMode = mode === "done";
    pager().reset();
    if (!activeProfileKey) return;
    await renderRecords(activeProfileKey);
    window.portalCollectivePanel?.render(activeProfileKey);
  };
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
      // A portaria não vê as de só entrada (não passam por ela).
      approved: (release) => (profileKey === "portaria" ? ["gate", "exited"] : ["gate", "exited", "entered"]).includes(stageOf(release))
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
    // Quantas há na Lixeira e em Concluídas, ao lado do nome no menu lateral.
    const setNavCount = (page, n) => document.querySelectorAll(`[data-dash-page="${page}"] .dash-badge`).forEach((badge) => {
      badge.textContent = n > 999 ? "999+" : String(n);
      badge.hidden = !n;
    });
    setNavCount("lixeira", trashCount);
    setNavCount("concluidas", doneCount);
    // Título da lista diz onde a pessoa está (Lixeira / Concluídas são páginas no computador).
    const title = document.querySelector("#table-title");
    if (title) title.textContent = trashMode ? "Lixeira" : doneMode ? "Concluídas · individuais" : profiles[activeProfileKey]?.tableTitle || title.textContent;
    if (doneMode) {
      toolbar.innerHTML = `
        <button class="toolbar-btn" type="button" data-toolbar="back">← Voltar às pendências</button>
        <span class="toolbar-count">✅ ${doneCount} ${doneCount === 1 ? "concluída" : "concluídas"}</span>
        <button class="toolbar-btn" type="button" data-toolbar="pdf-individual" ${individualVisible ? "" : "disabled"} title="Todas as individuais concluídas da lista (com busca e filtros) num PDF só, aberto numa aba nova">📄 PDF das individuais (${individualVisible})</button>
        <button class="toolbar-btn" type="button" data-toolbar="pdf-collective" ${collective.visible ? "" : "disabled"} title="Todas as coletivas concluídas da lista (com busca e filtros) num PDF só, aberto numa aba nova">📄 PDF das coletivas (${collective.visible})</button>`;
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

  // "Data da liberação: 10/10/2026": a data que o solicitante escolheu no pedido (não a de criação).
  function releaseDateLabel(release) {
    const day = String(release.date || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return "";
    return `<small class="row-date">Data da liberação: <b>${day.split("-").reverse().join("/")}</b></small>`;
  }

  // Tipo (Tarefa/Particular), motivo escrito e movimentação (Entrada/Saída) da liberação individual.
  function reasonLine(release) {
    const text = String(release.reason || "");
    const type = release.reasonType || (/^tarefa/i.test(text) ? "tarefa" : /^particular/i.test(text) ? "particular" : "");
    const detail = String(release.reasonDetail ?? text.replace(/^(tarefa|particular):?\s*/i, "")).trim();
    const tag = type ? `<span class="reason-tag reason-${type}">${type === "tarefa" ? "Tarefa" : "Particular"}</span>` : "";
    return `<small class="row-reason">${tag}<span>${detail ? escapeHtml(detail) : "Motivo não informado"}</span><span class="row-movement">Movimentação: <b>${escapeHtml(window.portalReleaseFlow.movementLabel(release))}</b></span></small>`;
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
    const session = viewerSession();
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
        <td data-label="Colaborador" class="col-who"><strong>${escapeHtml(release.name)}</strong><small class="row-role">${escapeHtml(release.role || "Função não informada")}</small>${reasonLine(release)}<small class="row-who">Solicitante: <b>${escapeHtml(release.requester)}</b></small><small class="row-meta">Eng. ${escapeHtml(engineerLabel(release))}</small>${releaseDateLabel(release)}${flagLine(release)}<small class="row-clock">Batida do ponto: <b>${release.time && !window.portalReleaseFlow.hasBothMovements(release) ? escapeHtml(release.time) : "Não bateu o ponto"}</b></small>${createdLabel(release.createdAt || release.requestedAt)}${signatureChips(release, stage)}</td>
        <td data-label="Engenheiro" class="col-frente">${escapeHtml(engineerLabel(release))}</td>
        <td data-label="Horário" class="col-horario">${release.time && !window.portalReleaseFlow.hasBothMovements(release) ? escapeHtml(release.time) : '<span class="text-muted">Não bateu o ponto</span>'}</td>
        <td data-label="Status" class="col-status"><span class="status-badge status-${flow.stages[stage].tone}">${flow.stageLabel(release, stage)}</span></td>
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
      ? releases.filter((release) => requestedBy(release, session))
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
        <td data-label="Colaborador" class="col-who"><strong>${escapeHtml(release.name)}</strong><small class="row-role">${escapeHtml(release.role || "Função não informada")}</small>${reasonLine(release)}<small class="row-who">Solicitante: <b>${escapeHtml(release.requester)}</b></small><small class="row-meta">Eng. ${escapeHtml(engineerLabel(release))}</small>${releaseDateLabel(release)}${flagLine(release)}<small class="row-clock">Batida do ponto: <b>${release.time && !window.portalReleaseFlow.hasBothMovements(release) ? escapeHtml(release.time) : "Não bateu o ponto"}</b></small>${createdLabel(release.createdAt || release.requestedAt)}${signatureChips(release, stage)}</td>
        <td data-label="Engenheiro" class="col-frente">${escapeHtml(engineerLabel(release))}</td>
        <td data-label="Horário" class="col-horario">${release.time && !window.portalReleaseFlow.hasBothMovements(release) ? escapeHtml(release.time) : '<span class="text-muted">Não bateu o ponto</span>'}</td>
        <td data-label="Status" class="col-status"><span class="status-badge status-${flow.stages[stage].tone}">${flow.stageLabel(release, stage)}</span>${release.abonoLaunchedAt ? '<small class="row-launched">Abono lançado no RM</small>' : ""}${!doneMode && flow.isConcluded(release) ? '<small class="row-concluded">✓ Concluída</small>' : ""}</td>
        <td class="text-end row-actions col-actions" data-label="Ação">${actionsFor(profile, release, stage)}</td>
      </tr>
    `).join("") : `<tr><td colspan="5" class="empty-state">${filtering || statFilter ? "Nenhum registro encontrado para os filtros." : doneMode ? "Nenhuma liberação concluída ainda." : "Nenhuma pendência: tudo o que foi concluído está em ✅ Concluídas."}</td></tr>`;
  }

  // ---------- "Equipe vinculada": as pessoas da equipe, para criar liberação ----------
  // Clicar no nome abre a liberação individual dessa pessoa; marcar (uma a uma ou "Selecionar todos") e tocar em
  // "Liberação coletiva" abre a coletiva já com elas (Liberacao-Coletiva.html?employees=matrícula,matrícula...).
  let currentTeam = [];
  let teamCardIsMine = false; // o cartão "Equipe vinculada" mostra a equipe de quem está logado (chefe de equipe)
  let teamDialog = null;
  const teamPicked = new Set();
  function openTeamDialog() {
    if (!teamDialog) {
      document.body.insertAdjacentHTML("beforeend", `
        <dialog class="refuse-dialog team-dialog" id="team-dialog" aria-labelledby="team-dialog-title">
          <button type="button" class="team-dialog-close" aria-label="Fechar">×</button>
          <h2 id="team-dialog-title">Minha equipe</h2>
          <p class="team-dialog-sub" id="team-dialog-sub"></p>
          <input type="search" class="team-dialog-search" id="team-dialog-search" placeholder="Buscar por nome ou matrícula..." autocomplete="off" aria-label="Buscar na equipe">
          <label class="team-dialog-all"><input type="checkbox" id="team-dialog-all"> Selecionar todos</label>
          <ul class="team-dialog-list" id="team-dialog-list"></ul>
          <div class="team-dialog-actions">
            <button type="button" class="team-dialog-collective" id="team-dialog-collective" disabled>Liberação coletiva</button>
          </div>
        </dialog>`);
      teamDialog = document.querySelector("#team-dialog");
      teamDialog.querySelector(".team-dialog-close").addEventListener("click", () => teamDialog.close());
      // Clicar fora da janela fecha.
      teamDialog.addEventListener("click", (event) => { if (event.target === teamDialog) teamDialog.close(); });
      teamDialog.querySelector("#team-dialog-search").addEventListener("input", renderTeamDialog);
      teamDialog.querySelector("#team-dialog-list").addEventListener("change", (event) => {
        const box = event.target.closest("[data-team-pick]");
        if (!box) return;
        if (box.checked) teamPicked.add(box.dataset.teamPick); else teamPicked.delete(box.dataset.teamPick);
        updateTeamActions();
      });
      teamDialog.querySelector("#team-dialog-all").addEventListener("change", (event) => {
        // "Selecionar todos" vale para quem aparece na busca.
        visibleTeam().forEach((employee) => (event.target.checked ? teamPicked.add(employee.matricula) : teamPicked.delete(employee.matricula)));
        renderTeamDialog();
      });
      teamDialog.querySelector("#team-dialog-collective").addEventListener("click", () => {
        if (!teamPicked.size) return;
        // Uma pessoa só: liberação individual dela. Duas ou mais: coletiva com todas.
        window.location.href = teamPicked.size === 1
          ? `Liberacao.html?employee=${encodeURIComponent([...teamPicked][0])}`
          : `Liberacao-Coletiva.html?employees=${encodeURIComponent([...teamPicked].join(","))}`;
      });
    }
    teamPicked.clear();
    teamDialog.querySelector("#team-dialog-search").value = "";
    renderTeamDialog();
    teamDialog.showModal();
  }
  const visibleTeam = () => {
    const term = window.normalizeSearchText(teamDialog.querySelector("#team-dialog-search").value).trim();
    return [...currentTeam]
      .sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", { sensitivity: "base" }))
      .filter((employee) => !term || window.normalizeSearchText(`${employee.nome} ${employee.matricula} ${employee.funcao || ""}`).includes(term));
  };
  function renderTeamDialog() {
    const list = visibleTeam();
    teamDialog.querySelector("#team-dialog-sub").textContent = currentTeam.length
      ? `${currentTeam.length} ${currentTeam.length === 1 ? "colaborador" : "colaboradores"}. Toque no nome (ou marque 1) para uma liberação individual; marque 2 ou mais para uma coletiva.`
      : "Nenhum colaborador vinculado à sua equipe ainda. A equipe é montada em Equipes.";
    teamDialog.querySelector("#team-dialog-list").innerHTML = list.length
      ? list.map((employee) => {
        const id = escapeHtml(employee.matricula);
        return `<li>
          <input type="checkbox" data-team-pick="${id}" aria-label="Selecionar ${escapeHtml(employee.nome)}"${teamPicked.has(employee.matricula) ? " checked" : ""}>
          <a href="Liberacao.html?employee=${encodeURIComponent(employee.matricula)}" title="Liberação individual para ${escapeHtml(employee.nome)}"><strong>${escapeHtml(employee.nome)}</strong><small>${escapeHtml(employee.funcao || "Função não informada")} · Matrícula ${id}</small></a>
        </li>`;
      }).join("")
      : `<li class="team-dialog-empty">${currentTeam.length ? "Ninguém encontrado na busca." : "Sem colaboradores."}</li>`;
    updateTeamActions();
  }
  function updateTeamActions() {
    const list = visibleTeam();
    const all = teamDialog.querySelector("#team-dialog-all");
    const pickedHere = list.filter((employee) => teamPicked.has(employee.matricula)).length;
    all.checked = !!list.length && pickedHere === list.length;
    all.indeterminate = pickedHere > 0 && pickedHere < list.length;
    all.disabled = !list.length;
    const button = teamDialog.querySelector("#team-dialog-collective");
    button.disabled = !teamPicked.size;
    button.textContent = !teamPicked.size ? "Marque as pessoas para a liberação"
      : teamPicked.size === 1 ? "Liberação individual" : `Liberação coletiva com ${teamPicked.size} selecionados`;
  }

  // Clique nos cartões do resumo: "Equipe vinculada" abre a equipe; os outros filtram a tabela (clicar de novo tira o filtro).
  // Cartão "Aguardando <engenheiro>": escolhe a mesma opção na Situação das duas listas (clicar de novo tira).
  document.querySelector("#engineer-stats")?.addEventListener("click", async (event) => {
    const card = event.target.closest("[data-engineer-filter]");
    const filterBar = window.portalFilterBar;
    if (!card || card.disabled || !filterBar?.active()) return;
    const value = card.dataset.engineerFilter;
    // Parte Individuais/Coletivas: sempre filtra (ir de uma para a outra do mesmo engenheiro não desliga o filtro).
    const next = card.dataset.page ? value : filterBar.sharedStatus() === value ? "all" : value;
    if (trashMode || doneMode) {
      trashMode = false;
      doneMode = false;
      await renderRecords(activeProfileKey);
    }
    filterBar.setStatusAll(next);
    if (next !== "all") document.querySelector("#records-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  // Encarregado, estagiário, analista e segurança (body.info-only): cartões, esteira e cartões dos engenheiros só
  // informam a obra toda; não levam para os filtros (a lista deles só tem o que eles pediram). DP e engenheiro: clicam.
  document.addEventListener("click", (event) => {
    if (!document.body.classList.contains("info-only")) return;
    const card = event.target.closest(".portal-stats .stat-card:not([data-stat='team']), [data-engineer-filter], [data-flow], [data-flow-part]");
    if (card) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
  document.querySelector(".portal-stats").addEventListener("click", async (event) => {
    const card = event.target.closest(".stat-card");
    if (!card || card.disabled || !activeProfileKey) return;
    // Cartão dividido (Individuais | Coletivas): só as partes clicam.
    const part = event.target.closest("[data-page]");
    if (card.classList.contains("is-split") && !part) return;
    const key = card.dataset.stat;
    if (key === "team") {
      // Quem tem equipe (encarregado, analista, estagiário, segurança): abre a equipe para criar liberações dela.
      if (teamCardIsMine) openTeamDialog();
      else window.location.href = "Equipes.html";
      return;
    }
    // Perfil com barra de filtros: o cartão escolhe a Situação nas duas listas (individual e coletiva), cada uma na sua barra.
    const filterBar = window.portalFilterBar;
    if (filterBar?.active()) {
      const next = part ? key : filterBar.sharedStatus() === (filterBar.aliases()[key] || key) ? "all" : key;
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
      // Computador: Lixeira e Concluídas são páginas do menu; "Voltar" leva às Individuais.
      if (window.portalDashboard && window.matchMedia("(min-width: 992px)").matches) {
        window.portalDashboard.go(kind === "open-trash" ? "lixeira" : kind === "open-done" ? "concluidas" : "individuais");
        return;
      }
      trashMode = kind === "open-trash";
      doneMode = kind === "open-done";
      pager().reset();
      await renderRecords(activeProfileKey);
      window.portalCollectivePanel?.render(activeProfileKey);
      return;
    }
    // Concluídas: as individuais e as coletivas da lista, cada uma no seu PDF, abertos numa aba nova.
    if (kind === "pdf-individual" || kind === "pdf-collective") {
      const label = button.textContent;
      button.disabled = true;
      button.textContent = "Gerando PDF…";
      try {
        if (kind === "pdf-individual") {
          await window.portalReleasePreview.openPdf([...shownReleases], null, "Obra 369 · Liberações individuais concluídas", "liberacoes-individuais-concluidas-obra-369.pdf");
        } else {
          await window.portalCollectiveSheet.openPdf([...(window.portalCollectivePanel?.items() || [])], "liberacoes-coletivas-concluidas-obra-369.pdf");
        }
      } catch (error) {
        console.error("Não foi possível gerar o PDF das concluídas.", error);
        await window.portalReleaseActions.ask({ title: "Não foi possível gerar o PDF", message: "Verifique a internet e tente de novo.", okText: "OK", cancelText: null });
      } finally {
        button.textContent = label;
        button.disabled = false;
      }
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
  // Cartão dividido: Individuais | Coletivas, cada parte filtra e leva à sua lista (mesmo visual dos cartões dos
  // engenheiros). hide: sem partes (ex.: portaria, que não vê esses números).
  function statSplit(key, individual, collective, hide) {
    const host = document.querySelector(`#stat-${key}-split`);
    if (!host) return;
    host.hidden = !!hide;
    if (hide) { host.innerHTML = ""; return; }
    const people = collective.reduce((sum, sheet) => sum + (sheet.participants?.length || 0), 0);
    const part = (page, title, count, line) => `<button type="button" class="stat-engineer-part" data-page="${page}" aria-label="${escapeHtml(`${title}: ${count}`)}">
        <span class="stat-engineer-part-title">${title}</span><span class="stat-engineer-part-num">${count}</span>${line ? `<span class="stat-engineer-part-line">${escapeHtml(line)}</span>` : ""}</button>`;
    host.innerHTML = part("individuais", "Individuais", individual.length, "")
      + part("coletivas", "Coletivas", collective.length, collective.length ? plural(people, "pessoa", "pessoas") : "");
  }
  const pendingNotes = { dp: "aguardando o DP", engenheiro: "aguardando seu abono", portaria: "não se aplica à portaria" };

  // Pendências de abono por engenheiro de destino (o "Enviar para" da liberação, nome do cadastro dele) e as enviadas
  // as antigas sem destino ("sem engenheiro"). Primeiro nome; se dois têm o mesmo primeiro nome, os dois primeiros. Viram os cartões "Aguardando ..." e as
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
    if (all) list.push({ ...all, label: "Sem engenheiro" });
    return list;
  }

  // Um cartão por engenheiro: "Aguardando abono" em destaque (o número grande, o que importa agora) e, embaixo, as
  // "abonadas" por ele (quem assinou o abono). As duas partes filtram as listas; as mesmas opções ficam na Situação
  // (js/core/filter-bar.js). As antigas sem engenheiro (de antes das equipes dos engenheiros) têm o cartão delas, só com o aguardando.
  // Engenheiros gestores (privilégio "gestor" no cadastro): o cartão deles ganha a etiqueta "Gestor" (abonam em último
  // caso). A lista vem do cadastro uma vez; quando chega, os cartões são redesenhados.
  let managerNames = new Set();
  let lastEngineerCards = null;
  window.portalAuthDemo?.getTeamDirectory?.().then((directory) => {
    managerNames = new Set((directory?.all || [])
      .filter((user) => (user.roleValue === "engenheiro" || (user.roleValue === "analista" && (user.privileges || []).includes("engenheiro"))) && (user.privileges || []).includes("gestor"))
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
      const name = item.key ? item.label : "sem engenheiro";
      const filter = escapeHtml(filterBar?.engineerValue(item.key) || "");
      // Duas partes clicáveis: Individuais leva às individuais aguardando esse engenheiro; Coletivas, às coletivas.
      // Cada parte mostra o aguardando (o que importa agora), as abonadas por ele e o total daquele tipo.
      const part = (kind, page, title) => {
        const wait = item.pending?.[kind] || 0;
        const ok = item.approved?.[kind] || 0;
        return `<button type="button" class="stat-engineer-part" data-engineer-filter="${filter}" data-page="${page}" aria-label="${escapeHtml(`${title} de ${name}: ${wait} aguardando, ${ok} abonadas`)}">
            <span class="stat-engineer-part-title">${title}</span>
            <span class="stat-engineer-part-num">${wait}</span>
            <span class="stat-engineer-part-line">aguardando</span>
            ${item.key ? `<span class="stat-engineer-part-line"><b>✓</b> ${escapeHtml(plural(ok, "abonada", "abonadas"))}</span><span class="stat-engineer-part-line">Total ${wait + ok}</span>` : ""}
          </button>`;
      };
      const totalLine = item.key ? `<span class="stat-engineer-total"><b>Total ${waiting + done}</b> <small>· ${waiting} aguardando · ${escapeHtml(plural(done, "abonada", "abonadas"))}</small></span>` : "";
      return `<div class="stat-card stat-card-engineer is-split">
          <span>Aguardando abono</span><b class="stat-engineer-name">${escapeHtml(name)}${managerNames.has(item.key) ? ' <em class="stat-engineer-tag">Gestor</em>' : ""}</b>
          <strong>${waiting}</strong>
          <div class="stat-engineer-split">${part("ind", "individuais", "Individuais")}${part("col", "coletivas", "Coletivas")}</div>
          ${totalLine}</div>`;
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
    document.querySelector("#stat-pending-note").textContent = pendingNotes[profileKey] || "em andamento na obra (engenheiro ou DP)";
    detail("stat-pending-detail", isPortaria ? [] : [waitingLabel([...pending, ...col.pending])]);
    statSplit("pending", pending, col.pending, isPortaria);

    const stageCount = (stage) => approved.filter((release) => window.portalReleaseFlow.stageOf(release) === stage).length
      + col.approved.filter((sheet) => col.stageOf(sheet) === stage).length;
    const exited = stageCount("exited");
    const entered = stageCount("entered");
    const approvedTotal = approved.length + col.approved.length;
    elements.approved.textContent = approvedTotal;
    document.querySelector("#stat-approved-note").textContent = "autorizadas pelo DP hoje";
    detail("stat-approved-detail", [
      approvedTotal ? `${plural(exited, "já saiu", "já saíram")} · ${approvedTotal - exited - entered} aguardando portaria${entered ? ` · ${plural(entered, "entrada", "entradas")}` : ""}` : ""
    ]);
    statSplit("approved", approved, col.approved);

    elements.bonus.textContent = isPortaria ? profiles.portaria.bonus : bonus.length + col.bonus.length;
    detail("stat-bonus-detail", isPortaria ? [] : [waitingLabel([...bonus, ...col.bonus])]);
    statSplit("bonus", bonus, col.bonus, isPortaria);
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
    detail("stat-launched-detail", isPortaria ? [] : [`${launchedAll} de ${abonados} abonados (${percent}%)`]);
    statSplit("launched", launched, col.launched || [], isPortaria);
    elements.launchedProgress.hidden = isPortaria;
    elements.launchedBar.style.width = `${percent}%`;
    elements.launchedProgress.title = `${launchedAll} de ${abonados} abonos lançados no RM`;

    // "Indicadores do mês" (js/features/portal-insights.js), com as mesmas listas que o perfil vê.
    window.portalInsights?.render({ profileKey, releases: individualStats.all || [], sheets: col.all || [] });
    // Dashboard (js/features/portal-dashboard.js): esteira do fluxo, "Para você agora" e números do menu.
    window.portalDashboard?.update({
      profileKey, releases: individualStats.all || [], sheets: col.all || [],
      own: individualStats.own ? { releases: individualStats.own, sheets: col.own || [] } : null
    });
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
    const session = viewerSession();
    const allReleases = await window.portalDemoStore?.getReleases() || [];
    const allVisible = window.portalReleaseActions.visibleFor(allReleases);
    // Encarregado, estagiário e segurança do trabalho veem (tabela, números e histórico) só o que eles mesmos solicitaram.
    const releases = foremanRoleValues.includes(profileKey)
      ? allVisible.filter((release) => requestedBy(release, session))
      : allVisible;
    // Mesma regra do quadro "Minha equipe": o administrador abrindo o perfil de encarregado não tem equipe própria.
    const foremanTeam = foremanRoleValues.includes(session?.roleValue)
      ? employees.filter((employee) => [session.name, ...(linkedRoleValues.includes(session.roleValue) ? linkedForemenOf(session) : [])].some((owner) => owner && employee.encarregado?.trim().toLowerCase() === owner.trim().toLowerCase()))
      : [];
    // Chefe de equipe (encarregado ou analista, inclusive o analista com acesso de DP, que abre o portal como DP):
    // o cartão "Equipe vinculada" é a equipe DELE e abre a janela da equipe, em qualquer painel.
    const isEngineerAnalyst = session?.roleValue === "analista" && (session.privileges || []).includes("engenheiro");
    const isTeamChief = session?.roleValue === "encarregado" || (session?.roleValue === "analista" && !isEngineerAnalyst);
    const ownTeam = isTeamChief
      ? employees.filter((employee) => employee.encarregado?.trim().toLowerCase() === String(session.name || "").trim().toLowerCase())
      : [];
    currentTeam = foremanRoleValues.includes(profileKey) ? foremanTeam : isTeamChief ? ownTeam : [];
    // Sem ninguém na equipe: o cartão mostra o total da obra e leva à página de Equipes (como para o DP).
    teamCardIsMine = currentTeam.length > 0;
    elements.team.textContent = teamCardIsMine ? currentTeam.length : profileKey === "portaria" ? profile.team : employees.length;
    const stageOf = window.portalReleaseFlow.stageOf;
    const rules = statRules(profileKey);
    // Encarregado, estagiário, analista e segurança: as listas mostram só o que eles pediram, mas os cartões de
    // informação (números, esteira, BI) mostram o que está acontecendo na obra toda — só para ver, sem levar aos filtros.
    const isChief = foremanRoleValues.includes(profileKey);
    const engineerObra = limitedEngineer(profileKey);
    const obra = isChief || engineerObra ? allReleases : releases;
    document.body.classList.toggle("info-only", isChief);
    // Individuais de cada cartão; o painel das coletivas soma as dele por cima (writeStats, chamado por refreshStats).
    individualStats = {
      profileKey,
      all: obra,
      own: isChief || engineerObra ? releases : null,
      // Engenheiro comum: "Liberações pendentes" = aguardando o abono DELE (o que ele tem para fazer).
      pending: (engineerObra ? releases : obra).filter(rules.pending),
      approved: obra.filter(rules.approved),
      bonus: obra.filter(rules.bonus),
      launched: obra.filter(rules.launched),
      toLaunch: obra.filter(rules.toLaunch)
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
      <li><span class="activity-dot ${["gate", "exited", "registered", "entered"].includes(stageOf(release)) ? "is-success" : ["engineer", "dp"].includes(stageOf(release)) ? "is-warning" : ""}"></span><div><strong>${escapeHtml(window.portalReleaseFlow.stages[stageOf(release)].label)}</strong><small>${escapeHtml(release.name)} · ${escapeHtml(release.time)}</small></div></li>
    `).join("") : "<li><div><strong>Nenhuma atividade local</strong><small>Cadastre colaboradores e registre liberações para começar.</small></div></li>";
  }

  const session = window.portalAuthDemo?.getSession();
  const isAdministrator = session?.roleValue === "administrador-analista" || session?.role === "Administrador Analista";
  // Analista é o perfil "coringa": com um acesso dado pelo administrador ele VIRA aquele perfil (sem "Acessar como").
  // Com acesso de DP, é DP; senão, engenheiro ou segurança do trabalho. Só com dois desses (sem DP) escolhe entre eles.
  const analystAccess = window.portalAuthDemo?.analystAccess?.() || [];
  const isDpDelegate = analystAccess.length > 0;
  const delegateProfiles = analystAccess.includes("dp") ? ["dp"] : ["engenheiro", "seguranca_trabalho"].filter((key) => analystAccess.includes(key));
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
      if (isDpDelegate) return delegateProfiles.includes(saved) ? saved : delegateProfiles[0];
      return profiles[saved] ? saved : "dp";
    } catch (error) {
      return isDpDelegate ? delegateProfiles[0] : "dp";
    }
  };
  let initialProfile = profiles[profileKey] ? profileKey : "dp";
  if (isAdministrator || isDpDelegate) {
    if (isDpDelegate) {
      // Só os painéis a que ele tem direito.
      [...elements.adminProfile.options].forEach((option) => { if (!delegateProfiles.includes(option.value)) option.remove(); });
      const hint = elements.adminSwitcher.querySelector("small");
      const names = [...elements.adminProfile.options].map((option) => option.textContent);
      if (hint) hint.textContent = `Você tem acesso a: ${names.join(" e ")}. Alterne entre esses painéis.`;
    }
    initialProfile = savedAdminProfile();
    // Analista com um acesso só (ex.: DP): vira esse perfil, sem a caixa "Acessar como".
    elements.adminSwitcher.hidden = isDpDelegate && delegateProfiles.length < 2;
    elements.adminProfile.value = initialProfile;
    elements.adminProfile.addEventListener("change", (event) => {
      // Na página Lixeira/Concluídas do menu, continua nela com o perfil novo.
      trashMode = pageMode() === "trash";
      doneMode = pageMode() === "done";
      statFilter = null;
      try { localStorage.setItem(adminProfileKey, event.target.value); } catch (error) { /* armazenamento indisponível */ }
      if (isAdministrator) choosePerson(event.target.value).then(() => renderProfile(event.target.value));
      else renderProfile(event.target.value);
    });
  }

  // Administrador: em todos os perfis escolhe QUEM simular; a tela fica igual à dessa pessoa (só as liberações dela,
  // a equipe dela, o que foi enviado a ela). O analista é o perfil coringa: com acesso de DP aparece na lista do DP;
  // com acesso de engenheiro/segurança (sem DP), na desses perfis; sem acesso nenhum, na de Analista.
  const PERSON_PROFILES = [...foremanRoleValues, "engenheiro", "dp", "portaria"];
  // Perfil da conta pelo código (roleValue) ou, em contas antigas/criadas de outro jeito, pelo nome do perfil escrito.
  const ROLE_ALIASES = {
    dp: ["dp", "departamento pessoal"], encarregado: ["encarregado"], analista: ["analista"],
    estagiario_engenharia: ["estagiario_engenharia", "estagiario de engenharia", "estagiario"],
    seguranca_trabalho: ["seguranca_trabalho", "seguranca do trabalho", "seguranca", "tecnico de seguranca", "tecnico de seguranca do trabalho"],
    engenheiro: ["engenheiro", "engenheiro responsavel"], porteiro: ["porteiro", "portaria"]
  };
  const roleOf = (user) => {
    for (const text of [user.roleValue, user.role]) {
      const key = window.normalizeSearchText(text).trim();
      const found = Object.keys(ROLE_ALIASES).find((role) => ROLE_ALIASES[role].includes(key));
      if (found) return found;
    }
    return user.roleValue || "";
  };
  // Conta liberada: aprovada, ou sem situação gravada (as que não passam por aprovação). Fora: pendente ou reprovada.
  const isActive = (user) => !user.status || user.status === "approved";
  const profilesOf = (user) => {
    const role = roleOf(user);
    if (role === "porteiro") return ["portaria"];
    if (role !== "analista") return [role];
    const access = (user.privileges || []).filter((key) => ["dp", "engenheiro", "seguranca_trabalho"].includes(key));
    if (access.includes("dp")) return ["dp"];
    return access.length ? access : ["analista"];
  };
  const personKey = (profile) => `issellPortalAdminPerson:${profile}`;
  let peopleCache = null;
  async function choosePerson(profile) {
    const select = elements.adminPerson;
    if (!select || !PERSON_PROFILES.includes(profile)) {
      window.portalViewAs = null;
      if (select) select.hidden = true;
      return;
    }
    try {
      peopleCache = peopleCache || await window.portalAuthDemo.getAllUsers();
    } catch (error) {
      console.warn("Não foi possível carregar as pessoas para o simulador.", error);
      peopleCache = [];
    }
    const people = peopleCache.filter((user) => isActive(user) && user.name && profilesOf(user).includes(profile))
      .sort((a, b) => a.name.localeCompare(b.name));
    // Analista transformado aparece com a marca, para saber que é um analista com acesso.
    const label = (user) => (roleOf(user) === "analista" && profile !== "analista" ? `${user.name} (analista)` : user.name);
    let saved = "";
    try { saved = localStorage.getItem(personKey(profile)) || ""; } catch (error) { /* armazenamento indisponível */ }
    const chosen = people.find((user) => user.id === saved) || people[0] || null;
    select.innerHTML = people.length
      ? people.map((user) => `<option value="${escapeHtml(user.id)}">${escapeHtml(label(user))}</option>`).join("")
      : '<option value="">Ninguém cadastrado neste perfil</option>';
    select.value = chosen?.id || "";
    select.hidden = false;
    window.portalViewAs = chosen ? {
      uid: chosen.id, name: chosen.name, email: chosen.email || "", role: chosen.role || "",
      roleValue: roleOf(chosen), especialidade: chosen.especialidade || "", linkedForeman: chosen.linkedForeman || "", linkedForemen: chosen.linkedForemen || [],
      privileges: Array.isArray(chosen.privileges) ? chosen.privileges : []
    } : null;
  }
  if (isAdministrator && elements.adminPerson) {
    elements.adminPerson.addEventListener("change", (event) => {
      try { localStorage.setItem(personKey(activeProfileKey), event.target.value); } catch (error) { /* armazenamento indisponível */ }
      choosePerson(activeProfileKey).then(() => renderProfile(activeProfileKey));
    });
  }
  elements.recordsSearch?.addEventListener("input", () => renderRecords(activeProfileKey));
  if (isAdministrator) choosePerson(initialProfile).then(() => renderProfile(initialProfile));
  else renderProfile(initialProfile);
})();
