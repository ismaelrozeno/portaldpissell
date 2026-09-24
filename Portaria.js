(async () => {
  await window.portalAuthDemo?.ready();
  const flow = window.portalReleaseFlow;
  const session = window.portalAuthDemo?.getSession();
  const canConfirmExit = ["porteiro", "administrador-analista"].includes(session?.roleValue);
  const formatDateTime = (value) => value ? new Date(value).toLocaleString("pt-BR") : "";
  const search = document.querySelector("#gate-search");
  const results = document.querySelector("#gate-results");
  const statusText = { ready:"Autorizado para saída", exited:"Saída confirmada", blocked:"Procurar o DP" };
  const dpText = {
    engineer: "Aguardando engenheiro",
    foreman: "Recusada pelo engenheiro",
    dp: "Aguardando DP",
    gate: "Autorizada pelo DP",
    exited: "Autorizada pelo DP",
    closed: "Negada pelo DP"
  };
  async function render() {
    const releases = await window.portalDemoStore.getReleases();
    const authorizations = releases.map((release) => ({
      id: release.id,
      stage: flow.stageOf(release),
      exitConfirmedBy: release.exitConfirmedBy,
      exitConfirmedAt: release.exitConfirmedAt,
      name: release.name,
      registration: release.registration || "Matrícula não informada",
      team: release.team,
      time: release.time,
      movement: flow.movementLabel(release),
      status: flow.stageOf(release) === "gate" ? "ready" : flow.stageOf(release) === "exited" ? "exited" : "blocked",
      foreman: release.requester,
      dp: dpText[flow.stageOf(release)]
    }));
    const query = search.value.trim().toLowerCase();
    const visible = authorizations.filter((item) => `${item.name} ${item.registration}`.toLowerCase().includes(query));
    results.innerHTML = visible.length ? visible.map((item) => `
      <article class="gate-result ${item.status === "blocked" ? "is-blocked" : "is-ready"}">
        <div class="gate-result-head"><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.registration)}</small></div><span class="gate-status ${item.status}">${statusText[item.status]}</span></div>
        <div class="gate-details"><span><strong>Frente:</strong> ${escapeHtml(item.team)}</span><span><strong>Horário:</strong> ${escapeHtml(item.time)}</span><span><strong>Movimentação:</strong> ${escapeHtml(item.movement)}</span></div>
        <div class="gate-authorizers"><strong>Encarregado:</strong> ${escapeHtml(item.foreman)} · <strong>DP:</strong> ${item.dp}</div>
        ${item.status === "exited" ? `<div class="gate-authorizers"><strong>Saída confirmada por</strong> ${escapeHtml(item.exitConfirmedBy)} em ${formatDateTime(item.exitConfirmedAt)}</div>` : ""}
        <div class="gate-actions"><button class="release-view-btn" type="button" data-view-id="${escapeHtml(item.id)}">Visualizar liberação</button>${item.status === "ready" && canConfirmExit ? `<button class="gate-confirm" type="button" data-exit-id="${escapeHtml(item.id)}">Confirmar saída do colaborador</button>` : ""}</div>
      </article>
    `).join("") : '<p class="gate-empty">Nenhuma autorização encontrada.</p>';
  }
  results.addEventListener("click", async (event) => {
    const viewButton = event.target.closest("button[data-view-id]");
    if (viewButton) {
      const all = await window.portalDemoStore.getReleases();
      const found = all.find((item) => item.id === viewButton.dataset.viewId);
      if (found) window.portalReleasePreview.show(found);
      return;
    }
    const button = event.target.closest("button[data-exit-id]");
    if (!button || !canConfirmExit) return;
    const releases = await window.portalDemoStore.getReleases();
    const release = releases.find((item) => item.id === button.dataset.exitId);
    if (!release || flow.stageOf(release) !== "gate") return render();
    if (!window.confirm(`Confirmar a saída de ${release.name}?`)) return;
    await window.portalDemoStore.updateRelease(release.id, {
      stage: "exited",
      exitConfirmedBy: session?.name || "Portaria",
      exitConfirmedRole: session?.role || "Porteiro",
      exitConfirmedAt: new Date().toISOString()
    });
    render();
  });
  search.addEventListener("input", render);
  render();
})();
