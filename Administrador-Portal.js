(async () => {
  await window.portalAuthDemo?.ready();
  const session = window.portalAuthDemo?.getSession();
  if (session?.role !== "Administrador Analista" && session?.roleValue !== "administrador-analista") return;

  const allowForm = document.querySelector("#allowed-registration-form");
  const allowInput = document.querySelector("#allowed-registration");
  const allowName = document.querySelector("#allowed-name");
  const allowRole = document.querySelector("#allowed-role");
  const allowLookupMessage = document.querySelector("#allowed-lookup-message");
  const allowResult = document.querySelector("#allowed-result");
  const allowedList = document.querySelector("#allowed-list");
  const employeeForm = document.querySelector("#employee-form");
  const employeeRegistration = document.querySelector("#employee-registration");
  const employeeResult = document.querySelector("#employee-result");
  const employeeList = document.querySelector("#employee-list");
  const allowSubmit = allowForm.querySelector('button[type="submit"]');
  const allowCancelEdit = document.querySelector("#allowed-cancel-edit");
  const employeeSubmit = document.querySelector("#employee-submit");
  const employeeCancelEdit = document.querySelector("#employee-cancel-edit");
  let editingAllowedRegistration = null;
  let editingEmployee = null;
  const clearEmployees = document.querySelector("#clear-employees");
  const clearEmployeesSecurity = document.querySelector("#clear-employees-security");
  const clearEmployeesCode = document.querySelector("#clear-employees-code");
  const confirmClearEmployees = document.querySelector("#confirm-clear-employees");
  const clearEmployeesMessage = document.querySelector("#clear-employees-message");
  const employeesPhysicalSecurityCode = "3029";
  const porterList = document.querySelector("#porter-request-list");
  const porterPendingCount = document.querySelector("#porter-pending-count");
  const registeredUsersList = document.querySelector("#registered-users-list");
  const registeredUsersCount = document.querySelector("#registered-users-count");

  function normalizeInput(input) {
    input.value = input.value.replace(/\D/g, "").slice(0, 7);
  }

  function normalizeNameInput(input) {
    input.value = String(input.value || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toUpperCase()
      .replace(/\s+/g, " ")
      .replace(/^\s+/, "");
  }

  async function getForemen() {
    const users = await window.portalAuthDemo.getAllUsers();
    const foremanRoles = ["encarregado", "dp", "engenheiro"];
    return users.filter((user) => foremanRoles.includes(user.roleValue) && user.status === "approved");
  }

  async function renderForemanOptions() {
    const foremanSelect = document.querySelector("#employee-foreman");
    if (!foremanSelect) return;
    const foremen = await getForemen();
    const currentValue = foremanSelect.value;
    foremanSelect.innerHTML = '<option value="">Sem encarregado</option>' +
      foremen.map((foreman) => `<option value="${escapeHtml(foreman.name)}">${escapeHtml(foreman.name)}</option>`).join("");
    if (foremen.some((foreman) => foreman.name === currentValue)) foremanSelect.value = currentValue;
  }

  async function renderAllowed() {
    const registrations = await window.portalEmployeeStore.getAllowedRegistrations();
    allowedList.innerHTML = registrations.length
      ? registrations.map((item) => `<li class="list-group-item d-flex justify-content-between align-items-center gap-2"><span><strong>${escapeHtml(item.nome) || "Nome não informado"}</strong><small class="d-block text-muted">Matrícula: ${escapeHtml(item.matricula)} · Perfil: ${escapeHtml(item.role) || "Acesso"}</small></span><span class="text-end"><small class="d-block">${item.status === "ativo" ? "Permitida" : "Inativa"}</small><button class="btn btn-sm btn-outline-primary" type="button" data-allowed-action="edit" data-allowed-id="${escapeHtml(item.matricula)}">Editar</button> <button class="btn btn-sm btn-outline-danger" type="button" data-allowed-action="delete" data-allowed-id="${escapeHtml(item.matricula)}">Apagar</button></span></li>`).join("")
      : '<li class="list-group-item text-muted">Nenhuma matrícula liberada.</li>';
  }

  async function renderEmployees() {
    const employees = await window.portalEmployeeStore.getAll();
    const foremen = await getForemen();
    const foremanOptions = (selected) => '<option value="">Sem encarregado</option>' +
      foremen.map((foreman) => `<option value="${escapeHtml(foreman.name)}"${foreman.name === selected ? " selected" : ""}>${escapeHtml(foreman.name)}</option>`).join("");
    employeeList.innerHTML = employees.length
      ? employees.map((item) => `<li class="list-group-item d-flex justify-content-between align-items-center gap-2 flex-wrap"><span><strong>${escapeHtml(item.nome) || "Nome não informado"}</strong><small class="d-block text-muted">Matrícula: ${escapeHtml(item.matricula)} · ${escapeHtml(item.funcao) || "Função não informada"} · ${escapeHtml(item.setor) || "Setor não informado"}</small><small class="d-block text-muted">Encarregado: ${escapeHtml(item.encarregado) || "Não vinculado"}</small></span><span class="d-flex align-items-center gap-2 flex-wrap justify-content-end"><select class="form-select form-select-sm" style="width:auto" data-foreman-select="${escapeHtml(item.matricula)}">${foremanOptions(item.encarregado)}</select><button class="btn btn-sm btn-outline-success" type="button" data-employee-action="link-foreman" data-employee-id="${escapeHtml(item.matricula)}">Vincular encarregado</button><button class="btn btn-sm btn-outline-primary" type="button" data-employee-action="edit" data-employee-id="${escapeHtml(item.matricula)}">Editar</button> <button class="btn btn-sm btn-outline-danger" type="button" data-employee-action="delete" data-employee-id="${escapeHtml(item.matricula)}">Apagar</button></span></li>`).join("")
      : '<li class="list-group-item text-muted">Nenhum colaborador cadastrado.</li>';
  }

  async function renderPorterRequests() {
    const requests = await window.portalAuthDemo.getPorterRequests();
    const pending = requests.filter((request) => request.status === "pending-dp");
    porterPendingCount.textContent = `${pending.length} pendentes`;
    porterList.innerHTML = requests.length
      ? requests.map((request) => `
        <article class="border rounded p-3 mb-2">
          <div class="d-flex justify-content-between gap-3 flex-wrap">
            <div>
              <strong>${escapeHtml(request.name) || "Nome não informado"}</strong>
              <small class="d-block text-muted">${escapeHtml(request.email) || "E-mail não informado"}</small>
              <small class="d-block text-muted">Função: Porteiro · Enviado em: ${new Date(request.createdAt).toLocaleString("pt-BR")}</small>
            </div>
            <span class="badge ${request.status === "pending-dp" ? "text-bg-warning" : request.status === "approved" ? "text-bg-success" : "text-bg-danger"}">
              ${request.status === "pending-dp" ? "Pendente" : request.status === "approved" ? "Aprovado" : "Reprovado"}
            </span>
          </div>
          ${request.status === "pending-dp" ? `
            <div class="d-flex gap-2 mt-3">
              <button class="btn btn-success btn-sm" type="button" data-porter-action="approve" data-porter-id="${request.id}">Aprovar cadastro</button>
              <button class="btn btn-outline-danger btn-sm" type="button" data-porter-action="reject" data-porter-id="${request.id}">Reprovar cadastro</button>
            </div>` : ""}
          <div class="d-flex gap-2 mt-3">
            <button class="btn btn-outline-primary btn-sm" type="button" data-porter-action="edit" data-porter-id="${request.id}">Editar</button>
            <button class="btn btn-outline-danger btn-sm" type="button" data-porter-action="delete" data-porter-id="${request.id}">Apagar</button>
          </div>
        </article>
      `).join("")
      : '<p class="text-muted mb-0">Nenhum cadastro de porteiro recebido.</p>';
  }

  async function renderRegisteredUsers() {
    const users = await window.portalAuthDemo.getAllUsers();
    const visible = users.filter((user) => user.roleValue !== "administrador-analista");
    registeredUsersCount.textContent = `${visible.length} cadastrados`;
    registeredUsersList.innerHTML = visible.length
      ? visible.map((user) => {
        const statusLabel = user.status === "approved" ? "Aprovado" : user.status === "pending-dp" ? "Pendente" : "Reprovado";
        const statusClass = user.status === "approved" ? "text-bg-success" : user.status === "pending-dp" ? "text-bg-warning" : "text-bg-danger";
        return `<li class="list-group-item d-flex justify-content-between align-items-center gap-2 flex-wrap"><span><strong>${escapeHtml(user.name) || "Nome não informado"}</strong><small class="d-block text-muted">${escapeHtml(user.email) || "E-mail não informado"}${user.matricula ? ` · Matrícula: ${escapeHtml(user.matricula)}` : ""} · Perfil: ${escapeHtml(user.role) || "Não informado"}</small></span><span class="badge ${statusClass}">${statusLabel}</span></li>`;
      }).join("")
      : '<li class="list-group-item text-muted">Nenhum usuário cadastrado.</li>';
  }

  function lookupAllowedEmployee() {
    normalizeInput(allowInput);
    const found = /^\d{7}$/.test(allowInput.value);
    allowLookupMessage.textContent = found
      ? "Matrícula pronta para autorização. Informe o nome completo e o perfil."
      : "Digite uma matrícula com 7 números.";
    allowLookupMessage.classList.toggle("text-success", found);
    allowLookupMessage.classList.toggle("text-danger", !found && allowInput.value.length > 0);
  }

  [allowInput, employeeRegistration].forEach((input) => input.addEventListener("input", () => normalizeInput(input)));
  [allowName, document.querySelector("#employee-name")].forEach((input) => {
    input.addEventListener("input", () => normalizeNameInput(input));
  });
  allowInput.addEventListener("input", lookupAllowedEmployee);
  allowForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    normalizeInput(allowInput);
    normalizeNameInput(allowName);
    const name = allowName.value;
    if (!/^\d{7}$/.test(allowInput.value) || !name) {
      lookupAllowedEmployee();
      allowResult.textContent = !/^\d{7}$/.test(allowInput.value)
        ? "Informe uma matrícula com 7 números."
        : "Informe o nome completo do colaborador.";
      allowResult.hidden = false;
      return;
    }
    if (!allowRole.value) {
      allowRole.reportValidity();
      return;
    }
    const changes = {
      nome: name,
      roleValue: allowRole.value,
      role: allowRole.options[allowRole.selectedIndex].textContent
    };
    if (editingAllowedRegistration) {
      await window.portalEmployeeStore.updateAllowedRegistration(editingAllowedRegistration, changes);
      allowResult.textContent = "Matrícula permitida atualizada.";
    } else {
      await window.portalEmployeeStore.addAllowedRegistration(allowInput.value, changes);
      allowResult.textContent = "Matrícula permitida adicionada.";
    }
    allowResult.hidden = false;
    allowForm.reset();
    editingAllowedRegistration = null;
    allowInput.disabled = false;
    allowCancelEdit.hidden = true;
    allowSubmit.textContent = "Adicionar matrícula permitida";
    await renderAllowed();
    await renderEmployees();
  });
  employeeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const normalizedMatricula = employeeRegistration.value.replace(/\D/g, "").slice(0, 7);
    if (!editingEmployee) {
      const existingEmployees = await window.portalEmployeeStore.getAll();
      if (existingEmployees.some((item) => item.matricula === normalizedMatricula)) {
        employeeResult.textContent = "Já existe um colaborador cadastrado com esta matrícula. Use \"Editar\" na lista para atualizar os dados dele.";
        employeeResult.hidden = false;
        return;
      }
    }
    const employeeData = {
      matricula: employeeRegistration.value,
      nome: window.portalAuthDemo.normalizeIdentity(document.querySelector("#employee-name").value),
      funcao: document.querySelector("#employee-role").value.trim(),
      setor: document.querySelector("#employee-team").value.trim(),
      encarregado: window.portalAuthDemo.normalizeIdentity(document.querySelector("#employee-foreman").value)
    };
    await window.portalEmployeeStore.upsert(employeeData);
    employeeResult.textContent = editingEmployee
      ? "Colaborador atualizado."
      : "Colaborador de linha de frente salvo. Ele não recebeu acesso ao portal.";
    employeeResult.hidden = false;
    employeeForm.reset();
    editingEmployee = null;
    employeeRegistration.disabled = false;
    employeeCancelEdit.hidden = true;
    employeeSubmit.textContent = "Salvar colaborador";
    await renderEmployees();
  });
  allowedList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-allowed-action]");
    if (!button) return;
    const registrations = await window.portalEmployeeStore.getAllowedRegistrations();
    const item = registrations.find((entry) => entry.matricula === button.dataset.allowedId);
    if (!item) return;
    if (button.dataset.allowedAction === "delete") {
      if (!window.confirm("Apagar esta matrícula permitida?")) return;
      await window.portalEmployeeStore.removeAllowedRegistration(item.matricula);
      await renderAllowed();
      return;
    }
    editingAllowedRegistration = item.matricula;
    allowInput.value = item.matricula;
    allowInput.disabled = true;
    allowName.value = item.nome || "";
    allowRole.value = item.roleValue || "";
    allowSubmit.disabled = false;
    allowSubmit.textContent = "Salvar edição";
    allowCancelEdit.hidden = false;
    allowInput.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  employeeForm.addEventListener("click", (event) => {
    if (event.target !== employeeCancelEdit) return;
    editingEmployee = null;
    employeeForm.reset();
    employeeRegistration.disabled = false;
    employeeCancelEdit.hidden = true;
    employeeSubmit.textContent = "Salvar colaborador";
  });
  porterList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-porter-action]");
    if (!button) return;
    if (button.dataset.porterAction === "delete") {
      if (window.confirm("Apagar este cadastro de porteiro?")) {
        await window.portalAuthDemo.removePorterRequest(button.dataset.porterId);
        await renderPorterRequests();
        await renderRegisteredUsers();
      }
      return;
    }
    if (button.dataset.porterAction === "edit") {
      const requests = await window.portalAuthDemo.getPorterRequests();
      const request = requests.find((item) => item.id === button.dataset.porterId);
      if (!request) return;
      const name = window.prompt("Nome completo do porteiro:", request.name || "");
      if (name === null) return;
      const email = window.prompt("E-mail do porteiro:", request.email || "");
      if (email === null) return;
      await window.portalAuthDemo.updatePorterProfile(request.id, {
        name: window.portalAuthDemo.normalizeIdentity(name),
        email: email.trim()
      });
      await renderPorterRequests();
      await renderRegisteredUsers();
      return;
    }
    const status = button.dataset.porterAction === "approve" ? "approved" : "rejected";
    await window.portalAuthDemo.updatePorterRequest(button.dataset.porterId, status);
    await renderPorterRequests();
    await renderRegisteredUsers();
  });
  allowCancelEdit.addEventListener("click", () => {
    editingAllowedRegistration = null;
    allowForm.reset();
    allowInput.disabled = false;
    allowCancelEdit.hidden = true;
    allowSubmit.textContent = "Adicionar matrícula permitida";
  });
  document.querySelector("#employee-list")?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-employee-action]");
    if (!button) return;
    const employees = await window.portalEmployeeStore.getAll();
    const employee = employees.find((item) => item.matricula === button.dataset.employeeId);
    if (!employee) return;
    if (button.dataset.employeeAction === "delete") {
      if (window.confirm("Apagar este colaborador?")) {
        await window.portalEmployeeStore.remove(employee.matricula);
        await renderEmployees();
      }
      return;
    }
    if (button.dataset.employeeAction === "link-foreman") {
      const select = employeeList.querySelector(`[data-foreman-select="${CSS.escape(button.dataset.employeeId)}"]`);
      await window.portalEmployeeStore.upsert({ ...employee, encarregado: select ? select.value : "" });
      employeeResult.textContent = "Encarregado vinculado.";
      employeeResult.hidden = false;
      await renderEmployees();
      return;
    }
    editingEmployee = employee.matricula;
    employeeRegistration.value = employee.matricula;
    employeeRegistration.disabled = true;
    document.querySelector("#employee-name").value = employee.nome || "";
    document.querySelector("#employee-role").value = employee.funcao || "";
    document.querySelector("#employee-team").value = employee.setor || "";
    document.querySelector("#employee-foreman").value = employee.encarregado || "";
    employeeCancelEdit.hidden = false;
    employeeSubmit.textContent = "Salvar edição";
    employeeForm.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  clearEmployeesSecurity.hidden = true;
  clearEmployees.addEventListener("click", () => {
    clearEmployeesSecurity.hidden = false;
    clearEmployeesMessage.textContent = "Digite o código físico para confirmar a exclusão de todos os colaboradores.";
    clearEmployeesMessage.className = "d-block mt-1";
    clearEmployeesCode.value = "";
    clearEmployeesCode.focus();
  });
  confirmClearEmployees.addEventListener("click", async () => {
    if (clearEmployeesCode.value.trim() !== employeesPhysicalSecurityCode) {
      clearEmployeesMessage.textContent = "Código incorreto. Nenhum colaborador foi apagado.";
      clearEmployeesMessage.className = "d-block mt-1 text-danger";
      clearEmployeesCode.focus();
      return;
    }
    if (!window.confirm("Apagar TODOS os colaboradores cadastrados? Esta ação não pode ser desfeita.")) return;
    await window.portalEmployeeStore.removeAll();
    clearEmployeesSecurity.hidden = true;
    await renderEmployees();
  });

  renderAllowed();
  renderEmployees();
  renderPorterRequests();
  renderForemanOptions();
  renderRegisteredUsers();
})();
