(async () => {
  await window.portalAuthDemo?.ready();
  const list = document.querySelector("#release-list");
  const filter = document.querySelector("#status-filter");
  const counter = document.querySelector("#pending-counter");
  const clearHistory = document.querySelector("#clear-release-history");
  const securityBox = document.querySelector("#clear-history-security");
  const securityCode = document.querySelector("#clear-history-code");
  const confirmClearHistory = document.querySelector("#confirm-clear-history");
  const securityMessage = document.querySelector("#clear-history-message");
  const session = window.portalAuthDemo?.getSession();
  const canClearHistory = session?.roleValue === "dp";
  const physicalSecurityCode = "3029";
  const preview = document.querySelector("#release-preview");
  const closePreview = document.querySelector("#close-release-preview");
  const printPreview = document.querySelector("#print-release-preview");
  const labels = { pending:"Pendente", authorized:"Autorizada", denied:"Negada" };
  const summary = {
    received: document.querySelector("#summary-received"),
    authorized: document.querySelector("#summary-authorized"),
    pending: document.querySelector("#summary-pending"),
    denied: document.querySelector("#summary-denied")
  };
  const formatDate = (value) => {
    if (!value) return "____/____/________";
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR");
  };
  const getDpSigner = (release) => {
    if (release.dpSigner) return release.dpSigner;
    if (release.status === "pending") return "Pendente";
    return session?.name || "Departamento Pessoal";
  };
  function showPreview(release) {
    document.querySelector("#preview-date").textContent = formatDate(release.date || release.createdAt?.slice(0, 10));
    document.querySelector("#preview-name").textContent = release.name || "Não informado";
    document.querySelector("#preview-time").textContent = release.time || "____:____";
    document.querySelector("#preview-reason").textContent = release.reason || "Não informado";
    document.querySelector("#preview-hours").textContent = release.hours || "Não informado";
    document.querySelector("#preview-observation").textContent = release.reason || "Sem observação.";
    const bonusElement = document.querySelector("#preview-bonus");
    const bonusLabel = release.bonusStatus === "approved" ? "ABONADO" : release.bonusStatus === "denied" ? "NÃO ABONADO" : (release.hours || "PENDENTE");
    bonusElement.textContent = bonusLabel;
    bonusElement.className = release.bonusStatus === "approved" ? "bonus-approved" : release.bonusStatus === "denied" ? "bonus-denied" : "bonus-pending";
    document.querySelector("#preview-requester").textContent = release.requester || "Não informado";
    document.querySelector("#preview-engineer").textContent = release.engineer || "Pendente";
    document.querySelector("#preview-dp").textContent = getDpSigner(release);
    preview.hidden = false;
  }
  async function render() {
    const releases = await window.portalDemoStore.getReleases();
    const selected = filter.value;
    const visible = releases.filter((release) => selected === "all" || release.status === selected);
    list.innerHTML = visible.length ? visible.map((release) => `
      <article class="release-item">
        <div class="release-item-header"><div><strong>${escapeHtml(release.name)}</strong><small>Registro local · Solicitante: ${escapeHtml(release.requester)}</small></div><span class="release-status ${release.status}">${labels[release.status]}</span></div>
        <div class="release-details"><span><strong>Frente:</strong> ${escapeHtml(release.team)}</span><span><strong>Horário:</strong> ${escapeHtml(release.time)}</span><span><strong>Motivo:</strong> ${escapeHtml(release.reason)}</span><span><strong>Horas:</strong> ${escapeHtml(release.hours)}</span></div>
        <div class="release-actions"><button class="release-view" type="button" data-action="view" data-id="${release.id}">Visualizar liberação</button><button class="release-authorize" type="button" data-action="authorize" data-id="${release.id}" ${release.status !== "pending" ? "disabled" : ""}>Autorizar saída</button><button class="release-deny" type="button" data-action="deny" data-id="${release.id}" ${release.status !== "pending" ? "disabled" : ""}>Negar</button><a class="release-edit" href="Liberacao.html?edit=${encodeURIComponent(release.id)}">Editar</a><button class="release-delete" type="button" data-action="delete" data-id="${release.id}">Apagar</button></div>
      </article>
    `).join("") : '<p class="dp-empty">Nenhuma solicitação neste filtro.</p>';
    counter.textContent = `${releases.filter((release) => release.status === "pending").length} pendentes`;
    summary.received.textContent = releases.length;
    summary.authorized.textContent = releases.filter((release) => release.status === "authorized").length;
    summary.pending.textContent = releases.filter((release) => release.status === "pending").length;
    summary.denied.textContent = releases.filter((release) => release.status === "denied").length;
  }
  list.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const releases = await window.portalDemoStore.getReleases();
    const release = releases.find((item) => item.id === button.dataset.id);
    if (!release) return;
    if (button.dataset.action === "view") {
      showPreview(release);
      return;
    }
    if (button.dataset.action === "delete") {
      if (!window.confirm("Apagar esta liberação?")) return;
      await window.portalDemoStore.removeRelease(release.id);
      render();
      return;
    }
    release.status = button.dataset.action === "authorize" ? "authorized" : "denied";
    await window.portalDemoStore.updateRelease(release.id, {
      status: release.status,
      dpSigner: session?.name || "Departamento Pessoal",
      dpDecisionAt: new Date().toISOString()
    });
    render();
  });
  filter.addEventListener("change", render);
  closePreview.addEventListener("click", () => { preview.hidden = true; });
  printPreview.addEventListener("click", () => window.print());
  clearHistory.hidden = !canClearHistory;
  securityBox.hidden = true;
  clearHistory.addEventListener("click", () => {
    if (!canClearHistory) return;
    securityBox.hidden = false;
    securityMessage.textContent = "Digite o código físico para confirmar a limpeza.";
    securityMessage.className = "";
    securityCode.value = "";
    securityCode.focus();
  });
  confirmClearHistory.addEventListener("click", async () => {
    if (!canClearHistory) return;
    if (securityCode.value.trim() !== physicalSecurityCode) {
      securityMessage.textContent = "Código incorreto. O histórico não foi apagado.";
      securityMessage.className = "text-danger";
      securityCode.focus();
      return;
    }
    await window.portalDemoStore.clearHistory();
    securityBox.hidden = true;
    render();
  });
  render();
})();
