(async () => {
  await window.portalAuthDemo?.ready();
  const session = window.portalAuthDemo?.getSession();
  // Administrador e time do DP (DP e analista, com ou sem acesso de DP; mesma regra de js/core/shared-components.js).
  const isAdmin = session?.roleValue === "administrador-analista" || session?.role === "Administrador Analista";
  const isDpTeam = ["dp", "analista"].includes(session?.roleValue) || !!window.portalAuthDemo?.isDpDelegate?.();
  if (!isAdmin && !isDpTeam) {
    window.location.replace("Portal.html");
    return;
  }
  const form = document.querySelector("#employee-form");
  const registration = document.querySelector("#employee-registration");
  const result = document.querySelector("#employee-result");
  const foremanSelect = document.querySelector("#employee-foreman");
  registration.addEventListener("input", () => {
    registration.value = registration.value.replace(/\D/g, "").slice(0, 7);
  });
  // O banco só deixa o administrador listar todos os usuários; o DP usa a lista da equipe (encarregados, estagiários,
  // engenheiros, analistas e DP), que ele pode ler.
  const users = isAdmin
    ? await window.portalAuthDemo.getAllUsers()
    : ((await window.portalAuthDemo.getTeamDirectory().catch(() => null))?.all || []);
  const foremanRoles = ["encarregado", "dp", "engenheiro", "estagiario_engenharia", "analista", "seguranca_trabalho"];
  const foremen = users.filter((user) => foremanRoles.includes(user.roleValue) && user.status === "approved");
  foremanSelect.innerHTML = '<option value="">Sem encarregado</option>' +
    foremen.map((foreman) => `<option value="${escapeHtml(foreman.name)}">${escapeHtml(foreman.name)}</option>`).join("");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const saveButton = form.querySelector('button[type="submit"]');
    if (saveButton?.classList.contains("is-loading")) return;
    const stopLoading = window.portalButtonLoading(saveButton, "Salvando…");
    try {
      const normalizedMatricula = registration.value.replace(/\D/g, "").slice(0, 7);
      const existingEmployees = await window.portalEmployeeStore.getAll();
      if (existingEmployees.some((item) => item.matricula === normalizedMatricula)) {
        result.textContent = "Já existe um colaborador cadastrado com esta matrícula.";
        result.hidden = false;
        return;
      }
      await window.portalEmployeeStore.upsert({
        matricula: registration.value,
        nome: document.querySelector("#employee-name").value.trim(),
        funcao: document.querySelector("#employee-role").value.trim(),
        setor: document.querySelector("#employee-team").value.trim(),
        encarregado: document.querySelector("#employee-foreman").value.trim()
      });
      await window.portalEmployeeStore.addAllowedRegistration(registration.value);
      result.textContent = "Colaborador salvo.";
      result.hidden = false;
      form.reset();
    } catch (error) {
      console.error("Não foi possível salvar o colaborador.", error);
      result.textContent = "Não foi possível salvar o colaborador. Tente novamente.";
      result.hidden = false;
    } finally {
      stopLoading();
    }
  });
})();
