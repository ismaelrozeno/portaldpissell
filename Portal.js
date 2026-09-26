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
      shortcuts: ["Conferir liberações", "Nova liberação", "Importar relatório do RM", "Fechamento mensal"],
      shortcutHrefs: ["#records-section", "Liberacao.html", "Importar-Colaboradores.html", "Fechamento.html"]
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

  const foremanRoleValues = ["encarregado", "estagiario_engenharia"];

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

  async function renderRecords(profile) {
    const session = window.portalAuthDemo?.getSession();
    const asDp = window.portalReleaseActions.actsAsDp(profile === "dp");
    const releases = window.portalReleaseActions.visibleFor(await window.portalDemoStore?.getReleases() || [], asDp);
    const profileReleases = foremanRoleValues.includes(profile) && foremanRoleValues.includes(session?.roleValue)
      ? releases.filter((release) => release.requester?.trim().toLowerCase() === session.name?.trim().toLowerCase())
      : releases;
    const flow = window.portalReleaseFlow;
    const actions = window.portalReleaseActions;
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
    const query = window.normalizeSearchText(elements.recordsSearch?.value || "");
    const visible = query
      ? rows.filter((row) => window.normalizeSearchText(`${row.release.name} ${row.release.team}`).includes(query))
      : rows;
    elements.table.innerHTML = visible.length ? visible.map(({ release, stage }) => `
      <tr>
        <td data-label="Colaborador"><strong>${escapeHtml(release.name)}</strong><small>Solicitante: ${escapeHtml(release.requester)}</small></td>
        <td data-label="Frente">${escapeHtml(release.team)}</td>
        <td data-label="Horário">${escapeHtml(release.time)}</td>
        <td data-label="Status"><span class="status-badge status-${flow.stages[stage].tone}">${flow.stages[stage].label}</span>${release.abonoLaunchedAt ? '<small class="row-launched">Abono lançado no RM</small>' : ""}</td>
        <td class="text-end row-actions" data-label="Ação">${actionsFor(profile, release, stage)}</td>
      </tr>
    `).join("") : `<tr><td colspan="5" class="empty-state">${query ? "Nenhum registro encontrado para a busca." : "Nenhum registro encontrado para este perfil."}</td></tr>`;
  }

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
      const asDp = actions.actsAsDp(activeProfileKey === "dp");
      if (!window.confirmDelete(actions.deleteQuestion(release, asDp))) return;
      if (activeProfileKey === "engenheiro" && !actions.ensureEngineerSignature()) return;
      await actions.deleteRelease(release, asDp);
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
      const pendingStages = { dp: ["dp"], portaria: [], encarregado: ["engineer", "foreman", "dp"], estagiario_engenharia: ["engineer", "foreman", "dp"] }[profileKey] || ["engineer", "foreman", "dp"];
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
      try { localStorage.setItem(adminProfileKey, event.target.value); } catch (error) { /* armazenamento indisponível */ }
      renderProfile(event.target.value);
    });
  }
  elements.recordsSearch?.addEventListener("input", () => renderRecords(activeProfileKey));
  renderProfile(initialProfile);
})();
