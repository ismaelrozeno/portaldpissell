(async () => {
  await window.portalAuthDemo?.ready();
  const session = window.portalAuthDemo?.getSession();
  if (!["administrador-analista", "dp"].includes(session?.roleValue) && !window.portalAuthDemo?.isDpDelegate?.()) {
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
  const filter = {
    status: document.querySelector("#bio-filter-status"),
    period: document.querySelector("#bio-filter-period"),
    range: document.querySelector("#bio-filter-range"),
    from: document.querySelector("#bio-filter-from"),
    to: document.querySelector("#bio-filter-to"),
    role: document.querySelector("#bio-filter-role"),
    foreman: document.querySelector("#bio-filter-foreman"),
    sort: document.querySelector("#bio-filter-sort"),
    clear: document.querySelector("#bio-filter-clear"),
    exportButton: document.querySelector("#bio-export")
  };

  let employees = [];
  // Matrícula -> { enrolledAt, enrolledBy } de quem tem digital cadastrada.
  let enrolled = new Map();
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
    selectedText.textContent = `${selected.nome} · Matrícula ${selected.matricula} · ${has ? "digital cadastrada" : "sem digital"}`;
    enrollButton.textContent = has ? "Cadastrar de novo" : "Cadastrar digital";
    enrollButton.disabled = !readerReady || !consent.checked;
    testButton.hidden = !has;
    testButton.disabled = !readerReady;
    removeButton.hidden = !has;
  }

  // ---------- Filtros: Situação · Cadastro (data da digital) · Função · Encarregado · Ordenar ----------
  const pad = (n) => String(n).padStart(2, "0");
  const isoDay = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const dayOf = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : isoDay(date);
  };
  const daysAgo = (days) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return isoDay(date);
  };
  const brDate = (day) => day.split("-").reverse().join("/");
  // Intervalo [de, até] (dias ISO, "" = aberto) do período escolhido; null = qualquer data.
  function periodRange() {
    const today = isoDay(new Date());
    switch (filter.period.value) {
      case "today": return [today, today];
      case "yesterday": return [daysAgo(1), daysAgo(1)];
      case "7": return [daysAgo(6), today];
      case "30": return [daysAgo(29), today];
      case "month": return [`${today.slice(0, 8)}01`, today];
      case "custom": return filter.from.value || filter.to.value ? [filter.from.value, filter.to.value] : null;
      default: return null;
    }
  }
  const DEFAULTS = { status: "all", period: "all", role: "", foreman: "", sort: "name" };
  const filtering = () => Object.entries(DEFAULTS).some(([key, value]) => filter[key].value !== value);

  // Opções de Função e Encarregado a partir dos colaboradores (mantém a escolhida, se ainda existir).
  function fillOptions(select, values, allLabel) {
    const current = select.value;
    const unique = [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
    select.innerHTML = `<option value="">${allLabel}</option><option value="-">Sem informação</option>`;
    unique.forEach((value) => select.add(new Option(value, value)));
    select.value = unique.includes(current) || current === "-" ? current : "";
  }

  function filtered() {
    const term = window.normalizeSearchText(search.value.trim());
    const range = periodRange();
    const byField = (value, wanted) => !wanted || (wanted === "-" ? !String(value || "").trim() : String(value || "").trim() === wanted);
    const list = employees.filter((item) => {
      if (term && !window.normalizeSearchText(item.nome).includes(term) && !item.matricula.includes(term)) return false;
      const enrollment = enrolled.get(item.matricula);
      if (filter.status.value === "enrolled" && !enrollment) return false;
      if (filter.status.value === "missing" && enrollment) return false;
      // Período do cadastro: só quem tem digital cadastrada nesses dias.
      if (range) {
        const day = enrollment ? dayOf(enrollment.enrolledAt) : "";
        if (!day || (range[0] && day < range[0]) || (range[1] && day > range[1])) return false;
      }
      return byField(item.funcao, filter.role.value) && byField(item.encarregado, filter.foreman.value);
    });
    // Por data do cadastro: quem não tem digital vai para o fim, em ordem de nome (a lista já vem por nome).
    if (filter.sort.value !== "name") {
      const at = (item) => enrolled.get(item.matricula)?.enrolledAt || "";
      const direction = filter.sort.value === "recent" ? -1 : 1;
      list.sort((a, b) => (!at(a) - !at(b)) || direction * at(a).localeCompare(at(b)));
    }
    return list;
  }

  function renderList() {
    filter.range.hidden = filter.period.value !== "custom";
    filter.clear.hidden = !filtering();
    const matches = filtered();
    filter.exportButton.disabled = !matches.length;
    results.innerHTML = "";
    if (!matches.length) {
      const empty = document.createElement("p");
      empty.className = "import-help m-3";
      empty.textContent = employees.length ? "Nenhum colaborador encontrado para a busca e os filtros." : "Carregando colaboradores…";
      results.append(empty);
    }
    matches.slice(0, 200).forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("role", "option");
      button.className = `list-group-item list-group-item-action d-flex justify-content-between gap-2${item.matricula === selected?.matricula ? " active" : ""}`;
      const label = document.createElement("span");
      label.textContent = `${item.nome} · ${item.matricula}`;
      const badge = document.createElement("span");
      badge.className = `badge ${enrolled.has(item.matricula) ? "text-bg-success" : "text-bg-light"}`;
      const enrollment = enrolled.get(item.matricula);
      badge.textContent = enrollment ? "Digital ✓" : "Sem digital";
      // Data do cadastro ao lado do selo; quem cadastrou, ao passar o mouse.
      const day = enrollment ? dayOf(enrollment.enrolledAt) : "";
      if (day) {
        const when = document.createElement("span");
        when.className = "bio-enrolled-at";
        when.textContent = brDate(day);
        badge.append(when);
        badge.title = `Cadastrada em ${new Date(enrollment.enrolledAt).toLocaleString("pt-BR")}${enrollment.enrolledBy ? ` por ${enrollment.enrolledBy}` : ""}`;
      }
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
    const summary = `${enrolled.size} de ${employees.length} colaboradores com digital cadastrada.`;
    const shown = matches.length > 200 ? ` Mostrando os 200 primeiros de ${matches.length}; use a busca ou os filtros para achar os outros.` : "";
    count.textContent = filtering() || search.value.trim()
      ? `${matches.length} ${matches.length === 1 ? "colaborador encontrado" : "colaboradores encontrados"}. ${summary}${shown}`
      : `${summary}${shown}`;
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
    enrolled.set(selected.matricula, { enrolledAt: new Date().toISOString(), enrolledBy: session.name || "" });
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
  [filter.from, filter.to, filter.role, filter.foreman, filter.sort].forEach((field) => field.addEventListener("change", renderList));
  // Escolher uma data de cadastro só faz sentido para quem tem digital (e "ainda não cadastrados" não tem data).
  filter.period.addEventListener("change", () => {
    if (filter.period.value !== "all" && filter.status.value === "missing") filter.status.value = "enrolled";
    renderList();
    if (filter.period.value === "custom") filter.from.focus();
  });
  filter.status.addEventListener("change", () => {
    if (filter.status.value === "missing") filter.period.value = "all";
    renderList();
  });
  // Exportar .txt: todos os colaboradores da busca e dos filtros (não só os 200 da tela), na ordem da lista.
  // UTF-8 com BOM e quebra de linha do Windows, para os acentos saírem certos no Bloco de Notas.
  filter.exportButton.addEventListener("click", () => {
    const list = filtered();
    if (!list.length) return;
    const chosen = (select) => select.options[select.selectedIndex]?.text || "";
    const range = periodRange();
    const filters = [
      search.value.trim() && `Busca: "${search.value.trim()}"`,
      filter.status.value !== "all" && `Situação: ${chosen(filter.status)}`,
      range && `Cadastro: ${filter.period.value === "custom" ? `${range[0] ? brDate(range[0]) : "início"} até ${range[1] ? brDate(range[1]) : "hoje"}` : chosen(filter.period)}`,
      filter.role.value && `Função: ${chosen(filter.role)}`,
      filter.foreman.value && `Encarregado: ${chosen(filter.foreman)}`,
      `Ordem: ${chosen(filter.sort)}`
    ].filter(Boolean);
    const now = new Date();
    const lines = list.map((item) => {
      const enrollment = enrolled.get(item.matricula);
      const digital = enrollment
        ? `Digital cadastrada${dayOf(enrollment.enrolledAt) ? ` em ${brDate(dayOf(enrollment.enrolledAt))}` : ""}${enrollment.enrolledBy ? ` por ${enrollment.enrolledBy}` : ""}`
        : "Sem digital";
      return [item.matricula, item.nome, item.funcao || "Função não informada", item.encarregado ? `Encarregado: ${item.encarregado}` : "Sem encarregado", digital].join(" | ");
    });
    const text = [
      "Biometria · Colaboradores · Obra 369",
      `Gerado em ${now.toLocaleString("pt-BR")}${session?.name ? ` por ${session.name}` : ""}`,
      `Filtros: ${filters.join(" · ")}`,
      `${list.length} ${list.length === 1 ? "colaborador" : "colaboradores"}`,
      "",
      "MATRÍCULA | NOME | FUNÇÃO | ENCARREGADO | DIGITAL",
      ...lines
    ].join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["\ufeff", text, "\r\n"], { type: "text/plain;charset=utf-8" }));
    link.download = `biometria-colaboradores_${isoDay(now)}.txt`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 60000);
  });
  filter.clear.addEventListener("click", () => {
    Object.entries(DEFAULTS).forEach(([key, value]) => { filter[key].value = value; });
    filter.from.value = "";
    filter.to.value = "";
    renderList();
  });

  const [allEmployees, enrollments] = await Promise.all([
    window.portalEmployeeStore.getAll(),
    reader.listEnrollments()
  ]);
  employees = allEmployees
    .filter((item) => item.status !== "inativo")
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
  enrolled = enrollments;
  fillOptions(filter.role, employees.map((item) => item.funcao), "Todas");
  fillOptions(filter.foreman, employees.map((item) => item.encarregado), "Todos");
  renderList();
  await checkReader();
})();
