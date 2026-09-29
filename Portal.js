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
      shortcuts: ["Registrar liberação", "Consultar minha equipe", "Equipes e Excel", "Ver histórico"],
      shortcutHrefs: ["Liberacao.html", "#foreman-summary", "Equipes.html", "#activity-section"]
    },
    // Analista: por enquanto é o painel do estagiário de engenharia com outro nome.
    analista: {
      title: "Painel do analista",
      description: "Acompanhe sua equipe e registre as liberações do dia.",
      eyebrow: "Minha equipe",
      tableTitle: "Minhas liberações",
      action: "Nova liberação",
      actionHref: "Liberacao.html",
      team: "0",
      pending: "0",
      approved: "0",
      bonus: "0",
      shortcuts: ["Registrar liberação", "Consultar minha equipe", "Equipes e Excel", "Ver histórico"],
      shortcutHrefs: ["Liberacao.html", "#foreman-summary", "Equipes.html", "#activity-section"]
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
      shortcuts: ["Registrar liberação", "Consultar minha equipe", "Equipes e Excel", "Ver histórico"],
      shortcutHrefs: ["Liberacao.html", "#foreman-summary", "Equipes.html", "#activity-section"]
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
      shortcuts: ["Registrar liberação", "Consultar minha equipe", "Equipes e Excel", "Ver histórico"],
      shortcutHrefs: ["Liberacao.html", "#foreman-summary", "Equipes.html", "#activity-section"]
    },
    dp: {
      title: "Painel do Departamento Pessoal",
      description: "Confira as liberações, autorize saídas e organize os registros.",
      eyebrow: "Conferência do DP",
      tableTitle: "Liberações da obra",
      action: "Nova liberação",
      actionHref: "Liberacao.html",
      team: "0",
      pending: "0",
      approved: "0",
      bonus: "0",
      shortcuts: ["Conferir liberações", "Nova liberação", "Equipes e Excel", "Importar relatório do RM", "Fechamento mensal", "Backup e Excel"],
      shortcutHrefs: ["#records-section", "Liberacao.html", "Equipes.html", "Importar-Colaboradores.html", "Fechamento.html", "Backup.html"]
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
      shortcuts: ["Assinar abono", "Nova liberação", "Equipes e Excel", "Histórico de assinaturas"],
      shortcutHrefs: ["#records-section", "Liberacao.html", "Equipes.html", "#activity-section"]
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

  const foremanRoleValues = ["encarregado", "estagiario_engenharia", "analista", "seguranca_trabalho"];
  // Perfis que trabalham na equipe do encarregado a quem estão vinculados.
  const linkedRoleValues = ["estagiario_engenharia", "analista"];

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
          ? (session.linkedForeman ? `Analista · vinculado a ${session.linkedForeman}` : "Analista · escolha seu encarregado em Equipes e Excel")
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
  function signatureChips(release, stage) {
    const short = (name) => escapeHtml(String(name || "").trim());
    const chip = (tone, html) => `<span class="sig-chip sig-${tone}">${html}</span>`;
    const chips = [];
    if (stage === "foreman") {
      chips.push(chip("no", `Recusada por <b>${short(release.refusedBy)}</b>${release.refusalReason ? ` · ${escapeHtml(release.refusalReason)}` : ""}`));
    } else {
      // Pedido do encarregado (o que ele marcou no formulário) aparece sempre que existir, mesmo depois de
      // o engenheiro decidir, para dar para comparar o que foi pedido com o que foi assinado.
      if (release.bonusRequest) {
        chips.push(chip("info", `Pedido do encarregado: <b>${release.bonusRequest === "abonado" ? "Abonado" : "Não abonado"}</b>`));
      }
      if (release.engineer && release.bonusStatus) {
        chips.push(chip(release.bonusStatus === "approved" ? "yes" : "no", `Eng. <b>${short(release.engineer)}</b> · ${release.bonusStatus === "approved" ? "assinou como abonado" : "assinou como não abonado"}`));
      } else {
        chips.push(chip("wait", "Engenheiro: aguardando"));
      }
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
  // Liberações da última vez que a tela foi desenhada: o clique age na hora com elas, sem esperar o servidor.
  let releaseById = new Map();

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

  async function renderRecords(profile, prefetched) {
    const session = window.portalAuthDemo?.getSession();
    const actions = window.portalReleaseActions;
    const allReleases = prefetched || await window.portalDemoStore?.getReleases() || [];
    releaseById = new Map(allReleases.map((release) => [release.id, release]));
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
        <td data-label="Colaborador" class="col-who"><strong>${escapeHtml(release.name)}</strong><small class="row-role">${escapeHtml(release.role || "Função não informada")}</small><small class="row-who">Solicitante: ${escapeHtml(release.requester)}</small><small class="row-meta">${escapeHtml(release.team)} · ${escapeHtml(release.time)}</small>${signatureChips(release, stage)}</td>
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
    const visible = query ? rows.filter((row) => matches(row.release)) : rows;
    shownReleases = visible.map((row) => row.release);
    renderToolbar(visible.length, trashed.length);
    elements.table.innerHTML = visible.length ? visible.map(({ release, stage }) => `
      <tr>
        <td data-label="Colaborador" class="col-who"><strong>${escapeHtml(release.name)}</strong><small class="row-role">${escapeHtml(release.role || "Função não informada")}</small><small class="row-who">Solicitante: ${escapeHtml(release.requester)}</small><small class="row-meta">${escapeHtml(release.team)} · ${escapeHtml(release.time)}</small>${signatureChips(release, stage)}</td>
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
    const list = [...shownReleases];
    const dpContext = activeProfileKey === "dp";
    if (kind === "trash-all" && !await actions.confirmText(actions.trashAllQuestion(list.length))) return;
    if (kind === "restore-all" && !await actions.confirmText(actions.restoreAllQuestion(list.length))) return;
    if (kind === "empty") {
      if (!await actions.confirmText(actions.emptyQuestion(list.length, null, dpContext))) return;
      // Apagar do banco (DP/Admin) pede uma segunda confirmação: não tem volta.
      if (actions.canHardDelete(dpContext) && !await actions.confirmText("ÚLTIMO AVISO\n" + list.length + " liberação(ões) serão APAGADAS DO BANCO DE DADOS agora.\nIsso NÃO pode ser desfeito.", "Apagar do banco")) return;
    }
    const toolbarButtons = [...document.querySelectorAll("#records-toolbar button")];
    toolbarButtons.forEach((item) => { item.disabled = true; });
    const label = button.textContent;
    button.textContent = "Salvando…";
    try {
      if (kind === "trash-all") await actions.trashMany(list);
      else if (kind === "restore-all") await actions.restoreMany(list);
      else if (kind === "empty") await actions.emptyTrashMany(list, dpContext);
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
      } else if (action === "authorize" || action === "deny") {
        if (!actions.dpCanDecide(release)) return refresh();
        run = () => actions.dpDecide(release, action === "authorize");
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

  async function renderProfileNow(profileKey) {
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
    // Botão extra ao lado do principal: "Equipes" é um poder do estagiário de engenharia.
    elements.secondaryAction.hidden = !linkedRoleValues.includes(profileKey);
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
    // Engenheiro: conta pelo abono ainda nao decidido, nao só pelo estágio — o DP pode
    // autorizar a saída antes dele decidir, então a pendência dele continua existindo
    // mesmo quando a liberação já passou para "dp"/"gate"/"exited".
    if (profileKey === "engenheiro") {
      elements.pending.textContent = releases.filter((release) => !release.bonusStatus && !["foreman", "closed"].includes(stageOf(release))).length;
    } else {
      const pendingStages = { dp: ["dp"], portaria: [], encarregado: ["engineer", "foreman", "dp"], estagiario_engenharia: ["engineer", "foreman", "dp"], analista: ["engineer", "foreman", "dp"], seguranca_trabalho: ["engineer", "foreman", "dp"] }[profileKey] || ["engineer", "foreman", "dp"];
      elements.pending.textContent = releases.filter((release) => pendingStages.includes(stageOf(release))).length;
    }
    // "Autorizadas hoje": só as que o DP autorizou hoje (data local), não todas as já autorizadas.
    const localDay = (value) => {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? "" : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    };
    const today = localDay(Date.now());
    elements.approved.textContent = releases.filter((release) => ["gate", "exited"].includes(stageOf(release))
      && (release.dpDecisionAt ? localDay(release.dpDecisionAt) : release.date) === today).length;
    // "Pendências de abono · aguardando engenheiro": liberações em andamento cujo abono o engenheiro ainda não decidiu.
    elements.bonus.textContent = profileKey === "portaria" ? profile.bonus : releases.filter((release) => !release.bonusStatus && !["foreman", "closed"].includes(stageOf(release))).length;
    renderForemanSummary(profileKey, employees);
    const shortcutTitle = profile.title.replace(/^Painel d[oa] /, "");
    elements.shortcutTitle.textContent = foremanRoleValues.includes(profileKey) ? "Operação" : shortcutTitle.charAt(0).toUpperCase() + shortcutTitle.slice(1);
    elements.shortcutList.innerHTML = profile.shortcuts.map((shortcut, index) => {
      const href = (profile.shortcutHrefs && profile.shortcutHrefs[index]) || (foremanRoleValues.includes(profileKey) && index === 0 ? "Liberacao.html" : `#${profileKey}-${index + 1}`);
      return `<a class="shortcut-item" href="${href}"><span class="shortcut-icon">${index + 1}</span>${shortcut}</a>`;
    }).join("");
    await renderRecords(profileKey, allReleases);
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
