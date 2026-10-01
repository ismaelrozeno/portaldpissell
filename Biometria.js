(async () => {
  await window.portalAuthDemo?.ready();
  const session = window.portalAuthDemo?.getSession();
  if (!["administrador-analista", "dp"].includes(session?.roleValue)) {
    window.location.replace("Portal.html");
    return;
  }
  const reader = window.portalBiometricReader;
  const search = document.querySelector("#bio-search");
  const results = document.querySelector("#bio-results");
  const count = document.querySelector("#bio-count");
  const selectedText = document.querySelector("#bio-selected");
  const panel = document.querySelector("#bio-panel");
  const consent = document.querySelector("#bio-consent");
  const enrollButton = document.querySelector("#bio-enroll");
  const testButton = document.querySelector("#bio-test");
  const removeButton = document.querySelector("#bio-remove");
  const result = document.querySelector("#bio-result");
  const readerStatus = document.querySelector("#reader-status");
  const readerNotice = document.querySelector("#reader-notice");

  let employees = [];
  let enrolled = new Set();
  let selected = null;
  let readerReady = false;

  function showResult(message, isError = false) {
    result.textContent = message;
    result.classList.toggle("import-warning", isError);
    result.hidden = !message;
  }

  async function checkReader() {
    readerReady = await reader.isAvailable();
    readerStatus.textContent = readerReady ? "Hamster DX conectado" : "Leitor não encontrado";
    readerStatus.style.cssText = readerReady ? "" : "color:#8b5515;background:#fff2d9";
    readerNotice.hidden = readerReady;
    updatePanel();
  }

  function updatePanel() {
    panel.hidden = !selected;
    if (!selected) {
      selectedText.textContent = "Nenhum colaborador selecionado.";
      return;
    }
    const has = enrolled.has(selected.matricula);
    selectedText.textContent = `${selected.nome} · Matrícula ${selected.matricula} — ${has ? "digital cadastrada" : "sem digital"}`;
    enrollButton.textContent = has ? "Cadastrar de novo" : "Cadastrar digital";
    enrollButton.disabled = !readerReady || !consent.checked;
    testButton.hidden = !has;
    testButton.disabled = !readerReady;
    removeButton.hidden = !has;
  }

  function renderList() {
    const term = window.normalizeSearchText(search.value.trim());
    const matches = term
      ? employees.filter((item) => window.normalizeSearchText(item.nome).includes(term) || item.matricula.includes(term))
      : employees;
    results.innerHTML = "";
    matches.slice(0, 200).forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("role", "option");
      button.className = `list-group-item list-group-item-action d-flex justify-content-between gap-2${item.matricula === selected?.matricula ? " active" : ""}`;
      const label = document.createElement("span");
      label.textContent = `${item.nome} · ${item.matricula}`;
      const badge = document.createElement("span");
      badge.className = `badge ${enrolled.has(item.matricula) ? "text-bg-success" : "text-bg-light"}`;
      badge.textContent = enrolled.has(item.matricula) ? "Digital ✓" : "Sem digital";
      button.append(label, badge);
      button.addEventListener("click", () => {
        selected = item;
        consent.checked = false;
        showResult("");
        renderList();
        updatePanel();
      });
      results.append(button);
    });
    count.textContent = `${enrolled.size} de ${employees.length} colaboradores com digital cadastrada.`;
  }

  async function run(button, loadingText, action) {
    const stopLoading = window.portalButtonLoading(button, loadingText);
    showResult("");
    try {
      await action();
    } catch (error) {
      console.error(error);
      showResult(error instanceof reader.BiometricError ? error.message : "Não foi possível concluir. Tente novamente.", true);
    } finally {
      stopLoading();
      updatePanel();
    }
  }

  enrollButton.addEventListener("click", () => run(enrollButton, "Coloque o dedo no leitor…", async () => {
    if (!consent.checked) return;
    await reader.enroll(selected, session.name);
    enrolled.add(selected.matricula);
    consent.checked = false;
    renderList();
    showResult(`Digital de ${selected.nome} cadastrada.`);
  }));

  testButton.addEventListener("click", () => run(testButton, "Coloque o dedo no leitor…", async () => {
    await reader.signAs(selected.matricula);
    showResult(`A digital confere com ${selected.nome}.`);
  }));

  removeButton.addEventListener("click", () => run(removeButton, "Apagando…", async () => {
    if (!window.confirmDelete(`Digital de ${selected.nome}`)) return;
    await reader.removeEnrollment(selected.matricula);
    enrolled.delete(selected.matricula);
    renderList();
    showResult("Digital apagada.");
  }));

  consent.addEventListener("change", updatePanel);
  search.addEventListener("input", renderList);

  const [allEmployees, enrolledSet] = await Promise.all([
    window.portalEmployeeStore.getAll(),
    reader.listEnrolledRegistrations()
  ]);
  employees = allEmployees
    .filter((item) => item.status !== "inativo")
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
  enrolled = enrolledSet;
  renderList();
  await checkReader();
})();
