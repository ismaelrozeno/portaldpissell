(() => {
  const search = document.querySelector("#gate-search");
  const results = document.querySelector("#gate-results");
  const statusText = { ready:"Autorizado para saída", blocked:"Procurar o DP" };
  function render() {
    const authorizations = window.portalDemoStore.getReleases().map((release) => ({
      name: release.name,
      registration: release.registration || "Matrícula não informada",
      team: release.team,
      time: release.time,
      status: release.status === "authorized" ? "ready" : "blocked",
      foreman: release.requester,
      dp: release.status === "authorized" ? "Autorizada pelo DP" : release.status === "denied" ? "Negada pelo DP" : "Aguardando DP"
    }));
    const query = search.value.trim().toLowerCase();
    const visible = authorizations.filter((item) => `${item.name} ${item.registration}`.toLowerCase().includes(query));
    results.innerHTML = visible.length ? visible.map((item) => `
      <article class="gate-result ${item.status === "ready" ? "is-ready" : "is-blocked"}">
        <div class="gate-result-head"><div><strong>${item.name}</strong><small>${item.registration}</small></div><span class="gate-status ${item.status}">${statusText[item.status]}</span></div>
        <div class="gate-details"><span><strong>Frente:</strong> ${item.team}</span><span><strong>Horário:</strong> ${item.time}</span></div>
        <div class="gate-authorizers"><strong>Encarregado:</strong> ${item.foreman} · <strong>DP:</strong> ${item.dp}</div>
      </article>
    `).join("") : '<p class="gate-empty">Nenhuma autorização encontrada.</p>';
  }
  search.addEventListener("input", render);
  render();
})();
