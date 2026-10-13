// Equipes dos engenheiros: o DP, o administrador e os engenheiros montam; o restante do pessoal só consulta.
// Cada engenheiro tem a sua equipe de ENCARREGADOS (só encarregados).
// O vínculo fica no cadastro do encarregado (campo "linkedEngineer") e decide para qual engenheiro vão as liberações
// dele (js/core/firebase-auth.js, getEngineerRouting). Não existe "todos os engenheiros"; só o Gestor recebe tudo.
(async () => {
  await window.portalAuthDemo?.ready();
  const session = window.portalAuthDemo?.getSession();
  const isAdmin = session?.roleValue === "administrador-analista";
  const isDp = session?.roleValue === "dp" || !!window.portalAuthDemo?.isDpDelegate?.();
  // Engenheiro (ou analista com acesso de engenheiro): monta as equipes como o DP.
  const isEngineerUser = session?.roleValue === "engenheiro"
    || (session?.roleValue === "analista" && (session.privileges || []).includes("engenheiro"));
  const canEdit = isAdmin || isDp || isEngineerUser;
  const $ = (selector) => document.querySelector(selector);
  const fold = (value) => String(value || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  const same = (a, b) => fold(a) === fold(b) && fold(a) !== "";

  // Portaria não usa equipes (e o banco não deixa listar as contas); o resto do pessoal consulta.
  if (!session || session.roleValue === "porteiro") {
    $("#teams-denied").hidden = false;
    $("#teams-app").hidden = true;
    $("#teams-steps").hidden = true;
    return;
  }

  const show = (element, text, isError) => {
    element.textContent = text;
    element.classList.toggle("is-error", !!isError);
    element.hidden = false;
  };

  let engineers = [];
  let foremen = [];
  let openedEngineer = "";
  // Função de cada encarregado, do cadastro de colaboradores (pela matrícula da conta ou, sem ela, pelo nome).
  let roleByMatricula = new Map();
  let roleByName = new Map();
  const roleOf = (user) => (user.accounts || [user]).map((account) => roleByMatricula.get(String(account.matricula || "")) || roleByName.get(fold(account.name))).find(Boolean) || (user.roleValue === "analista" ? "Analista" : "Encarregado");

  const isEngineerLike = (user) => user.roleValue === "engenheiro" || (user.roleValue === "analista" && (user.privileges || []).includes("engenheiro"));
  const isManager = (user) => (user.privileges || []).includes("gestor");
  const byName = (a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });

  // Contas com o mesmo nome (cadastro feito duas vezes) viram UM cartão: as liberações vão pelo nome, então o vínculo
  // é gravado em todas elas. O cartão avisa quantas contas há, para o administrador apagar a que sobra.
  function group(list) {
    const byKey = new Map();
    list.forEach((user) => {
      const key = fold(user.name);
      if (!byKey.has(key)) byKey.set(key, { ...user, ids: [], accounts: [] });
      const item = byKey.get(key);
      item.ids.push(user.id);
      item.accounts.push(user);
      if (isManager(user)) item.privileges = [...new Set([...(item.privileges || []), "gestor"])];
      if (!item.linkedEngineer && user.linkedEngineer) item.linkedEngineer = user.linkedEngineer;
    });
    return [...byKey.values()].sort(byName);
  }

  function apply(directory) {
    // O Gestor recebe as liberações de todos: não tem equipe, então não aparece aqui.
    engineers = group(directory.all.filter(isEngineerLike)).filter((user) => !isManager(user));
    // Só encarregados entram na equipe de um engenheiro.
    // Chefes de equipe: encarregados e analistas (o analista com acesso de engenheiro aparece como engenheiro).
    foremen = group(directory.all.filter((user) => user.roleValue === "encarregado" || (user.roleValue === "analista" && !isEngineerLike(user))));
  }

  // "2 contas com este nome": aviso no cartão, com o e-mail de cada conta ao passar o mouse.
  const dupBadge = (item) => (item.accounts.length > 1
    ? `<span class="foreman-badge foreman-badge-dup" title="${escapeHtml(item.accounts.map((user) => `${user.email || "sem e-mail"} · ${user.role || user.roleValue}`).join(" | "))}">${item.accounts.length} contas com este nome · apague a que sobra em Administração</span>`
    : "");

  const teamOf = (engineerName) => foremen.filter((user) => same(user.linkedEngineer, engineerName));

  // ---------- Passo 1: engenheiros ----------
  function renderEngineers() {
    const term = fold($("#engineer-search").value);
    const list = engineers.filter((user) => !term || fold(user.name).includes(term));
    $("#engineer-grid").innerHTML = list.length ? list.map((user) => {
      const team = teamOf(user.name);
      const isOpen = same(user.name, openedEngineer);
      const safe = escapeHtml(user.name);
      return `<article class="foreman-card${isOpen ? " is-selected" : ""}">
        <h3>${safe}</h3>
        <div class="foreman-badges">${isOpen ? '<span class="foreman-badge foreman-badge-view">Equipe aberta</span>' : ""}${dupBadge(user)}</div>
        <div class="foreman-meta" title="${team.length} encarregado(s) na equipe"><strong>${team.length}</strong> ${team.length === 1 ? "encarregado" : "encarregados"}</div>
        <div class="foreman-linked">${team.length ? escapeHtml(team.map((item) => item.name).join(" · ")) : "Nenhum encarregado na equipe"}</div>
        <div class="foreman-actions">${isOpen ? "" : `<button class="foreman-open" type="button" data-open-team="${safe}">${canEdit ? "Montar equipe" : "Ver equipe"}</button>`}</div>
      </article>`;
    }).join("") : `<p class="teams-note">${engineers.length ? "Nenhum engenheiro encontrado." : "Nenhum engenheiro cadastrado no portal."}</p>`;
  }

  $("#engineer-grid").addEventListener("click", (event) => {
    const open = event.target.closest("[data-open-team]");
    if (!open) return;
    openedEngineer = open.dataset.openTeam;
    renderAll();
    $("#manage-card").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("#engineer-search").addEventListener("input", renderEngineers);

  // ---------- Passo 2: encarregados da equipe ----------
  function renderList() {
    const engineer = openedEngineer;
    if (!engineer) {
      $("#manage-title").textContent = "Encarregados";
      $("#manage-body").hidden = true;
      $("#manage-help").textContent = "";
      $("#team-summary").innerHTML = `<p class="teams-note">${canEdit ? 'Toque em "Montar equipe" em um engenheiro no passo 1 para colocar os encarregados dele aqui.' : 'Toque em "Ver equipe" em um engenheiro para ver os encarregados dele.'}</p>`;
      return;
    }
    $("#manage-body").hidden = false;
    $("#manage-title").textContent = `Encarregados · equipe de ${engineer}`;
    $("#manage-help").textContent = canEdit
      ? `Toque em "Vincular" para pôr o encarregado na equipe de ${engineer}. As liberações dele passam a ir só para ${engineer}, inclusive as que ainda esperam o abono.`
      : `Encarregados da equipe de ${engineer}: as liberações deles vão só para ${engineer}. Só para consulta; quem monta as equipes é o DP ou o engenheiro.`;
    const team = teamOf(engineer);
    $("#team-summary").innerHTML = `<strong>${team.length}</strong> ${team.length === 1 ? "encarregado" : "encarregados"} na equipe`;
    const term = fold($("#team-search").value);
    const filter = canEdit ? $("#team-filter").value : "team";
    const rows = foremen.filter((user) => {
      const mine = same(user.linkedEngineer, engineer);
      const free = !user.linkedEngineer;
      if (filter === "team" && !mine) return false;
      if (filter === "free" && !free) return false;
      if (filter === "others" && (mine || free)) return false;
      return !term || fold(user.name).includes(term);
    });
    $("#teams-list").innerHTML = rows.length ? rows.map((user) => {
      const mine = same(user.linkedEngineer, engineer);
      const tag = mine ? '<span class="team-tag team-tag-mine">Na equipe</span>'
        : user.linkedEngineer ? `<span class="team-tag team-tag-other">Equipe de ${escapeHtml(user.linkedEngineer)}</span>`
          : '<span class="team-tag team-tag-free">Sem engenheiro</span>';
      const id = escapeHtml(user.id);
      const action = !canEdit ? ""
        : mine ? `<button class="team-remove" type="button" data-remove="${id}">Tirar da equipe</button>`
        : `<button class="team-add" type="button" data-add="${id}">${user.linkedEngineer ? "Mover para a equipe" : "Vincular"}</button>`;
      return `<div class="team-item${mine ? " is-mine" : ""}">
        <span></span>
        <div><strong>${escapeHtml(user.name)}</strong><small>${escapeHtml(String(roleOf(user)).toUpperCase())}</small><br>${tag}${dupBadge(user)}</div>
        ${action}
      </div>`;
    }).join("") : `<p class="teams-note">${!canEdit ? "Nenhum encarregado na sua equipe ainda. Quem monta é o DP ou o engenheiro." : foremen.length ? "Nenhum encarregado encontrado." : "Nenhum encarregado cadastrado no portal."}</p>`;
  }

  // As liberações do encarregado que ainda esperam o abono (individuais e coletivas) passam para o engenheiro novo,
  // para nada ficar parado com outro engenheiro (ou sem engenheiro, as antigas de "todos os engenheiros").
  async function moveWaitingReleases(foreman, engineerName) {
    const waiting = (record) => !record.bonusStatus && !same(record.targetEngineer, engineerName);
    const individual = (await window.portalDemoStore.getReleases())
      .filter((release) => (release.requesterUid ? foreman.ids.includes(release.requesterUid) : same(release.requester, foreman.name)) && waiting(release));
    const collective = (await window.portalCollectiveStore.getAll())
      .filter((sheet) => (same(sheet.foreman, foreman.name) || foreman.ids.includes(sheet.createdByUid)) && waiting(sheet));
    for (const release of individual) await window.portalDemoStore.updateRelease(release.id, { targetEngineer: engineerName });
    for (const sheet of collective) await window.portalCollectiveStore.update(sheet.id, { targetEngineer: engineerName });
    return individual.length + collective.length;
  }

  async function setEngineer(userId, engineerName) {
    const result = $("#manage-result");
    const foreman = foremen.find((user) => user.id === userId);
    if (!foreman) return;
    if (engineerName && foreman.linkedEngineer && !same(foreman.linkedEngineer, engineerName)
      && !window.confirm(`${foreman.name} está na equipe de ${foreman.linkedEngineer}. Mover para a equipe de ${engineerName}?`)) return;
    if (!engineerName && !window.confirm(`Tirar ${foreman.name} da equipe de ${foreman.linkedEngineer}?\n\nSem engenheiro, ${foreman.name} não consegue enviar liberações até entrar na equipe de outro engenheiro.`)) return;
    try {
      for (const id of foreman.ids) await window.portalAuthDemo.setUserLinkedEngineer(id, engineerName);
      foreman.linkedEngineer = engineerName;
    } catch (error) {
      console.error("Falha ao salvar a equipe do engenheiro.", error);
      show(result, error?.code === "permission-denied"
        ? "Sem permissão para salvar. As regras do Firebase precisam ser atualizadas (publique o firestore.rules no console do Firebase)."
        : "Não foi possível salvar. Verifique a internet e tente de novo.", true);
      return;
    }
    renderAll();
    if (!engineerName) return show(result, `${foreman.name} saiu da equipe. Sem engenheiro, ele não consegue enviar liberações.`);
    try {
      const moved = await moveWaitingReleases(foreman, engineerName);
      show(result, `${foreman.name} agora está na equipe de ${engineerName}.${moved ? ` ${moved} liberação(ões) dele que esperavam o abono foram passadas para ${engineerName}.` : ""}`);
    } catch (error) {
      console.error("Falha ao passar as liberações para o engenheiro novo.", error);
      show(result, `${foreman.name} agora está na equipe de ${engineerName}, mas não foi possível passar as liberações que esperavam o abono. Tente vincular de novo.`, true);
    }
  }

  $("#teams-list").addEventListener("click", (event) => {
    const add = event.target.closest("[data-add]");
    const remove = event.target.closest("[data-remove]");
    if (add) setEngineer(add.dataset.add, openedEngineer);
    if (remove) setEngineer(remove.dataset.remove, "");
  });
  ["#team-search", "#team-filter"].forEach((selector) => $(selector).addEventListener("input", renderList));

  function renderAll() {
    renderEngineers();
    renderList();
    const step = openedEngineer ? "2" : "1";
    document.querySelectorAll(".teams-step").forEach((item) => {
      item.classList.toggle("is-current", item.dataset.step === step);
      item.classList.toggle("is-done", item.dataset.step < step);
    });
    $("#teams-app")?.setAttribute("data-step", step);
  }

  // ---------- Exportar para o Excel (a mesma planilha da página Equipes) ----------
  $("#export-teams").addEventListener("click", async () => {
    const button = $("#export-teams");
    const result = $("#teams-export-result");
    button.disabled = true;
    try {
      const summary = await window.portalTeamsExport.download();
      show(result, `Excel gerado: ${summary.employees} colaborador(es) e ${summary.teams} equipe(s).`);
    } catch (error) {
      console.error("Falha ao exportar as equipes.", error);
      show(result, error?.message === "excel-unavailable" ? "Não foi possível carregar o gerador de Excel. Confira a internet e recarregue a página." : "Não foi possível gerar o Excel. Tente de novo.", true);
    } finally {
      button.disabled = false;
    }
  });

  // ---------- Início ----------
  $("#teams-kicker").textContent = `${session?.role || "Portal"} · Obra 369`;
  // Engenheiro abre direto a equipe dele; o encarregado, a do engenheiro dele.
  if (isEngineerUser && !(session.privileges || []).includes("gestor")) openedEngineer = session.name || "";
  else if (["encarregado", "analista"].includes(session.roleValue)) openedEngineer = session.linkedEngineer || "";
  if (!canEdit) {
    // Só consulta: sem vincular/tirar; a lista mostra só quem está na equipe aberta.
    $("#teams-intro").textContent = "Veja os encarregados da equipe de cada engenheiro. As liberações de cada encarregado vão só para o engenheiro da equipe. Quem monta as equipes é o DP ou o engenheiro.";
    $("#engineers-title").nextElementSibling.textContent = 'Toque em "Ver equipe" para ver os encarregados de um engenheiro. O engenheiro Gestor não aparece aqui: ele recebe as liberações de todos.';
    $("#team-filter").hidden = true;
    $("#teams-steps").hidden = true;
  }
  try {
    const employees = await window.portalEmployeeStore?.getAll() || [];
    roleByMatricula = new Map(employees.filter((item) => item.matricula && item.funcao).map((item) => [String(item.matricula), item.funcao]));
    roleByName = new Map(employees.filter((item) => item.nome && item.funcao).map((item) => [fold(item.nome), item.funcao]));
  } catch (error) {
    console.warn("Não foi possível buscar a função dos encarregados.", error);
  }
  try {
    apply(await window.portalAuthDemo.getTeamDirectory());
  } catch (error) {
    console.error("Falha ao carregar engenheiros e encarregados.", error);
    $("#engineer-grid").innerHTML = '<p class="teams-loading teams-load-error" role="alert">Não foi possível carregar engenheiros e encarregados. Verifique a internet e recarregue a página.</p>';
    $("#team-summary").innerHTML = "";
    return;
  }
  renderAll();

  // Ao vivo: mudanças feitas em outro aparelho aparecem aqui sem recarregar.
  window.portalAuthDemo.subscribeTeamDirectory?.((directory) => {
    apply(directory);
    renderAll();
  });
})();
