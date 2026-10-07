(async () => {
  await window.portalAuthDemo?.ready();
  const session = window.portalAuthDemo?.getSession();
  const role = session?.roleValue;
  const isAdmin = role === "administrador-analista";
  const isDp = role === "dp" || !!window.portalAuthDemo?.isDpDelegate?.();
  // Analista: por enquanto tem os mesmos poderes do estagiário de engenharia.
  const isIntern = role === "estagiario_engenharia" || role === "analista";
  const isEngineer = role === "engenheiro";
  const isForeman = role === "encarregado" || role === "seguranca_trabalho";
  const $ = (selector) => document.querySelector(selector);
  const fold = (value) => String(value || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const same = (a, b) => fold(a) === fold(b) && fold(a) !== "";

  if (!isAdmin && !isDp && !isIntern && !isEngineer && !isForeman) {
    $("#teams-denied").hidden = false;
    $("#teams-app").hidden = true;
    $("#export-teams").hidden = true;
    return;
  }

  const show = (element, text, isError) => {
    element.textContent = text;
    element.classList.toggle("is-error", !!isError);
    element.hidden = false;
  };

  // DP e administrador montam a equipe de qualquer encarregado; o estagiário, só a do encarregado a quem está vinculado;
  // o encarregado só consulta a própria equipe.
  // Estagiário e engenheiro trabalham na equipe do encarregado a quem se vinculam ("linked"). O DP também pode se
  // vincular (opcional), mas continua podendo montar a equipe de qualquer encarregado, como o administrador.
  const isLinked = isIntern || isEngineer;
  const canLink = isIntern || isEngineer || isDp;
  // Como a pessoa se chama nesta equipe (o texto da tela usa o cargo, nunca "ajudante").
  const myWord = role === "analista" ? "analista" : isIntern ? "estagiário" : isEngineer ? "engenheiro" : "DP";
  const roleWord = (user) => (user.roleValue === "estagiario_engenharia" ? "Estagiário" : user.roleValue === "analista" ? "Analista" : user.roleValue === "engenheiro" ? "Engenheiro" : "DP");
  const canManage = isAdmin || isDp || isLinked;
  let employees = [];
  let foremen = [];
  let interns = [];
  // Todos os estagiários/engenheiros/DP aprovados (para o administrador e o DP vincularem a um encarregado).
  let people = [];
  let linkedForeman = session?.linkedForeman || "";
  const selected = new Set();
  // true quando o banco não deixou listar os encarregados cadastrados (regras do Firebase ainda sem a permissão).
  let directoryBlocked = false;
  // Encarregado cuja equipe está aberta na área de colaboradores (DP/administrador escolhem; estagiário/engenheiro usam o vínculo).
  let openedForeman = "";

  async function loadPeople() {
    employees = (await window.portalEmployeeStore.getAll()).sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", { sensitivity: "base" }));
    try {
      const directory = await window.portalAuthDemo.getTeamDirectory();
      foremen = directory.foremen;
      interns = directory.interns;
      people = directory.all || [];
      directoryBlocked = false;
    } catch (error) {
      console.warn("Não foi possível listar encarregados e estagiários.", error);
      foremen = [];
      interns = [];
      people = [];
      directoryBlocked = !isAdmin;
    }
  }

  // Nomes de encarregado: os cadastrados como usuário + os que já aparecem nos colaboradores
  // + os colaboradores cuja função é "Encarregado" (mesmo sem conta no portal).
  function foremanNames() {
    const names = new Map();
    foremen.forEach((user) => names.set(fold(user.name), user.name));
    employees.forEach((employee) => {
      if (employee.nome && fold(employee.funcao).includes("encarregado") && !names.has(fold(employee.nome))) names.set(fold(employee.nome), employee.nome);
    });
    employees.forEach((employee) => { if (employee.encarregado && !names.has(fold(employee.encarregado))) names.set(fold(employee.encarregado), employee.encarregado); });
    return [...names.values()].sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
  }

  const internsOf = (foremanName) => interns.filter((user) => same(user.linkedForeman, foremanName)).map((user) => user.name);
  // "Estagiário: NOME · Engenheiro: NOME" para os cartões.
  const linkedLabel = (foremanName) => interns.filter((user) => same(user.linkedForeman, foremanName)).map((user) => `${roleWord(user)}: ${user.name}`);
  // Qual equipe está sendo mostrada agora.
  const currentForeman = () => (isLinked ? linkedForeman : isForeman ? session.name : openedForeman);

  // ---------- Encarregados (cartões) ----------
  const canAssign = isAdmin || isDp;

  // Administrador e DP vinculam estagiários (e engenheiros) a um encarregado direto no cartão dele.
  function assignHtml(name) {
    const linkedHere = people.filter((user) => user.roleValue !== "encarregado" && same(user.linkedForeman, name));
    const candidates = people
      .filter((user) => ["estagiario_engenharia", "analista", "engenheiro"].includes(user.roleValue) && !same(user.linkedForeman, name))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    const safe = escapeHtml(name);
    return `<div class="foreman-assign">
      <div class="foreman-assign-title">Estagiário / analista / engenheiro desta equipe</div>
      ${linkedHere.length ? linkedHere.map((user) => `<div class="foreman-assign-row"><span>${roleWord(user)}: <strong>${escapeHtml(user.name)}</strong></span><button type="button" class="foreman-unlink" data-unassign="${escapeHtml(user.id)}" aria-label="Tirar ${escapeHtml(user.name)}">Tirar</button></div>`).join("") : '<div class="foreman-assign-empty">Nenhum vinculado.</div>'}
      <div class="foreman-assign-add">
        <select data-assign-select="${safe}" aria-label="Estagiário ou analista para vincular a ${safe}"><option value="">Vincular estagiário ou analista…</option>${candidates.map((user) => `<option value="${escapeHtml(user.id)}">${roleWord(user)}: ${escapeHtml(user.name)}${user.linkedForeman ? ` (hoje: ${escapeHtml(user.linkedForeman)})` : ""}</option>`).join("")}</select>
        <button type="button" class="foreman-link" data-assign="${safe}">Vincular</button>
      </div>
    </div>`;
  }

  function renderForemen() {
    const grid = $("#foreman-grid");
    const mineName = isLinked || isDp ? linkedForeman : "";
    let names = foremanNames();
    if (isForeman) names = names.filter((name) => same(name, session.name));
    $("#foremen-note").textContent = isForeman
      ? "Esta é a sua equipe."
      : canLink
        ? `Escolha o encarregado de quem você é ${myWord} e toque em \"Me vincular como ${myWord}\". Você passa a ser como um segundo encarregado dessa equipe e pode montá-la no passo 2.`
        : "Escolha o encarregado para montar a equipe dele no passo 2.";
    if (directoryBlocked) $("#foremen-note").textContent += " Atenção: não foi possível listar todos os encarregados cadastrados; a lista abaixo mostra só os que já aparecem nos colaboradores. Se faltar alguém, avise o administrador (regras do Firebase).";
    grid.innerHTML = (names.length ? names.map((name) => {
      const count = employees.filter((employee) => same(employee.encarregado, name)).length;
      const people = linkedLabel(name);
      const isMine = same(name, mineName);
      const isOpen = same(name, currentForeman());
      const safe = escapeHtml(name);
      const badges = `${isMine ? '<span class="foreman-badge foreman-badge-mine">✓ Você está vinculado a este encarregado</span>' : ""}${isOpen && !isLinked && !isForeman ? '<span class="foreman-badge foreman-badge-view">Equipe aberta</span>' : ""}`;
      const actions = [
        canLink && !isMine ? `<button class="foreman-link" type="button" data-link-me="${safe}">Me vincular como ${myWord}</button>` : "",
        // Montar equipe: DP/administrador abrem qualquer uma; quem está vinculado monta a do encarregado a quem está vinculado.
        ((isAdmin || isDp) && !isOpen) || (canLink && isMine) ? `<button class="foreman-open" type="button" data-open-team="${safe}">Montar equipe</button>` : "",
        canLink && isMine ? `<button class="foreman-unlink" type="button" data-unlink-me="${safe}">Sair do vínculo</button>` : ""
      ].join("");
      return `<article class="foreman-card${isMine ? " is-mine" : ""}${isOpen ? " is-selected" : ""}">
        <h3>${safe}</h3>
        <div class="foreman-badges">${badges}</div>
        <div class="foreman-meta"><strong>${count}</strong> colaborador(es) na equipe</div>
        <div class="foreman-linked">${people.length ? escapeHtml(people.join(" · ")) : "Sem estagiário ou analista vinculado"}</div>
        <div class="foreman-actions">${actions}</div>
        ${canAssign ? assignHtml(name) : ""}
      </article>`;
    }).join("") : '<p class="teams-note">Nenhum encarregado encontrado.</p>');
  }

  async function saveLink(name) {
    const result = $("#intern-result");
    try {
      const updated = await window.portalAuthDemo.updateProfile({ linkedForeman: name });
      linkedForeman = updated?.linkedForeman ?? name;
      if (isDp) openedForeman = name || openedForeman;
      show(result, name ? `Vínculo salvo: você agora está vinculado ao encarregado ${name}.` : "Vínculo removido.");
      selected.clear();
      // Atualiza o diretório para o cartão mostrar você entre os vinculados.
      await loadPeople();
      renderAll();
      if (name) {
        show(result, `Você agora está vinculado ao encarregado ${name}. Vincule os colaboradores à equipe dele no passo 2 abaixo.`);
        $("#manage-card").scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } catch (error) {
      console.error("Falha ao salvar o vínculo.", error);
      show(result, "Não foi possível salvar o vínculo. Tente de novo.", true);
    }
  }

  async function assignUser(userId, foremanName) {
    const result = $("#intern-result");
    try {
      await window.portalAuthDemo.setUserLinkedForeman(userId, foremanName);
      const person = people.find((user) => user.id === userId);
      if (person) person.linkedForeman = foremanName;
      show(result, foremanName ? `${person ? `${roleWord(person)} ${person.name}` : "Usuário"} vinculado ao encarregado ${foremanName}.` : "Vínculo removido.");
      await loadPeople();
      renderAll();
    } catch (error) {
      console.error("Falha ao vincular o estagiário.", error);
      show(result, error?.code === "permission-denied" ? "Sem permissão para vincular. As regras do Firebase precisam ser atualizadas (peça ao administrador para publicá-las)." : "Não foi possível salvar o vínculo. Tente de novo.", true);
    }
  }

  $("#foreman-grid").addEventListener("click", (event) => {
    const assign = event.target.closest("[data-assign]");
    const unassign = event.target.closest("[data-unassign]");
    if (assign) {
      const select = assign.closest(".foreman-assign").querySelector("select");
      if (!select.value) return show($("#intern-result"), "Escolha o estagiário na lista antes de vincular.", true);
      const person = people.find((user) => user.id === select.value);
      if (person?.linkedForeman && !same(person.linkedForeman, assign.dataset.assign) && !window.confirm(`${person.name} já está vinculado ao encarregado ${person.linkedForeman}. Mover para ${assign.dataset.assign}?`)) return;
      return assignUser(select.value, assign.dataset.assign);
    }
    if (unassign) return assignUser(unassign.dataset.unassign, "");
    const me = event.target.closest("[data-link-me]");
    const leave = event.target.closest("[data-unlink-me]");
    const open = event.target.closest("[data-open-team]");
    if (me) saveLink(me.dataset.linkMe);
    if (leave && window.confirm("Sair do vínculo com este encarregado?")) saveLink("");
    if (open) {
      if (!isLinked) openedForeman = open.dataset.openTeam;
      selected.clear();
      renderAll();
      $("#manage-card").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  // Encarregado não entra em equipe (nem na dele, nem na de outro encarregado).
  // Mão de obra direta e indireta (inclusive analistas) entram em equipe; encarregado indireto também tem equipe.
  // O campo "maoDeObra" vem da importação dos arquivos do RM/REPORTS e aparece só como informação na lista.
  const maoLabel = (employee) => (employee.maoDeObra === "direta" ? "Direta" : employee.maoDeObra === "indireta" ? "Indireta" : "");
  const isForemanPerson = (employee) => foremanNames().some((name) => same(name, employee.nome));

  function filteredEmployees() {
    const team = currentForeman();
    const term = fold($("#team-search").value);
    const filter = $("#team-filter").value;
    return employees.filter((employee) => {
      const mine = same(employee.encarregado, team);
      const free = !employee.encarregado;
      if (filter === "team" && !mine) return false;
      if (filter === "free" && !free) return false;
      if (filter === "others" && (mine || free)) return false;
      return !term || fold(`${employee.nome} ${employee.matricula} ${employee.funcao} ${employee.setor}`).includes(term);
    });
  }

  function renderList() {
    const team = currentForeman();
    const list = $("#teams-list");
    if (!team) {
      $("#manage-title").textContent = "Colaboradores";
      $("#manage-body").hidden = true;
      $("#team-summary").innerHTML = `<p class="teams-note">${isLinked ? `Vincule-se a um encarregado no passo 1 ("Me vincular como ${myWord}") para montar a equipe dele aqui.` : isDp ? "Toque em \"Montar equipe\" em um encarregado no passo 1 para montar a equipe dele aqui." : "Toque em \"Montar equipe\" em um encarregado no passo 1 para montar a equipe dele aqui."}</p>`;
      return;
    }
    $("#manage-body").hidden = false;
    $("#manage-title").textContent = `Colaboradores · equipe de ${team}`;
    $("#manage-help").textContent = canManage ? `Marque os colaboradores e toque em "Vincular selecionados à equipe", ou use o botão "Vincular" de cada um. Eles entram na equipe de ${team}.` : "Colaboradores da sua equipe.";
    const rows = filteredEmployees();
    const members = employees.filter((employee) => same(employee.encarregado, team)).length;
    const interned = internsOf(team);
    $("#team-summary").innerHTML = `<strong>${members}</strong> colaborador(es) na equipe${interned.length ? ` · Vinculado(s): <strong>${escapeHtml(interned.join(", "))}</strong>` : ""}`;
    $("#teams-bulk").hidden = !canManage;
    $("#selected-count").textContent = selected.size ? `${selected.size} selecionado(s)` : "";
    list.innerHTML = rows.length ? rows.map((employee) => {
      const mine = same(employee.encarregado, team);
      const tag = isForemanPerson(employee) ? '<span class="team-tag team-tag-other">É encarregado, não entra em equipe</span>' : mine ? '<span class="team-tag team-tag-mine">Na equipe</span>' : employee.encarregado ? `<span class="team-tag team-tag-other">Equipe de ${escapeHtml(employee.encarregado)}</span>` : '<span class="team-tag team-tag-free">Sem equipe</span>';
      const id = escapeHtml(employee.matricula);
      // O estagiário só mexe em quem está livre ou já é da equipe dele; DP e administrador mexem em qualquer um.
      const isBoss = isForemanPerson(employee);
      const locked = isBoss || (isLinked && employee.encarregado && !mine);
      const action = !canManage || locked ? ""
        : mine ? `<button class="team-remove" type="button" data-remove="${id}">Tirar da equipe</button>`
          : `<button class="team-add" type="button" data-add="${id}">${employee.encarregado ? "Mover para a equipe" : "Vincular"}</button>`;
      return `<div class="team-item${mine ? " is-mine" : ""}">
        ${canManage && !locked ? `<input type="checkbox" data-select="${id}" ${selected.has(employee.matricula) ? "checked" : ""} aria-label="Selecionar ${escapeHtml(employee.nome)}">` : "<span></span>"}
        <div><strong>${escapeHtml(employee.nome)}</strong><small>Matrícula ${id} · ${escapeHtml(employee.funcao || "Função não informada")}${maoLabel(employee) ? ` · Mão de obra ${maoLabel(employee).toLowerCase()}` : ""}</small><br>${tag}</div>
        ${action}
      </div>`;
    }).join("") : `<p class="teams-note">${employees.length ? "Nenhum colaborador encontrado." : "Nenhum colaborador cadastrado. Importe os arquivos do RM/REPORTS em Importar colaboradores."}</p>`;
  }

  function renderAll() {
    renderForemen();
    renderList();
  }

  // ---------- Vincular / tirar ----------
  const byId = (matricula) => employees.find((employee) => employee.matricula === matricula);

  async function link(matriculas, foremanName) {
    const result = $("#manage-result");
    let targets = matriculas.map(byId).filter(Boolean);
    const bosses = foremanName ? targets.filter(isForemanPerson) : [];
    if (bosses.length) {
      targets = targets.filter((employee) => !bosses.includes(employee));
      selected.clear();
      if (!targets.length) return show(result, `${bosses.map((e) => e.nome).join(", ")} é encarregado e não pode entrar em equipe.`, true), renderAll();
      show(result, `${bosses.length} encarregado(s) ignorado(s): encarregado não entra em equipe.`, true);
    }
    if (!targets.length || (foremanName !== "" && !foremanName)) return;
    const moving = targets.filter((employee) => foremanName && employee.encarregado && !same(employee.encarregado, foremanName));
    if (moving.length && !window.confirm(`${moving.length} colaborador(es) já estão na equipe de outro encarregado (${[...new Set(moving.map((e) => e.encarregado))].join(", ")}).\n\nMover para a equipe de ${foremanName}?`)) return;
    let ok = 0;
    let failed = 0;
    let lastError = "";
    for (const employee of targets) {
      try {
        await window.portalEmployeeStore.setForeman(employee.matricula, foremanName);
        employee.encarregado = foremanName;
        ok += 1;
      } catch (error) {
        failed += 1;
        lastError = error?.code || "";
        console.error("Falha ao vincular", employee.matricula, error);
      }
    }
    selected.clear();
    show(result, `${foremanName ? `${ok} colaborador(es) vinculado(s) a ${foremanName}` : `${ok} colaborador(es) tirado(s) da equipe`}.${failed ? `\n${failed} não puderam ser alterados${lastError === "permission-denied" ? ": sem permissão. As regras do Firebase precisam ser atualizadas (peça ao administrador para publicá-las)." : " (erro de conexão)."}` : ""}`, failed > 0);
    renderAll();
  }

  $("#teams-list").addEventListener("click", (event) => {
    const add = event.target.closest("[data-add]");
    const remove = event.target.closest("[data-remove]");
    if (add) link([add.dataset.add], currentForeman());
    if (remove) link([remove.dataset.remove], "");
  });
  $("#teams-list").addEventListener("change", (event) => {
    const box = event.target.closest("[data-select]");
    if (!box) return;
    if (box.checked) selected.add(box.dataset.select); else selected.delete(box.dataset.select);
    $("#selected-count").textContent = selected.size ? `${selected.size} selecionado(s)` : "";
  });
  $("#bulk-add").addEventListener("click", () => {
    if (!selected.size) return show($("#manage-result"), "Marque os colaboradores que quer vincular.", true);
    link([...selected], currentForeman());
  });
  $("#bulk-remove").addEventListener("click", () => {
    if (!selected.size) return show($("#manage-result"), "Marque os colaboradores que quer tirar da equipe.", true);
    link([...selected], "");
  });
  ["#team-search", "#team-filter"].forEach((selector) => $(selector).addEventListener("input", renderList));
  
  // ---------- Exportar para o Excel ----------
  $("#export-teams").addEventListener("click", async () => {
    const button = $("#export-teams");
    const result = $("#teams-export-result");
    if (typeof ExcelJS === "undefined") {
      show(result, "Não foi possível carregar o gerador de Excel. Confira a internet e recarregue a página.", true);
      return;
    }
    button.disabled = true;
    try {
      await loadPeople();
      const workbook = new ExcelJS.Workbook();
      workbook.creator = session?.name || "Portal";
      workbook.created = new Date();
      const style = (sheet) => {
        const header = sheet.getRow(1);
        header.height = 26;
        header.eachCell((cell) => {
          cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF00142D" } };
          cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        });
        sheet.views = [{ state: "frozen", ySplit: 1 }];
        sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columnCount } };
      };

      const people = workbook.addWorksheet("Colaboradores");
      people.columns = [
        { header: "Matrícula", key: "matricula", width: 12 },
        { header: "Colaborador", key: "nome", width: 36 },
        { header: "Função", key: "funcao", width: 26 },
        { header: "Setor / frente", key: "setor", width: 22 },
        { header: "Situação", key: "status", width: 11 },
        { header: "Mão de obra", key: "mao", width: 13 },
        { header: "Encarregado (equipe)", key: "encarregado", width: 34 },
        { header: "Estagiário / engenheiro vinculado(s) ao encarregado", key: "estagiarios", width: 44 }
      ];
      employees.forEach((employee) => people.addRow({
        matricula: employee.matricula,
        nome: employee.nome,
        funcao: employee.funcao || "",
        setor: employee.setor || "",
        status: employee.status || "",
        mao: maoLabel(employee) || "Não informada",
        encarregado: employee.encarregado || "Sem equipe",
        estagiarios: employee.encarregado ? internsOf(employee.encarregado).join(", ") : ""
      }));
      style(people);

      const teams = workbook.addWorksheet("Equipes");
      teams.columns = [
        { header: "Encarregado", key: "encarregado", width: 36 },
        { header: "Estagiário / engenheiro vinculado(s)", key: "estagiarios", width: 44 },
        { header: "Colaboradores na equipe", key: "total", width: 16 }
      ];
      foremanNames().forEach((name) => teams.addRow({
        encarregado: name,
        estagiarios: internsOf(name).join(", ") || "—",
        total: employees.filter((employee) => same(employee.encarregado, name)).length
      }));
      const free = employees.filter((employee) => !employee.encarregado).length;
      if (free) teams.addRow({ encarregado: "(Sem equipe)", estagiarios: "", total: free });
      style(teams);

      const buffer = await workbook.xlsx.writeBuffer();
      const link = document.createElement("a");
      const now = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      link.href = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      link.download = `equipes-obra-369_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.xlsx`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 30000);
      show(result, `Excel gerado: ${employees.length} colaborador(es) e ${teams.rowCount - 1} equipe(s).`);
    } catch (error) {
      console.error("Falha ao exportar as equipes.", error);
      show(result, "Não foi possível gerar o Excel. Tente de novo.", true);
    } finally {
      button.disabled = false;
    }
  });

  // ---------- Início ----------
  $("#teams-kicker").textContent = `${session?.role || "Portal"} · Obra 369`;
  $("#teams-intro").textContent = isForeman
    ? "Veja a sua equipe e exporte as equipes para o Excel."
    : isLinked
      ? `Passo 1: vincule-se como ${myWord} a um encarregado. Passo 2: vincule colaboradores à equipe dele. Depois, exporte para o Excel.`
      : "Escolha um encarregado, vincule colaboradores à equipe dele e exporte as equipes para o Excel.";
  await loadPeople();
  if (isDp || isAdmin) openedForeman = (isDp && linkedForeman) || "";
  renderAll();

  // ---------- Ao vivo ----------
  // Tudo aqui e na página de Administração usa os mesmos dados (o campo "encarregado" de cada colaborador e o
  // vínculo de cada estagiário/engenheiro/DP). Qualquer mudança feita em um lugar aparece no outro sem recarregar.
  let redrawTimer = null;
  const redraw = () => {
    clearTimeout(redrawTimer);
    redrawTimer = setTimeout(() => {
      const scroll = $("#teams-list").scrollTop;
      renderAll();
      $("#teams-list").scrollTop = scroll;
    }, 150);
  };
  try {
    window.portalEmployeeStore.subscribeEmployees?.((list) => {
      employees = list.sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", { sensitivity: "base" }));
      redraw();
    });
    window.portalAuthDemo.subscribeTeamDirectory?.((directory) => {
      directoryBlocked = false;
      foremen = directory.foremen;
      interns = directory.interns;
      people = directory.all || [];
      // Se o administrador mudou o meu vínculo pela página de Administração, acompanha.
      const me = (directory.all || []).find((user) => user.id === session?.uid);
      if (me && canLink) linkedForeman = me.linkedForeman || "";
      redraw();
    }, () => {
      directoryBlocked = !isAdmin;
      redraw();
    });
  } catch (error) {
    console.warn("Sem atualização ao vivo nesta tela.", error);
  }
})();
