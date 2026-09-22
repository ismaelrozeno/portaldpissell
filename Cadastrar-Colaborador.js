(async () => {
  await window.portalAuthDemo?.ready();
  const session = window.portalAuthDemo?.getSession();
  if (session?.roleValue !== "administrador-analista" && session?.role !== "Administrador Analista") {
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
  const users = await window.portalAuthDemo.getAllUsers();
  const foremen = users.filter((user) => user.roleValue === "encarregado" && user.status === "approved");
  foremanSelect.innerHTML = '<option value="">Selecione o encarregado</option>' +
    foremen.map((foreman) => `<option value="${escapeHtml(foreman.name)}">${escapeHtml(foreman.name)}</option>`).join("");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
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
  });
})();
