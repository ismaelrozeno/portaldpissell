(async () => {
  await window.portalAuthDemo?.ready();
  const form = document.querySelector("#release-form");
  const reasonInputs = document.querySelectorAll('input[name="reason"]');
  const particularField = document.querySelector("#particular-reason-field");
  const particularReason = document.querySelector("#particular-reason");
  const errorMessage = document.querySelector("#release-error");
  const successMessage = document.querySelector("#release-success");
  const employee = document.querySelector("#employee");

  function updateParticularField() {
    const selected = document.querySelector('input[name="reason"]:checked');
    const isParticular = selected?.value === "particular";
    particularField.hidden = !isParticular;
    particularReason.required = isParticular;
    if (!isParticular) particularReason.value = "";
  }

  async function renderEmployees() {
    const allEmployees = await window.portalEmployeeStore?.getAll() || [];
    const employees = allEmployees.filter((item) => item.status === "ativo");
    employees.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.matricula;
      option.textContent = `${item.nome} · Matrícula ${item.matricula}`;
      employee.append(option);
    });
    const editId = new URLSearchParams(window.location.search).get("edit");
    if (!editId) return;
    const releases = await window.portalDemoStore?.getReleases() || [];
    const release = releases.find((item) => item.id === editId);
    if (!release) return;
    const matchingEmployee = employees.find((item) => item.nome === release.name);
    if (matchingEmployee) employee.value = matchingEmployee.matricula;
    document.querySelector("#release-date").value = release.date || release.createdAt?.slice(0, 10) || "";
    document.querySelector("#release-time").value = release.time || "";
    const savedReason = release.reasonType || (release.reason === "Tarefa" ? "tarefa" : release.reason === "Particular" ? "particular" : "");
    const reason = [...reasonInputs].find((input) => input.value === savedReason);
    if (reason) reason.checked = true;
    const savedHours = release.hoursType || (release.hours === "Abonado" ? "abonado" : release.hours === "Não abonado" ? "nao-abonado" : "");
    const hours = [...document.querySelectorAll('input[name="hours"]')].find((input) => input.value === savedHours);
    if (hours) hours.checked = true;
    if (savedReason === "particular" && release.reason !== "Particular") particularReason.value = release.reason || "";
    updateParticularField();
  }

  await renderEmployees();

  reasonInputs.forEach((input) => input.addEventListener("change", updateParticularField));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorMessage.hidden = true;
    successMessage.hidden = true;
    updateParticularField();

    if (!form.checkValidity()) {
      form.reportValidity();
      errorMessage.textContent = "Confira os campos obrigatórios antes de enviar a liberação.";
      errorMessage.hidden = false;
      return;
    }

    const selectedEmployee = employee.options[employee.selectedIndex].textContent.split(" · ")[0];
    const reason = document.querySelector('input[name="reason"]:checked').value;
    const hours = document.querySelector('input[name="hours"]:checked').value;
    const pendingEngineer = hours === "abonado";
    const releaseData = {
      name: selectedEmployee,
      registration: employee.value,
      date: document.querySelector("#release-date").value,
      team: "Equipe local",
      time: document.querySelector("#release-time").value,
      reasonType: reason,
      reason: reason === "particular" ? particularReason.value : document.querySelector('input[name="reason"]:checked').parentElement.textContent.trim(),
      hoursType: hours,
      hours: document.querySelector('input[name="hours"]:checked').parentElement.textContent.trim(),
      requester: window.portalAuthDemo?.getSession()?.name || "Encarregado",
      status: "pending"
    };
    const editId = new URLSearchParams(window.location.search).get("edit");
    if (editId) {
      await window.portalDemoStore.updateRelease(editId, releaseData);
    } else {
      await window.portalDemoStore.saveRelease(releaseData);
    }
    successMessage.textContent = pendingEngineer
      ? "Solicitação registrada. O abono ficará pendente da assinatura individual do engenheiro."
      : "Solicitação registrada e enviada ao Departamento Pessoal.";
    successMessage.hidden = false;
    form.querySelector(".release-submit").disabled = true;
  });
})();
