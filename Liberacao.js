(async () => {
  await window.portalAuthDemo?.ready();
  const form = document.querySelector("#release-form");
  const reasonInputs = document.querySelectorAll('input[name="reason"]');
  const particularField = document.querySelector("#particular-reason-field");
  const particularReason = document.querySelector("#particular-reason");
  const errorMessage = document.querySelector("#release-error");
  const successMessage = document.querySelector("#release-success");
  const employee = document.querySelector("#employee");
  const employeeSearch = document.querySelector("#employee-search");
  let allEmployees = [];

  function normalizeSearchText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
  }

  const employeeResults = document.querySelector("#employee-results");
  const employeeSelected = document.querySelector("#employee-selected");
  let selectedEmployeeName = "";
  let selectedEmployeeRole = "";

  function selectEmployee(item) {
    employee.value = item ? item.matricula : "";
    selectedEmployeeName = item ? item.nome : "";
    selectedEmployeeRole = item ? item.funcao || "" : "";
    employeeSelected.textContent = item ? `Selecionado: ${item.nome} · Matrícula ${item.matricula}` : "";
    employeeSelected.hidden = !item;
    employeeSearch.value = "";
    if (item) errorMessage.hidden = true;
    filterEmployees();
  }

  function filterEmployees() {
    const term = normalizeSearchText(employeeSearch.value.trim());
    employeeResults.innerHTML = "";
    if (!term) return;
    const matches = allEmployees.filter((item) => normalizeSearchText(item.nome).includes(term) || item.matricula.includes(term));
    if (!matches.length) {
      employeeResults.innerHTML = '<div class="list-group-item text-muted">Nenhum colaborador encontrado.</div>';
      return;
    }
    matches.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("role", "option");
      button.className = `list-group-item list-group-item-action${item.matricula === employee.value ? " active" : ""}`;
      button.textContent = `${item.nome} · Matrícula ${item.matricula}`;
      button.addEventListener("click", () => selectEmployee(item));
      employeeResults.append(button);
    });
  }

  function updatePageCopy() {
    const session = window.portalAuthDemo?.getSession();
    const roleLabel = session?.role || "Colaborador";
    const kicker = document.querySelector("#release-kicker");
    const employeeHint = document.querySelector("#employee-hint");
    const signatureDescription = document.querySelector("#signature-description");
    if (kicker) kicker.textContent = `${roleLabel} · Obra 369`;
    if (employeeHint) {
      employeeHint.textContent = ["encarregado", "estagiario_engenharia"].includes(session?.roleValue)
        ? "Sua equipe e colaboradores ainda sem encarregado vinculado serão exibidos."
        : "Selecione o colaborador para registrar a liberação.";
    }
    if (signatureDescription) {
      signatureDescription.textContent = "Ao enviar, seu nome, perfil, data e hora serão registrados como assinatura de quem solicitou.";
    }
  }

  // O detalhe do motivo é obrigatório nos dois casos: qual tarefa foi feita ou qual o motivo particular.
  function updateParticularField() {
    const selected = document.querySelector('input[name="reason"]:checked');
    particularField.hidden = !selected;
    particularReason.required = !!selected;
    if (!selected) return;
    const isTask = selected.value === "tarefa";
    document.querySelector("#reason-detail-label").innerHTML = `${isTask ? "Qual tarefa foi realizada?" : "Informe o motivo particular"} <span aria-hidden="true">*</span>`;
    particularReason.placeholder = isTask ? "Descreva a tarefa que o colaborador realizou" : "Descreva o motivo da saída";
  }

  const movementInputs = () => [...document.querySelectorAll('input[name="movement"]:checked')].map((input) => input.value);

  async function renderEmployees() {
    const session = window.portalAuthDemo?.getSession();
    const allEmployeesRaw = await window.portalEmployeeStore?.getAll() || [];
    let employees;
    if (["encarregado", "estagiario_engenharia"].includes(session?.roleValue)) {
      const myTeam = allEmployeesRaw.filter((item) => item.encarregado?.trim().toLowerCase() === session.name?.trim().toLowerCase());
      const unassigned = allEmployeesRaw.filter((item) => !item.encarregado);
      const seen = new Set(myTeam.map((item) => item.matricula));
      employees = [...myTeam, ...unassigned.filter((item) => !seen.has(item.matricula))];
    } else {
      // DP, engenheiro e administrador podem liberar qualquer colaborador cadastrado, sem restrição de encarregado ou status.
      employees = allEmployeesRaw;
    }
    employees.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
    allEmployees = employees;
    filterEmployees();
    const editId = new URLSearchParams(window.location.search).get("edit");
    if (!editId) return;
    const releases = await window.portalDemoStore?.getReleases() || [];
    const release = releases.find((item) => item.id === editId);
    if (!release) return;
    const matchingEmployee = employees.find((item) => item.nome === release.name);
    if (matchingEmployee) selectEmployee(matchingEmployee);
    document.querySelector("#release-date").value = release.date || release.createdAt?.slice(0, 10) || "";
    document.querySelector("#release-time").value = release.time || "";
    const savedReason = release.reasonType || (release.reason === "Tarefa" ? "tarefa" : release.reason === "Particular" ? "particular" : "");
    const reason = [...reasonInputs].find((input) => input.value === savedReason);
    if (reason) reason.checked = true;
    if (window.portalReleaseFlow.stageOf(release) === "foreman") {
      const refusal = document.querySelector("#release-refusal");
      refusal.textContent = `Recusada por ${release.refusedBy || "engenheiro"}: ${release.refusalReason || "sem motivo informado"}. Ajuste os dados e envie novamente.`;
      refusal.hidden = false;
    }
    particularReason.value = release.reasonDetail ?? (savedReason === "particular" && release.reason !== "Particular" ? release.reason || "" : "");
    const savedMovement = release.movement || ["saida"];
    document.querySelectorAll('input[name="movement"]').forEach((input) => { input.checked = savedMovement.includes(input.value); });
    updateParticularField();
  }

  updatePageCopy();
  await renderEmployees();

  employeeSearch?.addEventListener("input", filterEmployees);

  reasonInputs.forEach((input) => input.addEventListener("change", updateParticularField));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorMessage.hidden = true;
    successMessage.hidden = true;
    updateParticularField();

    if (!employee.value || !movementInputs().length || !form.checkValidity()) {
      if (employee.value && movementInputs().length) form.reportValidity();
      errorMessage.textContent = !employee.value
        ? "Pesquise e selecione um colaborador antes de enviar a liberação."
        : !movementInputs().length
          ? "Marque entrada, saída ou as duas."
          : "Confira os campos obrigatórios antes de enviar a liberação.";
      errorMessage.hidden = false;
      return;
    }

    const selectedEmployee = selectedEmployeeName;
    const reason = document.querySelector('input[name="reason"]:checked').value;
    const editId = new URLSearchParams(window.location.search).get("edit");
    const session = window.portalAuthDemo?.getSession();
    const existing = editId ? (await window.portalDemoStore.getReleases()).find((item) => item.id === editId) : null;
    if (editId && !existing) {
      errorMessage.textContent = "Liberação não encontrada.";
      errorMessage.hidden = false;
      return;
    }
    const isForeman = ["encarregado", "estagiario_engenharia"].includes(session?.roleValue);
    if (existing && isForeman && window.portalReleaseFlow.stageOf(existing) !== "foreman") {
      errorMessage.textContent = "Esta liberação já está em análise e só pode ser editada se o engenheiro recusar.";
      errorMessage.hidden = false;
      return;
    }
    const releaseData = {
      name: selectedEmployee,
      registration: employee.value,
      role: selectedEmployeeRole,
      date: document.querySelector("#release-date").value,
      team: "Equipe local",
      time: document.querySelector("#release-time").value,
      movement: movementInputs(),
      reasonType: reason,
      reasonDetail: particularReason.value.trim(),
      reason: reason === "particular" ? particularReason.value.trim() : `Tarefa: ${particularReason.value.trim()}`,
      requester: existing?.requester || session?.name || "Solicitante"
    };
    if (!existing) {
      await window.portalDemoStore.saveRelease({
        ...releaseData,
        hours: "Pendente",
        status: "pending",
        stage: "engineer",
        requestedAt: new Date().toISOString()
      });
    } else if (window.portalReleaseFlow.stageOf(existing) === "foreman") {
      // Reenvio após recusa: volta para o engenheiro e guarda a recusa anterior no histórico.
      await window.portalDemoStore.updateRelease(editId, {
        ...releaseData,
        status: "pending",
        stage: "engineer",
        requestedAt: new Date().toISOString(),
        refusalHistory: [...(existing.refusalHistory || []), { by: existing.refusedBy, at: existing.refusedAt, reason: existing.refusalReason }],
        refusedBy: null,
        refusedAt: null,
        refusalReason: null
      });
    } else {
      await window.portalDemoStore.updateRelease(editId, releaseData);
    }
    successMessage.innerHTML = '<span class="release-done-icon" aria-hidden="true">✓</span><strong>Concluído!</strong> Solicitação enviada ao engenheiro responsável para decisão do abono.<small>Voltando ao seu painel…</small>';
    successMessage.classList.add("is-done");
    successMessage.hidden = false;
    successMessage.scrollIntoView({ behavior: "smooth", block: "center" });
    form.querySelector(".release-submit").disabled = true;
    setTimeout(() => { window.location.href = "Portal.html"; }, 2200);
  });
})();
