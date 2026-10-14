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
  const porterSearch = document.querySelector("#porter-search");
  const registeredUsersSearch = document.querySelector("#registered-users-search");
  const allowedSearch = document.querySelector("#allowed-search");

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
    const foremanRoles = ["encarregado", "dp", "engenheiro", "estagiario_engenharia", "analista", "seguranca_trabalho"];
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

  // Listas paginadas (js/core/pagination.js), como no Meu portal: sem elas a página virava um rolo de milhares de
  // pixels (centenas de colaboradores). Buscar volta para a página 1; cada lista guarda o "por página" escolhido.
  const pagers = {};
  const pagerFor = (key, list, search, render) => pagers[key] || (pagers[key] = window.portalPagination.create({ key: `admin-${key}`, after: list, search, onChange: render }));

  async function renderAllowed() {
    const registrations = await window.portalEmployeeStore.getAllowedRegistrations();
    const query = window.normalizeSearchText(allowedSearch?.value || "");
    const visible = pagerFor("matriculas", allowedList, allowedSearch, renderAllowed).slice(query
      ? registrations.filter((item) => window.normalizeSearchText(`${item.nome} ${item.matricula}`).includes(query))
      : registrations);
    allowedList.innerHTML = visible.length
      ? visible.map((item) => `<li class="list-group-item d-flex justify-content-between align-items-center gap-2"><span><strong>${escapeHtml(item.nome) || "Nome não informado"}</strong><small class="d-block text-muted">Matrícula: ${escapeHtml(item.matricula)} · Perfil: ${escapeHtml(item.role) || "Acesso"}</small></span><span class="text-end"><small class="d-block">${item.status === "ativo" ? "Permitida" : "Inativa"}</small><button class="btn btn-sm btn-outline-primary" type="button" data-allowed-action="edit" data-allowed-id="${escapeHtml(item.matricula)}">Editar</button> <button class="btn btn-sm btn-outline-danger" type="button" data-allowed-action="delete" data-allowed-id="${escapeHtml(item.matricula)}">Apagar</button></span></li>`).join("")
      : `<li class="list-group-item text-muted">${query ? "Nenhum resultado para a busca." : "Nenhuma matrícula liberada."}</li>`;
  }

  const foldText = (value) => String(value || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  async function renderEmployees() {
    const allEmployees = (await window.portalEmployeeStore.getAll())
      .sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR", { sensitivity: "base" }));
    const foremen = await getForemen();
    const filterSelect = document.querySelector("#employee-filter");
    const filterCurrent = filterSelect.value;
    filterSelect.innerHTML = '<option value="">Todos os encarregados</option><option value="__none__">Sem encarregado</option>' +
      foremen.map((foreman) => `<option value="${escapeHtml(foreman.name)}">${escapeHtml(foreman.name)}</option>`).join("");
    filterSelect.value = [...filterSelect.options].some((option) => option.value === filterCurrent) ? filterCurrent : "";
    const term = foldText(document.querySelector("#employee-search").value.trim());
    const employees = allEmployees.filter((item) => {
      if (filterSelect.value === "__none__" && item.encarregado) return false;
      if (filterSelect.value && filterSelect.value !== "__none__" && item.encarregado !== filterSelect.value) return false;
      return !term || foldText([item.nome, item.matricula, item.funcao, item.setor].join(" ")).includes(term);
    });
    document.querySelector("#employee-count").textContent = `${employees.length} de ${allEmployees.length} colaboradores`;
    const foremanOptions = (selected) => '<option value="">Sem encarregado</option>' +
      foremen.map((foreman) => `<option value="${escapeHtml(foreman.name)}"${foreman.name === selected ? " selected" : ""}>${escapeHtml(foreman.name)}</option>`).join("");
    const pageEmployees = pagerFor("colaboradores", employeeList, document.querySelector("#employee-search"), renderEmployees).slice(employees);
    employeeList.innerHTML = pageEmployees.length
      ? pageEmployees.map((item) => `<li class="list-group-item d-flex justify-content-between align-items-center gap-2 flex-wrap"><span><strong>${escapeHtml(item.nome) || "Nome não informado"}</strong><small class="d-block text-muted">Matrícula: ${escapeHtml(item.matricula)} · ${escapeHtml(item.funcao) || "Função não informada"} · ${escapeHtml(item.setor) || "Setor não informado"}</small><small class="d-block text-muted">Encarregado: ${escapeHtml(item.encarregado) || "Não vinculado"}</small></span><span class="d-flex align-items-center gap-2 flex-wrap justify-content-end"><select class="form-select form-select-sm" style="width:auto" data-foreman-select="${escapeHtml(item.matricula)}">${foremanOptions(item.encarregado)}</select><button class="btn btn-sm btn-outline-success" type="button" data-employee-action="link-foreman" data-employee-id="${escapeHtml(item.matricula)}">Vincular encarregado</button><button class="btn btn-sm btn-outline-primary" type="button" data-employee-action="edit" data-employee-id="${escapeHtml(item.matricula)}">Editar</button> <button class="btn btn-sm btn-outline-danger" type="button" data-employee-action="delete" data-employee-id="${escapeHtml(item.matricula)}">Apagar</button></span></li>`).join("")
      : `<li class="list-group-item text-muted">${allEmployees.length ? "Nenhum colaborador encontrado para este filtro." : "Nenhum colaborador cadastrado."}</li>`;
  }

  async function renderPorterRequests() {
    const requests = await window.portalAuthDemo.getPorterRequests();
    const pending = requests.filter((request) => request.status === "pending-dp");
    porterPendingCount.textContent = `${pending.length} pendentes`;
    const query = window.normalizeSearchText(porterSearch?.value || "");
    const visible = pagerFor("porteiros", porterList, porterSearch, renderPorterRequests).slice(query
      ? requests.filter((request) => window.normalizeSearchText(`${request.name} ${request.email}`).includes(query))
      : requests);
    porterList.innerHTML = visible.length
      ? visible.map((request) => `
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
      : `<p class="text-muted mb-0">${query ? "Nenhum resultado para a busca." : "Nenhum cadastro de porteiro recebido."}</p>`;
  }

  // Perfis que o administrador pode dar a uma conta já cadastrada (os mesmos do "Liberar matrícula").
  const ROLE_LABELS = {
    dp: "Departamento Pessoal",
    encarregado: "Encarregado",
    estagiario_engenharia: "Estagiário de Engenharia",
    analista: "Analista",
    seguranca_trabalho: "Segurança do trabalho",
    engenheiro: "Engenheiro responsável"
  };

  // Privilégios que o administrador pode dar, por perfil. O analista é o perfil "curinga": com um acesso ele VIRA
  // aquele perfil no Meu portal (DP tem prioridade; com engenheiro + segurança, alterna entre os dois).
  const PRIVILEGES = {
    engenheiro: [
      { key: "gestor", label: "Gestor", grant: "Tornar Gestor", revoke: "Revogar Gestor", note: "Recebe TODAS as liberações, individuais e coletivas." }
    ],
    analista: [
      { key: "dp", label: "Acesso de DP", grant: "Dar acesso de DP", revoke: "Revogar acesso de DP", note: "Vira DP: abre direto no painel do DP." },
      { key: "engenheiro", label: "Acesso de engenheiro", grant: "Dar acesso de engenheiro", revoke: "Revogar acesso de engenheiro", note: "Vira engenheiro: recebe só o que for enviado a ele (as liberações da equipe dele)." },
      { key: "gestor", label: "Gestor", grant: "Tornar Gestor", revoke: "Revogar Gestor", note: "Com acesso de engenheiro: recebe TODAS as liberações, como o engenheiro Gestor." },
      { key: "seguranca_trabalho", label: "Acesso de segurança do trabalho", grant: "Dar acesso de segurança do trabalho", revoke: "Revogar acesso de segurança do trabalho", note: "Abre o painel da segurança do trabalho." }
    ]
  };
  const privilegeMenu = (user) => {
    const defs = PRIVILEGES[user.roleValue] || [];
    const has = (def) => (user.privileges || []).includes(def.key);
    const items = defs.length
      ? `<li><h6 class="dropdown-header">Privilégios</h6></li>${defs.map((def) => `<li><button class="dropdown-item ${has(def) ? "text-danger fw-semibold" : ""}" type="button" data-privilege-user="${escapeHtml(user.id)}" data-privilege-key="${def.key}" data-privilege-grant="${has(def) ? "0" : "1"}">${has(def) ? def.revoke : def.grant}</button><span class="dropdown-item-text small text-muted pt-0">${def.note}</span></li>`).join("")}`
      : '<li><span class="dropdown-item-text small text-muted">Este perfil não tem privilégios para dar.</span></li>';
    // Mudar perfil (ex.: Encarregado -> Analista, o "curinga" que recebe os acessos acima). A portaria tem cadastro à parte.
    const roleItems = user.roleValue === "porteiro" ? "" : `<li><hr class="dropdown-divider"></li><li><h6 class="dropdown-header">Mudar perfil (hoje: ${escapeHtml(ROLE_LABELS[user.roleValue] || user.role || "—")})</h6></li>${Object.entries(ROLE_LABELS).filter(([value]) => value !== user.roleValue).map(([value, label]) => `<li><button class="dropdown-item" type="button" data-role-user="${escapeHtml(user.id)}" data-role-value="${value}">Mudar para ${escapeHtml(label)}</button></li>`).join("")}`;
    // Fotos de perfil premium: o administrador presenteia (desbloqueia) ou tira, para qualquer perfil.
    const owned = (id) => (user.premiumAvatars || []).includes(id);
    const premiumItems = `<li><hr class="dropdown-divider"></li><li><h6 class="dropdown-header">Fotos de perfil premium</h6></li>${window.portalAvatars.premium.map((item) => `<li><button class="dropdown-item d-flex align-items-center gap-2 ${owned(item.id) ? "text-danger fw-semibold" : ""}" type="button" data-premium-user="${escapeHtml(user.id)}" data-premium-id="${item.id}" data-premium-grant="${owned(item.id) ? "0" : "1"}"><img src="${window.portalAvatars.url(item.id)}" alt="" width="28" height="28" style="border-radius:50%">${owned(item.id) ? `Tirar: ${escapeHtml(item.label)}` : `🎁 Presentear: ${escapeHtml(item.label)}`}</button></li>`).join("")}`;
    // Esqueceu a senha: abre a tela Senhas já com a matrícula (ou o e-mail) da pessoa.
    const who = user.matricula || user.email || "";
    const passwordItem = who ? `<li><a class="dropdown-item fw-semibold" href="Senhas.html?q=${encodeURIComponent(who)}">🔑 Redefinir senha</a></li><li><hr class="dropdown-divider"></li>` : "";
    return `<div class="dropdown"><button class="btn btn-sm btn-outline-secondary px-2" type="button" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Opções de ${escapeHtml(user.name)}">⋮</button><ul class="dropdown-menu dropdown-menu-end" style="min-width:17rem;max-height:70vh;overflow-y:auto">${passwordItem}${items}${roleItems}${premiumItems}</ul></div>`;
  };
  const privilegeBadge = (user) => {
    const given = (PRIVILEGES[user.roleValue] || []).filter((def) => (user.privileges || []).includes(def.key));
    const premiumCount = (user.premiumAvatars || []).filter((id) => window.portalAvatars.isPremium(id)).length;
    const badges = [
      ...given.map((def) => `<span class="badge text-bg-primary me-1">${def.label}</span>`),
      premiumCount ? `<span class="badge me-1" style="background:#ef6c00">🎁 ${premiumCount} foto${premiumCount > 1 ? "s" : ""} premium</span>` : ""
    ].filter(Boolean);
    return badges.length ? `<small class="d-block mt-1">${badges.join("")}</small>` : "";
  };

  // Quantas pessoas (estagiário, engenheiro e DP) estão vinculadas a um encarregado.
  const helpersOf = (users, foremanName) => users.filter((user) => window.portalAuthDemo.teamHelperRoles.includes(user.roleValue) && user.name !== foremanName &&
    user.status === "approved" && window.portalAuthDemo.linkedForemenOf(user).includes(foremanName)).length;

  async function renderRegisteredUsers() {
    const users = await window.portalAuthDemo.getAllUsers();
    const eligible = users.filter((user) => user.roleValue !== "administrador-analista");
    // Chefes de equipe a quem estagiário/engenheiro/DP se vinculam: encarregado e analista.
    const helperForemen = users.filter((user) => ["encarregado", "analista"].includes(user.roleValue) && user.status === "approved" && user.name);
    const roleWords = { estagiario_engenharia: "Estagiário", analista: "Analista", engenheiro: "Engenheiro", dp: "DP" };
    // Estagiário, engenheiro e DP podem estar em várias equipes: cada vínculo aparece com um "×" para tirar, e o
    // seletor adiciona mais um encarregado.
    const helperSelect = (user) => {
      const linked = window.portalAuthDemo.linkedForemenOf(user);
      const word = roleWords[user.roleValue] || "Vinculado";
      const chips = linked.map((name) => `<span class="badge text-bg-light border me-1 mt-1">${word} de ${escapeHtml(name)} <button type="button" class="btn-close ms-1" style="font-size:.55rem" data-unlink-user="${escapeHtml(user.id)}" data-foreman="${escapeHtml(name)}" aria-label="Tirar o vínculo com ${escapeHtml(name)}"></button></span>`).join("");
      // Até 4 pessoas vinculadas por encarregado (estagiário, engenheiro e DP somados): equipe cheia não aparece.
      const options = helperForemen.filter((foreman) => foreman.id !== user.id && !linked.includes(foreman.name) && helpersOf(users, foreman.name) < window.portalAuthDemo.maxHelpersPerForeman);
      return `<span class="d-block">${chips || '<small class="text-muted">Sem vínculo com encarregado</small>'}</span>${options.length ? `<select class="form-select form-select-sm mt-1" style="width:auto;max-width:100%" data-link-user="${escapeHtml(user.id)}" aria-label="Vincular ${word.toLowerCase()} a mais um encarregado"><option value="">${linked.length ? "Vincular a mais um encarregado…" : "Vincular a um encarregado…"}</option>${options.map((foreman) => `<option value="${escapeHtml(foreman.name)}">${word} de ${escapeHtml(foreman.name)}</option>`).join("")}</select>` : ""}`;
    };
    registeredUsersCount.textContent = `${eligible.length} cadastrados`;
    const query = window.normalizeSearchText(registeredUsersSearch?.value || "");
    const visible = pagerFor("usuarios", registeredUsersList, registeredUsersSearch, renderRegisteredUsers).slice(query
      ? eligible.filter((user) => window.normalizeSearchText(`${user.name} ${user.email} ${user.matricula || ""}`).includes(query))
      : eligible);
    registeredUsersList.innerHTML = visible.length
      ? visible.map((user) => {
        const statusLabel = user.status === "approved" ? "Aprovado" : user.status === "pending-dp" ? "Pendente" : "Reprovado";
        const statusClass = user.status === "approved" ? "text-bg-success" : user.status === "pending-dp" ? "text-bg-warning" : "text-bg-danger";
        return `<li class="list-group-item d-flex justify-content-between align-items-center gap-2 flex-wrap"><span class="registered-user">${window.portalAvatars.html(user)}<span><strong>${escapeHtml(user.name) || "Nome não informado"}</strong><small class="d-block text-muted">${escapeHtml(user.email) || "E-mail não informado"}${user.matricula ? ` · Matrícula: ${escapeHtml(user.matricula)}` : ""} · Perfil: ${escapeHtml(user.role) || "Não informado"}</small>${privilegeBadge(user)}${window.portalAuthDemo.teamHelperRoles.includes(user.roleValue) ? helperSelect(user) : ""}</span></span><span class="d-flex align-items-center gap-2"><span class="badge ${statusClass}">${statusLabel}</span>${privilegeMenu(user)}</span></li>`;
      }).join("")
      : `<li class="list-group-item text-muted">${query ? "Nenhum resultado para a busca." : "Nenhum usuário cadastrado."}</li>`;
  }

  // Mudar perfil (menu ⋮): muda na hora, como os privilégios, e avisa como desfazer.
  registeredUsersList.addEventListener("click", async (event) => {
    const item = event.target.closest("[data-role-user]");
    if (!item) return;
    const users = await window.portalAuthDemo.getAllUsers();
    const user = users.find((entry) => entry.id === item.dataset.roleUser);
    const roleValue = item.dataset.roleValue;
    const label = ROLE_LABELS[roleValue];
    if (!user || !label) return;
    const before = ROLE_LABELS[user.roleValue] || user.role || "perfil anterior";
    // Privilégios que continuam valendo no perfil novo (ex.: Gestor do engenheiro); os outros saem.
    const keep = (user.privileges || []).filter((key) => (PRIVILEGES[roleValue] || []).some((def) => def.key === key));
    const feedback = document.querySelector("#privilege-feedback");
    const say = (text, ok) => {
      feedback.textContent = text;
      feedback.className = `alert py-2 mt-3 mb-0 ${ok ? "alert-success" : "alert-danger"}`;
      feedback.hidden = false;
    };
    try {
      await window.portalAuthDemo.setUserRole(user.id, roleValue, label, keep);
    } catch (error) {
      console.error("Não foi possível mudar o perfil.", error);
      say(`Não foi possível mudar o perfil de ${user.name} (${error.code || "erro"}). Verifique a internet e as regras do banco.`, false);
      return;
    }
    const removed = (user.privileges || []).length - keep.length;
    say(`${user.name}: perfil mudado de ${before} para ${label}.${removed ? " Os acessos que não valem para o perfil novo foram retirados." : ""}${roleValue === "analista" ? " Agora dá para dar os acessos de analista no mesmo menu ⋮." : ""} Vale no próximo login ou ao atualizar a página. Para desfazer, use "Mudar para ${before}" no mesmo menu.`, true);
    await renderRegisteredUsers();
  });

  // Presentear / tirar foto de perfil premium (menu ⋮ de cada usuário).
  registeredUsersList.addEventListener("click", async (event) => {
    const item = event.target.closest("[data-premium-user]");
    if (!item) return;
    const avatar = window.portalAvatars.find(item.dataset.premiumId);
    const users = await window.portalAuthDemo.getAllUsers();
    const user = users.find((entry) => entry.id === item.dataset.premiumUser);
    if (!avatar || !user) return;
    const grant = item.dataset.premiumGrant === "1";
    const feedback = document.querySelector("#privilege-feedback");
    const say = (text, ok) => {
      feedback.textContent = text;
      feedback.className = `alert py-2 mt-3 mb-0 ${ok ? "alert-success" : "alert-danger"}`;
      feedback.hidden = false;
    };
    try {
      const admin = window.portalAuthDemo.getSession();
      if (grant) await window.portalAuthDemo.giftPremiumAvatar(user.id, avatar.id, admin?.name || "Administrador");
      else await window.portalAuthDemo.revokePremiumAvatar(user.id, avatar.id);
    } catch (error) {
      console.error("Não foi possível salvar a foto premium.", error);
      say(`Não foi possível ${grant ? "presentear" : "tirar"} a foto de ${user.name} (${error.code || "erro"}). Verifique a internet e as regras do banco.`, false);
      return;
    }
    say(grant ? `🎁 Foto "${avatar.label}" presenteada para ${user.name}. Ela aparece desbloqueada no próximo login ou ao atualizar a página.` : `Foto "${avatar.label}" retirada de ${user.name}.`, true);
    await renderRegisteredUsers();
  });

  registeredUsersList.addEventListener("click", async (event) => {
    const item = event.target.closest("[data-privilege-user]");
    if (!item) return;
    const users = await window.portalAuthDemo.getAllUsers();
    const user = users.find((entry) => entry.id === item.dataset.privilegeUser);
    const def = user && (PRIVILEGES[user.roleValue] || []).find((entry) => entry.key === item.dataset.privilegeKey);
    if (!def) return;
    const grant = item.dataset.privilegeGrant === "1";
    const current = Array.isArray(user.privileges) ? user.privileges : [];
    const next = grant ? [...current, def.key] : current.filter((key) => key !== def.key);
    // Sem janela de confirmação (o navegador pode bloqueá-la): salva na hora e avisa na tela. Dá para desfazer pelo mesmo menu.
    const feedback = document.querySelector("#privilege-feedback");
    const say = (text, ok) => {
      feedback.textContent = text;
      feedback.className = `alert py-2 mt-3 mb-0 ${ok ? "alert-success" : "alert-danger"}`;
      feedback.hidden = false;
      clearTimeout(say.timer);
      if (ok) say.timer = setTimeout(() => { feedback.hidden = true; }, 6000);
    };
    try {
      await window.portalAuthDemo.setUserPrivileges(user.id, next);
    } catch (error) {
      console.error("Não foi possível salvar o privilégio.", error);
      say(`Não foi possível salvar o privilégio de ${user.name} (${error.code || "erro"}). Verifique a internet e as regras do banco.`, false);
      return;
    }
    say(grant ? `${user.name} agora tem o privilégio "${def.label}". ${def.note}` : `Privilégio "${def.label}" revogado de ${user.name}.`, true);
    await renderRegisteredUsers();
  });

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
    if (allowSubmit.classList.contains("is-loading")) return;
    const stopLoading = window.portalButtonLoading(allowSubmit, "Salvando…");
    try {
      if (editingAllowedRegistration) {
        await window.portalEmployeeStore.updateAllowedRegistration(editingAllowedRegistration, changes);
        allowResult.textContent = "Matrícula permitida atualizada.";
      } else {
        await window.portalEmployeeStore.addAllowedRegistration(allowInput.value, changes);
        allowResult.textContent = "Matrícula permitida adicionada.";
      }
    } catch (error) {
      console.error("Não foi possível salvar a matrícula permitida.", error);
      allowResult.textContent = "Não foi possível salvar a matrícula. Tente novamente.";
      allowResult.hidden = false;
      return;
    } finally {
      stopLoading();
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
    if (employeeSubmit.classList.contains("is-loading")) return;
    const normalizedMatricula = employeeRegistration.value.replace(/\D/g, "").slice(0, 7);
    const stopLoading = window.portalButtonLoading(employeeSubmit, "Salvando…");
    try {
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
    } catch (error) {
      console.error("Não foi possível salvar o colaborador.", error);
      employeeResult.textContent = "Não foi possível salvar o colaborador. Tente novamente.";
      employeeResult.hidden = false;
      return;
    } finally {
      stopLoading();
    }
    employeeResult.textContent = editingEmployee
      ? "Colaborador atualizado."
      : "Colaborador de linha de frente salvo. Ele não recebeu acesso ao portal.";
    employeeResult.classList.remove("text-danger");
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
      if (!window.confirmDelete(`Matrícula permitida ${item.matricula}`)) return;
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
      if (window.confirmDelete("Cadastro de porteiro")) {
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
  document.querySelector("#employee-search").addEventListener("input", renderEmployees);
  document.querySelector("#employee-filter").addEventListener("change", () => { pagers.colaboradores?.reset(); renderEmployees(); });
  document.querySelector("#employee-list")?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-employee-action]");
    if (!button) return;
    const employees = await window.portalEmployeeStore.getAll();
    const employee = employees.find((item) => item.matricula === button.dataset.employeeId);
    if (!employee) return;
    if (button.dataset.employeeAction === "delete") {
      if (window.confirmDelete(`Colaborador ${employee.nome || employee.matricula}`)) {
        await window.portalEmployeeStore.remove(employee.matricula);
        await renderEmployees();
      }
      return;
    }
    if (button.dataset.employeeAction === "link-foreman") {
      const select = employeeList.querySelector(`[data-foreman-select="${CSS.escape(button.dataset.employeeId)}"]`);
      const foreman = select ? select.value : "";
      if (foreman) {
        const bosses = await getForemen();
        if (bosses.some((boss) => foldText(boss.name) === foldText(employee.nome))) {
          employeeResult.textContent = "Encarregado não entra em equipe (nem na dele, nem na de outro encarregado).";
          employeeResult.classList.add("text-danger");
          employeeResult.hidden = false;
          return;
        }
      }
      await window.portalEmployeeStore.upsert({ ...employee, encarregado: foreman });
      employeeResult.textContent = foreman ? "Encarregado vinculado." : "Nenhum encarregado vinculado.";
      employeeResult.classList.toggle("text-danger", !foreman);
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
    if (!window.confirmDelete("TODOS os colaboradores cadastrados")) return;
    await window.portalEmployeeStore.removeAll();
    clearEmployeesSecurity.hidden = true;
    await renderEmployees();
  });

  porterSearch?.addEventListener("input", renderPorterRequests);
  registeredUsersSearch?.addEventListener("input", renderRegisteredUsers);
  // Vínculos (estagiário/engenheiro/DP → encarregados): o mesmo que eles fazem na tela Equipes. Cada pessoa pode
  // estar em várias equipes: o seletor acrescenta um encarregado e o "×" tira só aquele.
  async function changeUserForemen(userId, added, removed) {
    const users = await window.portalAuthDemo.getAllUsers();
    const person = users.find((user) => user.id === userId);
    const current = window.portalAuthDemo.linkedForemenOf(person);
    const max = window.portalAuthDemo.maxHelpersPerForeman;
    if (added && helpersOf(users, added) >= max) {
      window.alert(`O encarregado ${added} já tem ${max} pessoas vinculadas (o máximo, somando estagiários, engenheiros e DP).`);
      return;
    }
    await window.portalAuthDemo.setUserLinkedForemen(userId, [...current.filter((name) => name !== removed), ...(added ? [added] : [])]);
  }
  registeredUsersList.addEventListener("change", async (event) => {
    const select = event.target.closest("select[data-link-user]");
    if (!select || !select.value) return;
    select.disabled = true;
    try {
      await changeUserForemen(select.dataset.linkUser, select.value, "");
    } catch (error) {
      console.error("Falha ao salvar o vínculo com o encarregado.", error);
      window.alert("Não foi possível salvar o vínculo. Tente de novo.");
    }
    select.disabled = false;
    renderRegisteredUsers();
  });
  registeredUsersList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-unlink-user]");
    if (!button) return;
    button.disabled = true;
    try {
      await changeUserForemen(button.dataset.unlinkUser, "", button.dataset.foreman);
    } catch (error) {
      console.error("Falha ao tirar o vínculo com o encarregado.", error);
      window.alert("Não foi possível tirar o vínculo. Tente de novo.");
    }
    renderRegisteredUsers();
  });
  allowedSearch?.addEventListener("input", renderAllowed);

  renderAllowed();
  renderEmployees();
  renderPorterRequests();
  renderForemanOptions();
  renderRegisteredUsers();

  // Ao vivo: se o DP, um estagiário ou um engenheiro vincular colaboradores pela tela Equipes, esta lista
  // atualiza sozinha. Não redesenha enquanto alguém está mexendo num seletor da lista, para não atrapalhar.
  let liveTimer = null;
  let liveUsersTimer = null;
  window.portalEmployeeStore.subscribeEmployees?.(() => {
    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => {
      if (employeeList.contains(document.activeElement) && document.activeElement.tagName === "SELECT") return;
      renderEmployees();
    }, 250);
  });
  window.portalAuthDemo.subscribeTeamDirectory?.(() => {
    clearTimeout(liveUsersTimer);
    liveUsersTimer = setTimeout(() => { renderRegisteredUsers(); renderForemanOptions(); }, 250);
  });
})();
