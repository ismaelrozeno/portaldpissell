(async () => {
  const exportButton = document.querySelector("#export-button");
  const confirmButton = document.querySelector("#confirm-closing");
  const result = document.querySelector("#closing-result");
  const releases = await window.portalDemoStore.getReleases();
  const total = document.querySelector("#closing-total");
  const approved = document.querySelector("#closing-approved");
  const denied = document.querySelector("#closing-denied");
  const pending = document.querySelector("#closing-pending");
  const checklistPending = document.querySelector("#checklist-pending");
  const pendingCount = releases.filter((release) => release.status === "pending").length;
  total.textContent = releases.length;
  approved.textContent = releases.filter((release) => release.bonusStatus === "approved").length;
  denied.textContent = releases.filter((release) => release.hours === "Não abonado" || release.bonusStatus === "denied").length;
  pending.textContent = pendingCount;
  checklistPending.textContent = pendingCount;
  exportButton.addEventListener("click", () => {
    const now = new Date();
    const periodLabel = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    const periodSlug = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/\s+/g, "-")
      .toLowerCase();
    const content = `Obra 369;Fechamento local\r\nPeríodo;${periodLabel}\r\nAutorizações;${total.textContent}\r\nAbonos assinados;${approved.textContent}\r\nNão abonados;${denied.textContent}\r\nPendências;${pending.textContent}\r\n`;
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `fechamento-obra-369-${periodSlug}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    result.textContent = "Arquivo mensal local gerado para download.";
    result.hidden = false;
  });
  confirmButton.addEventListener("click", () => {
    result.textContent = "Fechamento local registrado.";
    result.hidden = false;
    confirmButton.disabled = true;
  });
})();
