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
  const flow = window.portalReleaseFlow;
  const stageClass = { engineer:"pending", dp:"pending", gate:"authorized", exited:"authorized", foreman:"denied", closed:"denied" };
  const filterMatches = {
    all: () => true,
    dp: (stage) => stage === "dp",
    upstream: (stage) => stage === "engineer" || stage === "foreman",
    authorized: (stage) => stage === "gate" || stage === "exited",
    denied: (stage) => stage === "closed"
  };
  // Abono do engenheiro que o DP ainda precisa lançar no RM.
  const needsLaunch = (release) => release.bonusStatus === "approved" && !release.abonoLaunchedAt && ["dp", "gate", "exited"].includes(flow.stageOf(release));
  const launchLabel = (release) => release.abonoLaunchedAt
    ? `<span class="release-launch-tag is-launched">Abono lançado no RM</span>`
    : needsLaunch(release) ? `<span class="release-launch-tag">Abono a lançar no RM</span>` : "";
  const search = document.querySelector("#release-search");
  const dateFrom = document.querySelector("#date-from");
  const dateTo = document.querySelector("#date-to");
  const filterCount = document.querySelector("#filter-count");
  const fold = (value) => String(value || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  // Data da liberação (AAAA-MM-DD); as antigas sem "date" usam o dia em que foram criadas.
  const dateOf = (release) => release.date || release.createdAt?.slice(0, 10) || "";
  const matchesSearchAndDate = (release, term) => {
    const day = dateOf(release);
    if (dateFrom.value && (!day || day < dateFrom.value)) return false;
    if (dateTo.value && (!day || day > dateTo.value)) return false;
    return !term || fold([release.name, release.registration, release.requester, release.reason, release.engineer].join(" ")).includes(term);
  };
  const summary = {
    received: document.querySelector("#summary-received"),
    authorized: document.querySelector("#summary-authorized"),
    pending: document.querySelector("#summary-pending"),
    denied: document.querySelector("#summary-denied")
  };
  async function render() {
    const releases = await window.portalDemoStore.getReleases();
    const selected = filter.value;
    const term = fold(search.value.trim());
    const visible = releases.filter((release) => (selected === "launch" ? needsLaunch(release) : (filterMatches[selected] || filterMatches.all)(flow.stageOf(release))) && matchesSearchAndDate(release, term));
    filterCount.textContent = `${visible.length} de ${releases.length} liberações`;
    list.innerHTML = visible.length ? visible.map((release) => {
      const stage = flow.stageOf(release);
      const canDecide = stage === "dp";
      const signatures = [
        release.engineer ? `Engenheiro: ${escapeHtml(release.engineer)}` : "",
        release.dpSigner ? `DP: ${escapeHtml(release.dpSigner)}` : "",
        release.exitConfirmedBy ? `Portaria: ${escapeHtml(release.exitConfirmedBy)}` : "",
        stage === "foreman" ? `Recusada: ${escapeHtml(release.refusalReason)}` : ""
      ].filter(Boolean).join(" · ");
      return `
      <article class="release-item">
        <div class="release-item-header"><div><strong>${escapeHtml(release.name)}</strong><small>Solicitante: ${escapeHtml(release.requester)}${signatures ? ` · ${signatures}` : ""}</small></div><span class="release-status ${stageClass[stage]}">${escapeHtml(flow.stages[stage].label)}</span></div>
        ${launchLabel(release) ? `<div class="release-launch-row">${launchLabel(release)}</div>` : ""}
        <div class="release-details"><span><strong>Frente:</strong> ${escapeHtml(release.team)}</span><span><strong>Horário:</strong> ${escapeHtml(release.time)}</span><span><strong>Movimentação:</strong> ${escapeHtml(flow.movementLabel(release))}</span><span><strong>Motivo:</strong> ${escapeHtml(release.reason)}</span><span><strong>Horas:</strong> ${escapeHtml(release.hours)}</span></div>
        <div class="release-actions"><button class="release-view" type="button" data-action="view" data-id="${release.id}">Visualizar liberação</button><button class="release-authorize" type="button" data-action="authorize" data-id="${release.id}" ${canDecide ? "" : "disabled"}>Autorizar saída</button><button class="release-deny" type="button" data-action="deny" data-id="${release.id}" ${canDecide ? "" : "disabled"}>Negar</button><a class="release-edit" href="Liberacao.html?edit=${encodeURIComponent(release.id)}">Editar</a><button class="release-delete" type="button" data-action="delete" data-id="${release.id}">Apagar</button></div>
      </article>`;
    }).join("") : '<p class="dp-empty">Nenhuma solicitação neste filtro.</p>';
    const count = (name) => releases.filter((release) => filterMatches[name](flow.stageOf(release))).length;
    counter.textContent = `${count("dp")} pendentes`;
    summary.received.textContent = releases.length;
    summary.authorized.textContent = count("authorized");
    summary.pending.textContent = count("dp");
    summary.denied.textContent = count("denied");
  }
  list.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const releases = await window.portalDemoStore.getReleases();
    const release = releases.find((item) => item.id === button.dataset.id);
    if (!release) return;
    if (button.dataset.action === "view") {
      window.portalReleasePreview.show(release, { dpContext: true });
      return;
    }
    if (button.dataset.action === "delete") {
      if (!window.confirm("Apagar esta liberação?")) return;
      await window.portalDemoStore.removeRelease(release.id);
      render();
      return;
    }
    if (flow.stageOf(release) !== "dp") {
      window.alert("Esta liberação ainda não chegou ao DP: ela precisa da decisão do engenheiro primeiro.");
      render();
      return;
    }
    const authorized = button.dataset.action === "authorize";
    await window.portalDemoStore.updateRelease(release.id, {
      status: authorized ? "authorized" : "denied",
      stage: authorized ? "gate" : "closed",
      dpRole: session?.role || "Departamento Pessoal",
      dpSigner: session?.name || "Departamento Pessoal",
      dpDecisionAt: new Date().toISOString()
    });
    render();
  });
  filter.addEventListener("change", render);
  search.addEventListener("input", render);
  dateFrom.addEventListener("change", render);
  dateTo.addEventListener("change", render);
  document.querySelector("#clear-filters").addEventListener("click", () => {
    search.value = "";
    dateFrom.value = "";
    dateTo.value = "";
    filter.value = "all";
    render();
  });
  document.addEventListener("portal:release-changed", render);
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
