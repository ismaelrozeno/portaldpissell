(async () => {
  await window.portalAuthDemo?.ready();
  const profiles = {
    encarregado: {
      title: "Painel do encarregado",
      description: "Acompanhe sua equipe e registre as liberações do dia.",
      eyebrow: "Minha equipe",
      tableTitle: "Minhas liberações",
      action: "Nova liberação",
      actionHref: "Liberacao.html",
      team: "0",
      pending: "0",
      approved: "0",
      bonus: "0",
      shortcuts: ["Registrar liberação", "Consultar minha equipe", "Ver histórico"],
      shortcutHrefs: ["Liberacao.html", "#foreman-summary", "#activity-section"]
    },
    estagiario_engenharia: {
      title: "Painel do estagiário de engenharia",
      description: "Acompanhe sua equipe e registre as liberações do dia.",
      eyebrow: "Minha equipe",
      tableTitle: "Minhas liberações",
      action: "Nova liberação",
      actionHref: "Liberacao.html",
      team: "0",
      pending: "0",
      approved: "0",
      bonus: "0",
      shortcuts: ["Registrar liberação", "Consultar minha equipe", "Ver histórico"],
      shortcutHrefs: ["Liberacao.html", "#foreman-summary", "#activity-section"]
    },
    seguranca_trabalho: {
      title: "Painel da segurança do trabalho",
      description: "Acompanhe sua equipe e registre as liberações do dia.",
      eyebrow: "Minha equipe",
      tableTitle: "Minhas liberações",
      action: "Nova liberação",
      actionHref: "Liberacao.html",
      team: "0",
      pending: "0",
      approved: "0",
      bonus: "0",
      shortcuts: ["Registrar liberação", "Consultar minha equipe", "Ver histórico"],
      shortcutHrefs: ["Liberacao.html", "#foreman-summary", "#activity-section"]
    },
    dp: {
      title: "Painel do Departamento Pessoal",
      description: "Confira as liberações, autorize saídas e organize os registros.",
      eyebrow: "Conferência do DP",
      tableTitle: "Aguardando autorização",
      action: "Nova liberação",
      actionHref: "Liberacao.html",
      team: "0",
      pending: "0",
      approved: "0",
      bonus: "0",
      shortcuts: ["Conferir liberações", "Nova liberação", "Importar relatório do RM", "Fechamento mensal", "Backup e Excel"],
      shortcutHrefs: ["#records-section", "Liberacao.html", "Importar-Colaboradores.html", "Fechamento.html", "Backup.html"]
    },
    engenheiro: {
      title: "Painel do engenheiro responsável",
      description: "Você recebe as liberações primeiro: decida o abono ou recuse devolvendo ao encarregado.",
      eyebrow: "Assinaturas pendentes",
      tableTitle: "Liberações para análise",
      action: "Nova liberação",
      actionHref: "Liberacao.html",
      team: "0",
      pending: "0",
      approved: "0",
      bonus: "0",
      shortcuts: ["Assinar abono", "Nova liberação", "Consultar frentes", "Histórico de assinaturas"],
      shortcutHrefs: ["#records-section", "Liberacao.html", "#records-section", "#activity-section"]
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
    shortcutTitle: document.querySelector("#shortcut-title"),
    shortcutList: document.querySelector("#shortcut-list"),
    table: document.querySelector("#records-table"),
    recordsSearch: document.querySelector("#records-search"),
    team: document.querySelector("#stat-team"),
    pending: document.querySelector("#stat-pending"),
    approved: document.querySelector("#stat-approved"),
    bonus: document.querySelector("#stat-bonus"),
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

  const foremanRoleValues = ["encarregado", "estagiario_engenharia", "seguranca_trabalho"];

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
        ? "Estagiário de Engenharia"
        : session?.roleValue === "seguranca_trabalho"
          ? "Segurança do trabalho"
          : "selecione um cadastro de encarregado para visualizar";
    const team = isActingForeman
      ? employees.filter((employee) => employee.encarregado?.trim().toLowerCase() === session.name.trim().toLowerCase())
      : [];

    elements.foremanName.textContent = name;
    elements.foremanSpecialty.textContent = specialty;
    elements.foremanTeamCount.textContent = `${team.length} ${team.length === 1 ? "colaborador" : "colaboradores"}`;
    elements.foremanTeamList.innerHTML = team.length
      ? team.map((employee) => `<li><a href="Liberacao.html?employee=${encodeURIComponent(employee.matricula)}" title="Criar liberação para ${escapeHtml(employee.nome)}"><strong>${escapeHtml(employee.nome)}</strong><small>${escapeHtml(employee.funcao)} · Matrícula ${escapeHtml(employee.matricula)}</small></a></li>`).join("")
      : "<li>Nenhum colaborador vinculado a este encarregado.</li>";
  }

  // Resumo visual das assinaturas já feitas (engenheiro, DP, portaria) para dar para ler a situação de relance.
  function signatureChips(release, stage) {
    const short = (name) => escapeHtml(String(name || "").trim());
    const chip = (tone, html) => `<span class="sig-chip sig-${tone}">${html}</span>`;
    const chips = [];
    if (stage === "foreman") {
      chips.push(chip("no", `Recusada por <b>${short(release.refusedBy)}</b>${release.refusalReason ? ` · ${escapeHtml(release.refusalReason)}` : ""}`));
    } else if (release.engineer && release.bonusStatus) {
      chips.push(chip(release.bonusStatus === "approved" ? "yes" : "no", `Eng. <b>${short(release.engineer)}</b> · ${release.bonusStatus === "approved" ? "assinou como abonado" : "assinou como não abonado"}`));
    } else {
      chips.push(chip("wait", "Engenheiro: aguardando"));
    }
    if (stage !== "foreman") {
      if (release.dpSigner) {
        chips.push(chip(stage === "closed" ? "no" : "yes", `DP <b>${short(release.dpSigner)}</b> · ${stage === "closed" ? "negou" : "assinou"}`));
      } else {
        chips.push(chip("wait", "DP: aguardando"));
      }
      if (release.exitConfirmedBy) {
        chips.push(chip("info", `Portaria <b>${short(release.exitConfirmedBy)}</b> · assinou`));
      } else if (stage === "gate") {
        chips.push(chip("wait", "Portaria: aguardando saída"));
      }
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
      const decide = actions.dpCanDecide(release) ? `${btn("row-yes-btn", "authorize", "Autorizar saída")}${btn("row-no-btn", "deny", "Negar")}` : "";
      // O lançamento do abono no RM é feito só na folha de liberação ("Visualizar liberação").
      return `${decide}${view}${del}`;
    }
    // Encarregado / estagiário: só edita e reenvia quando o engenheiro recusou. "Apagar" só some do histórico dele.
    const edit = stage === "foreman" ? `<a class="table-action" href="Liberacao.html?edit=${encodeURIComponent(release.id)}">Editar e reenviar</a>` : "";
    return `${view}${edit}${del}`;
  }

  // Lixeira: cada usuário tem a sua. "Apagar" manda para ela; de lá restaura ou apaga de vez.
  let trashMode = false;
  let shownReleases = [];

  function renderToolbar(visibleCount, trashCount) {
    const canHard = window.portalReleaseActions.canHardDelete(activeProfileKey === "dp");
    const notice = document.querySelector("#trash-notice");
    const toolbar = document.querySelector("#records-toolbar");
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
        <button class="toolbar-btn toolbar-danger" type="button" data-toolbar="trash-all" ${visibleCount ? "" : "disabled"}>Apagar tudo (mover para a lixeira)</button>`;
      notice.hidden = true;
    }
  }

  async function renderRecords(profile) {
    const session = window.portalAuthDemo?.getSession();
    const actions = window.portalReleaseActions;
    const allReleases = await window.portalDemoStore?.getReleases() || [];
    const trashed = actions.trashFor(allReleases);
    const releases = actions.visibleFor(allReleases);
    const flow = window.portalReleaseFlow;
    const query = window.normalizeSearchText(elements.recordsSearch?.value || "");
    const matches = (release) => !query || window.normalizeSearchText(`${release.name} ${release.team}`).includes(query);

    if (trashMode) {
      const rows = trashed.filter(matches);
      shownReleases = rows;
      renderToolbar(releases.length, trashed.length);
      elements.table.innerHTML = rows.length ? rows.map((release) => {
        const stage = flow.stageOf(release);
        return `
      <tr>
        <td data-label="Colaborador" class="col-who"><strong>${escapeHtml(release.name)}</strong><small class="row-who">Solicitante: ${escapeHtml(release.requester)}</small><small class="row-meta">${escapeHtml(release.team)} · ${escapeHtml(release.time)}</small>${signatureChips(release, stage)}</td>
        <td data-label="Frente" class="col-frente">${escapeHtml(release.team)}</td>
        <td data-label="Horário" class="col-horario">${escapeHtml(release.time)}</td>
        <td data-label="Status" class="col-status"><span class="status-badge status-${flow.stages[stage].tone}">${flow.stages[stage].label}</span></td>
        <td class="text-end row-actions col-actions" data-label="Ação">
          <button class="row-yes-btn" type="button" data-row-action="restore" data-release-id="${escapeHtml(release.id)}">Restaurar</button>
          <button class="release-view-btn" type="button" data-row-action="view" data-release-id="${escapeHtml(release.id)}">Visualizar liberação</button>
          <button class="row-delete-btn" type="button" data-row-action="purge" data-release-id="${escapeHtml(release.id)}">${actions.canHardDelete(activeProfileKey === "dp") ? "Apagar do banco" : "Apagar de vez"}</button>
        </td>
      </tr>`;
      }).join("") : `<tr><td colspan="5" class="empty-state">${query ? "Nenhum registro encontrado para a busca." : "A lixeira está vazia."}</td></tr>`;
      return;
    }

    const profileReleases = foremanRoleValues.includes(profile) && foremanRoleValues.includes(session?.roleValue)
      ? releases.filter((release) => release.requester?.trim().toLowerCase() === session.name?.trim().toLowerCase())
      : releases;
    // Ordem: o que precisa da ação do perfil aparece primeiro.
    const priority = {
      portaria: (release, stage) => (stage === "gate" ? 0 : 1),
      engenheiro: (release, stage) => (actions.engineerCanAct(release) ? 0 : 1),
      dp: (release, stage) => (actions.dpCanDecide(release) ? 0 : actions.needsLaunch(release) ? 1 : 2)
    }[profile];
    let rows = profileReleases.map((release) => ({ release, stage: flow.stageOf(release) }));
    // Portaria: só o que o DP autorizou.
    if (profile === "portaria") rows = rows.filter((row) => row.stage === "gate" || row.stage === "exited");
    if (priority) rows = rows.map((row, index) => ({ ...row, index })).sort((a, b) => priority(a.release, a.stage) - priority(b.release, b.stage) || a.index - b.index);
    const visible = query ? rows.filter((row) => matches(row.release)) : rows;
    shownReleases = visible.map((row) => row.release);
    renderToolbar(visible.length, trashed.length);
    elements.table.innerHTML = visible.length ? visible.map(({ release, stage }) => `
      <tr>
        <td data-label="Colaborador" class="col-who"><strong>${escapeHtml(release.name)}</strong><small class="row-who">Solicitante: ${escapeHtml(release.requester)}</small><small class="row-meta">${escapeHtml(release.team)} · ${escapeHtml(release.time)}</small>${signatureChips(release, stage)}</td>
        <td data-label="Frente" class="col-frente">${escapeHtml(release.team)}</td>
        <td data-label="Horário" class="col-horario">${escapeHtml(release.time)}</td>
        <td data-label="Status" class="col-status"><span class="status-badge status-${flow.stages[stage].tone}">${flow.stages[stage].label}</span>${release.abonoLaunchedAt ? '<small class="row-launched">Abono lançado no RM</small>' : ""}</td>
        <td class="text-end row-actions col-actions" data-label="Ação">${actionsFor(profile, release, stage)}</td>
      </tr>
    `).join("") : `<tr><td colspan="5" class="empty-state">${query ? "Nenhum registro encontrado para a busca." : "Nenhum registro encontrado para este perfil."}</td></tr>`;
  }

  // Botões da barra (Lixeira, Apagar tudo, Restaurar tudo, Esvaziar lixeira).
  document.querySelector("#records-toolbar").addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-toolbar]");
    if (!button || button.disabled) return;
    const actions = window.portalReleaseActions;
    const refresh = () => renderProfile(activeProfileKey);
    const kind = button.dataset.toolbar;
    if (kind === "open-trash" || kind === "back") {
      trashMode = kind === "open-trash";
      return renderRecords(activeProfileKey);
    }
    if (!shownReleases.length) return;
    if (kind === "trash-all") {
      if (!window.confirm(actions.trashAllQuestion(shownReleases.length))) return;
      await actions.trashMany(shownReleases);
    } else if (kind === "restore-all") {
      if (!window.confirm(actions.restoreAllQuestion(shownReleases.length))) return;
      await actions.restoreMany(shownReleases);
    } else if (kind === "empty") {
      const dpContext = activeProfileKey === "dp";
      if (!window.confirm(actions.emptyQuestion(shownReleases.length, null, dpContext))) return;
      // Apagar do banco (DP/Admin) pede uma segunda confirmação: não tem volta.
      if (actions.canHardDelete(dpContext) && !window.confirm("ÚLTIMO AVISO\n\n" + shownReleases.length + " liberação(ões) serão APAGADAS DO BANCO DE DADOS agora.\nIsso NÃO pode ser desfeito.\n\nClique em OK só se tiver certeza.")) return;
      await actions.emptyTrashMany(shownReleases, dpContext);
    }
    return refresh();
  });

  // Todas as ações da tabela passam por aqui.
  elements.table.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-row-action]");
    if (!button) return;
    const actions = window.portalReleaseActions;
    const flow = window.portalReleaseFlow;
    const action = button.dataset.rowAction;
    const releases = await window.portalDemoStore?.getReleases() || [];
    const release = releases.find((item) => item.id === button.dataset.releaseId);
    const refresh = () => renderProfile(activeProfileKey);
    if (!release) return refresh();

    if (action === "view") {
      window.portalReleasePreview.show(release, { dpContext: activeProfileKey === "dp" });
      return;
    }
    if (action === "delete") {
      if (!window.confirm(actions.trashQuestion(release))) return;
      await actions.trashRelease(release);
      return refresh();
    }
    if (action === "restore") {
      await actions.restoreRelease(release);
      return refresh();
    }
    if (action === "purge") {
      const dpContext = activeProfileKey === "dp";
      if (!window.confirm(actions.emptyQuestion(1, release, dpContext))) return;
      await actions.emptyTrashItem(release, dpContext);
      return refresh();
    }
    if (action === "confirm-exit") {
      if (flow.stageOf(release) !== "gate") return refresh();
      if (!window.confirm(`Confirmar a saída de ${release.name}?`)) return;
      await actions.confirmExit(release);
      return refresh();
    }
    if (action === "authorize" || action === "deny") {
      if (!actions.dpCanDecide(release)) return refresh();
      await actions.dpDecide(release, action === "authorize");
      return refresh();
    }
    // Engenheiro: abonar, não abonar ou recusar (exige a assinatura do engenheiro)
    if (action === "refuse" ? !actions.engineerCanRefuse(release) : !actions.engineerCanAct(release)) return refresh();
    if (!actions.ensureEngineerSignature()) return;
    if (action === "refuse") {
      actions.openRefuseDialog(release, refresh);
      return;
    }
    await actions.engineerToggleDecision(release, action);
    return refresh();
  });

  let activeProfileKey = null;
  document.addEventListener("portal:release-changed", () => { if (activeProfileKey) renderProfile(activeProfileKey); });

  async function renderProfile(profileKey) {
    activeProfileKey = profileKey;
    const profile = profiles[profileKey];
    elements.title.textContent = profile.title;
    elements.description.textContent = profile.description;
    elements.eyebrow.textContent = profile.eyebrow;
    elements.tableTitle.textContent = profile.tableTitle;
    // A portaria não cria liberação: sem botão principal (tudo fica na tabela).
    elements.primaryAction.hidden = !profile.action;
    elements.primaryAction.textContent = profile.action;
    elements.primaryAction.href = profile.actionHref || "#";
    const employees = await window.portalEmployeeStore?.getAll() || [];
    const releases = window.portalReleaseActions.visibleFor(await window.portalDemoStore?.getReleases() || [], window.portalReleaseActions.actsAsDp(profileKey === "dp"));
    const session = window.portalAuthDemo?.getSession();
    const foremanTeam = foremanRoleValues.includes(profileKey) && foremanRoleValues.includes(session?.roleValue)
      ? employees.filter((employee) => employee.encarregado?.trim().toLowerCase() === session.name.trim().toLowerCase())
      : employees;
    elements.team.textContent = foremanRoleValues.includes(profileKey) ? foremanTeam.length : profileKey === "dp" ? employees.length : profile.team;
    const stageOf = window.portalReleaseFlow.stageOf;
    // Engenheiro: conta pelo abono ainda nao decidido, nao só pelo estágio — o DP pode
    // autorizar a saída antes dele decidir, então a pendência dele continua existindo
    // mesmo quando a liberação já passou para "dp"/"gate"/"exited".
    if (profileKey === "engenheiro") {
      elements.pending.textContent = releases.filter((release) => !release.bonusStatus && !["foreman", "closed"].includes(stageOf(release))).length;
    } else {
      const pendingStages = { dp: ["dp"], portaria: [], encarregado: ["engineer", "foreman", "dp"], estagiario_engenharia: ["engineer", "foreman", "dp"], seguranca_trabalho: ["engineer", "foreman", "dp"] }[profileKey] || ["engineer", "foreman", "dp"];
      elements.pending.textContent = releases.filter((release) => pendingStages.includes(stageOf(release))).length;
    }
    elements.approved.textContent = releases.filter((release) => ["gate", "exited"].includes(stageOf(release))).length;
    elements.bonus.textContent = releases.filter((release) => release.bonusStatus === "approved" && ["gate", "exited"].includes(stageOf(release))).length;
    renderForemanSummary(profileKey, employees);
    elements.shortcutTitle.textContent = foremanRoleValues.includes(profileKey) ? "Operação" : profile.title.replace("Painel do ", "");
    elements.shortcutList.innerHTML = profile.shortcuts.map((shortcut, index) => {
      const href = (profile.shortcutHrefs && profile.shortcutHrefs[index]) || (foremanRoleValues.includes(profileKey) && index === 0 ? "Liberacao.html" : `#${profileKey}-${index + 1}`);
      return `<a class="shortcut-item" href="${href}"><span class="shortcut-icon">${index + 1}</span>${shortcut}</a>`;
    }).join("");
    await renderRecords(profileKey);
    const recent = releases.slice(0, 3);
    elements.activity.innerHTML = recent.length ? recent.map((release) => `
      <li><span class="activity-dot ${["gate", "exited"].includes(stageOf(release)) ? "is-success" : ["engineer", "dp"].includes(stageOf(release)) ? "is-warning" : ""}"></span><div><strong>${escapeHtml(window.portalReleaseFlow.stages[stageOf(release)].label)}</strong><small>${escapeHtml(release.name)} · ${escapeHtml(release.time)}</small></div></li>
    `).join("") : "<li><div><strong>Nenhuma atividade local</strong><small>Cadastre colaboradores e registre liberações para começar.</small></div></li>";
  }

  const session = window.portalAuthDemo?.getSession();
  const isAdministrator = session?.roleValue === "administrador-analista" || session?.role === "Administrador Analista";
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
      return profiles[saved] ? saved : "dp";
    } catch (error) {
      return "dp";
    }
  };
  let initialProfile = profiles[profileKey] ? profileKey : "dp";
  if (isAdministrator) {
    initialProfile = savedAdminProfile();
    elements.adminSwitcher.hidden = false;
    elements.adminProfile.value = initialProfile;
    elements.adminProfile.addEventListener("change", (event) => {
      trashMode = false;
      try { localStorage.setItem(adminProfileKey, event.target.value); } catch (error) { /* armazenamento indisponível */ }
      renderProfile(event.target.value);
    });
  }
  elements.recordsSearch?.addEventListener("input", () => renderRecords(activeProfileKey));
  renderProfile(initialProfile);
})();
