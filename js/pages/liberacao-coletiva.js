(async () => {
  await window.portalAuthDemo?.ready();
  const form = document.querySelector("#collective-form");
  const search = document.querySelector("#employee-search");
  const results = document.querySelector("#employee-results");
  const chosenList = document.querySelector("#chosen-list");
  const countLabel = document.querySelector("#selected-count");
  const clearButton = document.querySelector("#clear-all");
  const service = document.querySelector("#service");
  const errorMessage = document.querySelector("#release-error");
  const successMessage = document.querySelector("#release-success");
  const submitButton = form.querySelector(".release-submit");
  const session = window.portalAuthDemo?.getSession();
  const foremanRoles = ["encarregado", "estagiario_engenharia", "analista", "seguranca_trabalho"];
  const isForeman = foremanRoles.includes(session?.roleValue);
  const esc = window.escapeHtml;

  let allEmployees = [];
  let teamEmployees = [];
  let rawEmployees = [];
  const chosen = new Map();

  document.querySelector("#release-kicker").textContent = `${session?.role || "Colaborador"} · Obra 369`;
  const foremanSelect = document.querySelector("#foreman-name");
  const engineerSelect = document.querySelector("#engineer-name");

  // Encarregados e engenheiros cadastrados no portal (mais colaboradores com essa função, mesmo sem conta).
  async function loadSigners(employees) {
    const fold = window.normalizeSearchText;
    const foremen = new Map();
    const engineers = new Map();
    try {
      const directory = await window.portalAuthDemo.getTeamDirectory();
      directory.all.forEach((user) => {
        // Chefes de equipe: encarregado e analista. Assinam como engenheiro: engenheiro e analista com esse acesso.
        if (["encarregado", "analista"].includes(user.roleValue)) foremen.set(fold(user.name), user.name);
        if (user.roleValue === "engenheiro" || (user.roleValue === "analista" && (user.privileges || []).includes("engenheiro"))) engineers.set(fold(user.name), user.name);
      });
    } catch (error) {
      console.warn("Não foi possível listar encarregados e engenheiros.", error);
    }
    employees.forEach((item) => {
      const role = fold(item.funcao);
      if (item.nome && role.includes("encarregado") && !foremen.has(fold(item.nome))) foremen.set(fold(item.nome), item.nome);
      if (item.nome && role.includes("engenheiro") && !engineers.has(fold(item.nome))) engineers.set(fold(item.nome), item.nome);
    });
    // O próprio usuário e o encarregado a quem está vinculado sempre aparecem na lista.
    const isChief = ["encarregado", "analista"].includes(session?.roleValue);
    if (isChief && session.name) foremen.set(fold(session.name), session.name);
    if (!isChief && session?.linkedForeman) foremen.set(fold(session.linkedForeman), session.linkedForeman);
    const fill = (select, map, placeholder, firstName = "") => {
      // O próprio usuário (encarregado ou engenheiro) vem em primeiro lugar na lista.
      const first = fold(firstName);
      const names = [...map.values()].sort((a, b) => (fold(b) === first) - (fold(a) === first) || a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
      select.innerHTML = `<option value="">${placeholder}</option>${names.map((name) => `<option value="${esc(name)}">${esc(name)}</option>`).join("")}`;
    };
    fill(foremanSelect, foremen, "Selecione o encarregado", isChief ? session.name : session?.linkedForeman);
    fill(engineerSelect, engineers, "Todos os engenheiros");
    foremanSelect.value = isChief ? session.name || "" : (session?.linkedForeman || "");
  }
  document.querySelector("#release-date").value = new Date().toISOString().slice(0, 10);

  // Mesma regra da liberação individual: a busca mostra todos os colaboradores (o encarregado pode liberar até quem é
  // da equipe de outro encarregado). A equipe continua valendo para a ordem e para o botão "adicionar toda a equipe".
  async function loadEmployees() {
    const raw = await window.portalEmployeeStore?.getAll() || [];
    rawEmployees = raw;
    const byName = (a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" });
    allEmployees = [...raw];
    if (isForeman) {
      const owners = [session.name, session.roleValue === "estagiario_engenharia" ? session.linkedForeman : ""]
        .map((name) => window.normalizeSearchText(name).trim()).filter(Boolean);
      const isMine = (item) => owners.includes(window.normalizeSearchText(item.encarregado).trim());
      teamEmployees = raw.filter(isMine);
      const rank = (item) => (isMine(item) ? 0 : !item.encarregado ? 1 : 2);
      allEmployees.sort((a, b) => rank(a) - rank(b) || byName(a, b));
      document.querySelector("#employee-hint").textContent = "Pesquise qualquer colaborador pelo nome ou matrícula. A sua equipe aparece primeiro.";
    } else {
      teamEmployees = [];
      allEmployees.sort(byName);
      document.querySelector("#add-all").hidden = true;
    }
    teamEmployees.sort(byName);
  }

  function renderChosen() {
    const list = [...chosen.values()];
    countLabel.textContent = `${list.length} ${list.length === 1 ? "colaborador selecionado" : "colaboradores selecionados"}`;
    clearButton.hidden = !list.length;
    chosenList.innerHTML = list.map((item) => `<li><span>${esc(item.nome)}<small>${esc(item.funcao || "")} · Matrícula ${esc(item.matricula)}</small></span><button type="button" data-remove="${esc(item.matricula)}" aria-label="Remover ${esc(item.nome)}">×</button></li>`).join("");
    filterEmployees();
  }

  function filterEmployees() {
    const term = window.normalizeSearchText(search.value.trim());
    results.innerHTML = "";
    if (!term) return;
    const matches = allEmployees.filter((item) => window.normalizeSearchText(item.nome).includes(term) || item.matricula.includes(term));
    if (!matches.length) {
      results.innerHTML = '<div class="list-group-item text-muted">Nenhum colaborador encontrado.</div>';
      return;
    }
    matches.forEach((item) => {
      const button = document.createElement("button");
      const picked = chosen.has(item.matricula);
      button.type = "button";
      button.setAttribute("role", "option");
      button.className = `list-group-item list-group-item-action${picked ? " active" : ""}`;
      button.textContent = `${picked ? "✓ " : ""}${item.nome} · Matrícula ${item.matricula}${item.encarregado ? ` · Equipe de ${item.encarregado}` : ""}`;
      button.addEventListener("click", () => {
        if (picked) chosen.delete(item.matricula); else chosen.set(item.matricula, { matricula: item.matricula, nome: item.nome, funcao: item.funcao || "" });
        errorMessage.hidden = true;
        // Como na liberação individual: a lista de resultados some e o colaborador já aparece entre os selecionados.
        search.value = "";
        renderChosen();
        search.focus();
      });
      results.append(button);
    });
  }

  const fail = (message) => {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
    submitButton.disabled = false;
  };

  chosenList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove]");
    if (!button) return;
    chosen.delete(button.dataset.remove);
    renderChosen();
  });
  search.addEventListener("input", filterEmployees);
  clearButton.addEventListener("click", () => { chosen.clear(); renderChosen(); });
  document.querySelector("#add-all").addEventListener("click", () => {
    if (!teamEmployees.length) {
      fail("Nenhum colaborador vinculado à sua equipe ainda.");
      return;
    }
    teamEmployees.forEach((item) => chosen.set(item.matricula, { matricula: item.matricula, nome: item.nome, funcao: item.funcao || "" }));
    errorMessage.hidden = true;
    renderChosen();
  });

  // ---------- Histórico ----------
  let history = [];
  const historyList = document.querySelector("#history-list");

  async function loadHistory() {
    try {
      const all = await window.portalCollectiveStore.getAll();
      // Quem solicita vê as dele; DP, engenheiro e administrador veem todas.
      history = window.portalCollectiveStore.visibleFor(all);
    } catch (error) {
      console.error(error);
      historyList.innerHTML = '<li class="collective-empty">Não foi possível carregar as folhas anteriores.</li>';
      return;
    }
    historyList.innerHTML = history.length
      ? history.map((item) => `<li><div><strong>${esc(item.motive || "Sem motivo")} · ${esc(String(item.date || "").split("-").reverse().join("/"))}</strong><small>${(item.participants || []).length} colaboradores · por ${esc(item.requester || "—")} · ${esc(window.portalCollectiveSheet.statusLabel(item))}</small></div><div><button type="button" data-view="${esc(item.id)}">Visualizar folha</button></div></li>`).join("")
      : '<li class="collective-empty">Nenhuma liberação coletiva ainda.</li>';
  }

  historyList.addEventListener("click", (event) => {
    const view = event.target.closest("[data-view]");
    const sheet = view && history.find((item) => item.id === view.dataset.view);
    if (sheet) window.portalCollectiveSheet.show(sheet);
  });

  // ---------- Envio ----------
  const editId = new URLSearchParams(window.location.search).get("edit");
  let editing = null;
  let isSubmitting = false;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    errorMessage.hidden = true;
    successMessage.hidden = true;
    if (editId && !editing) return fail("Não é possível reenviar: esta liberação não está aberta para edição.");
    const movement = [...document.querySelectorAll('input[name="movement"]:checked')].map((input) => input.value);
    if (!chosen.size) return fail("Selecione pelo menos um colaborador.");
    if (!movement.length) return fail("Marque entrada, saída ou as duas.");
    // Horário de almoço (12:00 às 13:00) e fora do expediente não valem: o campo fica inválido e a mensagem explica o porquê.
    const lunchOk = window.portalLunchTime?.validate() ?? true;
    if (!form.checkValidity()) {
      form.reportValidity();
      return fail(lunchOk ? "Confira os campos obrigatórios antes de enviar a liberação." : window.portalLunchTime.message());
    }
    if (!document.querySelector('input[name="bonus-request"]:checked')) return fail("Marque o pedido de abono (abonado ou não abonado).");
    if (!document.querySelector("#signature-confirm").checked) return fail("Confirme e assine a liberação para continuar.");

    isSubmitting = true;
    submitButton.disabled = true;
    const stop = window.portalButtonLoading(submitButton, "Enviando liberação…");
    const sheet = {
      participants: [...chosen.values()],
      date: document.querySelector("#release-date").value,
      time: document.querySelector("#release-time").value,
      movement,
      reasonType: "tarefa",
      motive: service.value.trim(),
      foreman: document.querySelector("#foreman-name").value.trim(),
      targetEngineer: engineerSelect.value,
      bonusRequest: document.querySelector('input[name="bonus-request"]:checked')?.value || null,
      stage: "engineer",
      status: "pending",
      requester: session?.name || "Solicitante",
      requesterRole: session?.role || "",
      createdByUid: session?.uid || ""
    };
    try {
      if (editId) {
        // Reenvio depois da recusa: volta para o engenheiro e guarda a recusa anterior no histórico. Quem criou não muda.
        const { createdByUid, requester, requesterRole, ...changes } = sheet;
        await window.portalCollectiveStore.update(editId, {
          ...changes,
          requestedAt: new Date().toISOString(),
          bonusStatus: null,
          hours: "Pendente",
          engineer: null,
          engineerRole: null,
          engineerDecisionAt: null,
          dpSigner: null,
          dpRole: null,
          dpDecisionAt: null,
          refusalHistory: [...(editing.refusalHistory || []), { by: editing.refusedBy, at: editing.refusedAt, reason: editing.refusalReason }],
          refusedBy: null,
          refusedAt: null,
          refusalReason: null,
          refusalReasons: null
        });
      } else {
        await window.portalCollectiveStore.save(sheet);
      }
      successMessage.innerHTML = '<span class="release-done-icon" aria-hidden="true">✓</span><strong>Concluído!</strong> Solicitação enviada ao engenheiro para decisão do abono.<small>Voltando ao seu painel…</small>';
      successMessage.classList.add("is-done");
      successMessage.hidden = false;
      successMessage.scrollIntoView({ behavior: "smooth", block: "center" });
      window.portalButtonLoading(submitButton, "Enviado! Voltando ao painel…");
      setTimeout(() => { window.location.href = "Portal.html"; }, 2200);
      return;
    } catch (error) {
      console.error(error);
      fail("Não foi possível enviar a liberação coletiva. Tente novamente.");
    }
    stop();
    isSubmitting = false;
    submitButton.disabled = false;
  });

  await loadEmployees();
  await loadSigners(rawEmployees);

  // ?edit=ID: ajustar e reenviar uma liberação coletiva recusada pelo engenheiro.
  if (editId) {
    try {
      editing = (await window.portalCollectiveStore.getAll()).find((item) => item.id === editId) || null;
    } catch (error) {
      console.error(error);
    }
    if (editing && editing.stage !== "foreman") {
      fail("Esta liberação já está em análise e só pode ser editada se o engenheiro recusar.");
      editing = null;
    } else if (!editing) {
      fail("Liberação coletiva não encontrada.");
    } else {
      document.querySelector("#release-title").textContent = "Editar e reenviar liberação coletiva";
      submitButton.textContent = "Reenviar ao engenheiro";
      const refusal = document.querySelector("#release-refusal");
      refusal.textContent = `Recusada por ${editing.refusedBy || "engenheiro"}: ${editing.refusalReason || "sem motivo informado"}. Ajuste os dados e envie novamente.`;
      refusal.hidden = editing.stage !== "foreman";
      (editing.participants || []).forEach((person) => chosen.set(person.matricula, person));
      document.querySelector("#release-date").value = editing.date || "";
      document.querySelector("#release-time").value = editing.time || "";
      service.value = editing.motive || "";
      document.querySelectorAll('input[name="movement"]').forEach((input) => { input.checked = (editing.movement || ["saida"]).includes(input.value); });
      const bonus = document.querySelector(`input[name="bonus-request"][value="${editing.bonusRequest}"]`);
      if (bonus) bonus.checked = true;
      if (editing.foreman) foremanSelect.value = editing.foreman;
      if (editing.targetEngineer) engineerSelect.value = editing.targetEngineer;
    }
  }
  renderChosen();
  loadHistory();
})();
