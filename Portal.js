(async () => {
  await window.portalAuthDemo?.ready();
  const profiles = {
    encarregado: {
      title: "Painel do encarregado",
      description: "Acompanhe sua equipe e registre as liberações do dia.",
      eyebrow: "Minha equipe",
      tableTitle: "Liberações do dia",
      action: "Nova liberação",
      actionHref: "Liberacao.html",
      team: "0",
      pending: "0",
      approved: "0",
      bonus: "0",
      shortcuts: ["Registrar liberação", "Consultar minha equipe", "Ver histórico"],
      shortcutHrefs: ["Liberacao.html", "#encarregado-equipe", "#encarregado-historico"]
    },
    dp: {
      title: "Painel do Departamento Pessoal",
      description: "Confira as liberações, autorize saídas e organize os registros.",
      eyebrow: "Conferência do DP",
      tableTitle: "Aguardando autorização",
      action: "Conferir liberações",
      actionHref: "DP-Liberacoes.html",
      team: "0",
      pending: "0",
      approved: "0",
      bonus: "0",
      shortcuts: ["Conferir liberações", "Importar relatório do RM", "Fechamento mensal"],
      shortcutHrefs: ["DP-Liberacoes.html", "Importar-Colaboradores.html", "Fechamento.html"]
    },
    engenheiro: {
      title: "Painel do engenheiro responsável",
      description: "Revise e assine individualmente os abonos que dependem da sua decisão.",
      eyebrow: "Assinaturas pendentes",
      tableTitle: "Abonos para análise",
      action: "Ver pendências",
      actionHref: "Engenheiro.html",
      team: "0",
      pending: "0",
      approved: "0",
      bonus: "0",
      shortcuts: ["Assinar abono", "Consultar frentes", "Histórico de assinaturas"],
      shortcutHrefs: ["Engenheiro.html", "#engenheiro-frentes", "#engenheiro-historico"]
    },
    portaria: {
      title: "Painel da portaria",
      description: "Consulte as autorizações registradas antes de liberar a saída.",
      eyebrow: "Consulta de hoje",
      tableTitle: "Autorizações do dia",
      action: "Pesquisar autorização",
      actionHref: "Portaria.html",
      team: "—",
      pending: "0",
      approved: "0",
      bonus: "—",
      shortcuts: ["Consultar matrícula", "Ver histórico", "Orientações da portaria"],
      shortcutHrefs: ["Portaria.html", "#portaria-historico", "#portaria-orientacoes"]
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

  function renderForemanSummary(profileKey, employees) {
    const session = window.portalAuthDemo?.getSession();
    const isForeman = profileKey === "encarregado";
    elements.foremanSummary.hidden = !isForeman;
    if (!isForeman) return;

    const name = session?.roleValue === "encarregado" && session.name
      ? session.name
      : session?.name || "Encarregado";
    const specialty = session?.roleValue === "encarregado"
      ? specialtyLabels[session.especialidade] || "área não informada"
      : "selecione um cadastro de encarregado para visualizar";
    const team = session?.roleValue === "encarregado"
      ? employees.filter((employee) => employee.encarregado?.trim().toLowerCase() === session.name.trim().toLowerCase())
      : [];

    elements.foremanName.textContent = name;
    elements.foremanSpecialty.textContent = specialty;
    elements.foremanTeamCount.textContent = `${team.length} ${team.length === 1 ? "colaborador" : "colaboradores"}`;
    elements.foremanTeamList.innerHTML = team.length
      ? team.map((employee) => `<li><strong>${escapeHtml(employee.nome)}</strong><small>${escapeHtml(employee.funcao)} · Matrícula ${escapeHtml(employee.matricula)}</small></li>`).join("")
      : "<li>Nenhum colaborador vinculado a este encarregado.</li>";
  }

  function renderRecords(profile) {
    const session = window.portalAuthDemo?.getSession();
    const releases = window.portalDemoStore?.getReleases() || [];
    const profileReleases = profile === "encarregado" && session?.roleValue === "encarregado"
      ? releases.filter((release) => release.requester?.trim().toLowerCase() === session.name?.trim().toLowerCase())
      : releases;
    const records = profileReleases.map((release) => [
      release.name,
      release.team,
      release.time,
      release.status === "authorized" ? "Autorizado" : release.status === "denied" ? "Negado" : "Aguardando DP",
      release.status === "authorized" ? "approved" : release.status === "denied" ? "denied" : "pending",
      release.id
    ]);
    const visibleRecords = profile === "portaria" ? records.filter((record) => record[4] === "approved") : records;
    elements.table.innerHTML = visibleRecords.map((record) => `
      <tr>
        <td><strong>${escapeHtml(record[0])}</strong><small>Registro local</small></td>
        <td>${escapeHtml(record[1])}</td>
        <td>${escapeHtml(record[2])}</td>
        <td><span class="status-badge status-${record[4]}">${record[3]}</span></td>
        <td class="text-end"><a class="table-action" href="${profile === "encarregado" ? `Liberacao.html?edit=${encodeURIComponent(record[5])}` : profile === "dp" ? `DP-Liberacoes.html?release=${encodeURIComponent(record[5])}` : profile === "portaria" ? `Portaria.html?release=${encodeURIComponent(record[5])}` : `Engenheiro.html?release=${encodeURIComponent(record[5])}`}">${profile === "encarregado" ? "Editar" : "Consultar"}</a></td>
      </tr>
    `).join("");
  }

  function renderProfile(profileKey) {
    const profile = profiles[profileKey];
    elements.title.textContent = profile.title;
    elements.description.textContent = profile.description;
    elements.eyebrow.textContent = profile.eyebrow;
    elements.tableTitle.textContent = profile.tableTitle;
    elements.primaryAction.textContent = profile.action;
    elements.primaryAction.href = profile.actionHref;
    const employees = window.portalEmployeeStore?.getAll() || [];
    const releases = window.portalDemoStore?.getReleases() || [];
    const session = window.portalAuthDemo?.getSession();
    const foremanTeam = profileKey === "encarregado" && session?.roleValue === "encarregado"
      ? employees.filter((employee) => employee.encarregado?.trim().toLowerCase() === session.name.trim().toLowerCase())
      : employees;
    elements.team.textContent = profileKey === "encarregado" ? foremanTeam.length : profileKey === "dp" ? employees.length : profile.team;
    elements.pending.textContent = releases.filter((release) => release.status === "pending").length;
    elements.approved.textContent = releases.filter((release) => release.status === "authorized").length;
    elements.bonus.textContent = releases.filter((release) => release.hours === "Abonado" && release.status === "authorized").length;
    renderForemanSummary(profileKey, employees);
    elements.shortcutTitle.textContent = profileKey === "encarregado" ? "Operação" : profile.title.replace("Painel do ", "");
    elements.shortcutList.innerHTML = profile.shortcuts.map((shortcut, index) => {
      const href = (profile.shortcutHrefs && profile.shortcutHrefs[index]) || (profileKey === "encarregado" && index === 0 ? "Liberacao.html" : `#${profileKey}-${index + 1}`);
      return `<a class="shortcut-item" href="${href}"><span class="shortcut-icon">${index + 1}</span>${shortcut}</a>`;
    }).join("");
    renderRecords(profileKey);
    const recent = releases.slice(0, 3);
    elements.activity.innerHTML = recent.length ? recent.map((release) => `
      <li><span class="activity-dot ${release.status === "authorized" ? "is-success" : release.status === "pending" ? "is-warning" : ""}"></span><div><strong>Liberação ${release.status === "authorized" ? "autorizada" : release.status === "denied" ? "negada" : "aguardando análise"}</strong><small>${escapeHtml(release.name)} · ${escapeHtml(release.time)}</small></div></li>
    `).join("") : "<li><div><strong>Nenhuma atividade local</strong><small>Cadastre colaboradores e registre liberações para começar.</small></div></li>";
  }

  const session = window.portalAuthDemo?.getSession();
  const isAdministrator = session?.roleValue === "administrador-analista" || session?.role === "Administrador Analista";
  const profileKey = session?.roleValue
    || (session?.role?.toLowerCase().includes("engenheiro") ? "engenheiro"
      : session?.role?.toLowerCase().includes("porteiro") ? "portaria"
        : isAdministrator ? "dp" : "dp");
  if (isAdministrator) {
    elements.adminSwitcher.hidden = false;
    elements.adminProfile.value = "dp";
    elements.adminProfile.addEventListener("change", (event) => renderProfile(event.target.value));
  }
  renderProfile(profiles[profileKey] ? profileKey : "dp");
})();
