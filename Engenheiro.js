(async () => {
  await window.portalAuthDemo?.ready();
  const session = window.portalAuthDemo?.getSession();
  const isAdministrator = session?.roleValue === "administrador-analista";
  const isEngineer = session?.roleValue === "engenheiro";
  let adminBonusUnlocked = false;
  const canSignBonus = () => isEngineer || (isAdministrator && adminBonusUnlocked);
  const list = document.querySelector("#bonus-list");
  const counter = document.querySelector("#engineer-counter");
  const pendingSummary = document.querySelector("#summary-pending");
  const approvedSummary = document.querySelector("#summary-approved");
  const deniedSummary = document.querySelector("#summary-denied");
  const adminSecurity = document.querySelector("#admin-bonus-security");
  const adminCode = document.querySelector("#admin-bonus-code");
  const unlockAdminBonus = document.querySelector("#unlock-admin-bonus");
  const adminMessage = document.querySelector("#admin-bonus-message");
  function render() {
    const bonuses = window.portalDemoStore.getReleases()
      .filter((release) => release.bonusStatus || release.hours === "Abonado" || release.hours === "abonado")
      .map((release) => ({
        ...release,
        bonusStatus: release.bonusStatus || "pending"
      }));
    const pending = bonuses.filter((bonus) => bonus.bonusStatus === "pending").length;
    counter.textContent = `${pending} pendentes`;
    pendingSummary.textContent = pending;
    approvedSummary.textContent = bonuses.filter((bonus) => bonus.bonusStatus === "approved").length;
    deniedSummary.textContent = bonuses.filter((bonus) => bonus.bonusStatus === "denied").length;
    list.innerHTML = bonuses.length ? bonuses.map((bonus) => `
      <article class="bonus-item">
        <div class="bonus-item-head"><div><strong>${escapeHtml(bonus.name)}</strong><small>Registro local · Solicitante: ${escapeHtml(bonus.requester)}</small></div><span class="bonus-status ${bonus.bonusStatus === "approved" ? "is-approved" : bonus.bonusStatus === "denied" ? "is-denied" : "is-pending"}">${bonus.bonusStatus === "approved" ? "ABONADO" : bonus.bonusStatus === "denied" ? "NÃO ABONADO" : "PENDENTE"}</span></div>
        <div class="bonus-details"><span><strong>Frente:</strong> ${escapeHtml(bonus.team)}</span><span><strong>Horário:</strong> ${escapeHtml(bonus.time)}</span><span><strong>Motivo:</strong> ${escapeHtml(bonus.reason)}</span></div>
        <div class="bonus-signature">${bonus.engineer ? `Decisão registrada por ${escapeHtml(bonus.engineer)}.` : "Sua decisão será registrada com nome, perfil, data e hora."}</div>
        ${canSignBonus()
          ? '<div class="bonus-actions"><button class="bonus-yes" type="button" data-choice="approved" data-id="' + bonus.id + '">Assinar como abonado</button><button class="bonus-no" type="button" data-choice="denied" data-id="' + bonus.id + '">Assinar como não abonado</button></div>'
          : `<div class="bonus-signature">${isAdministrator ? "Informe o código físico para liberar a assinatura do Administrador Analista." : "Consulta permitida. Somente o engenheiro responsável pode registrar o abono."}</div>`}
      </article>
    `).join("") : '<p class="engineer-empty">Nenhum abono pendente de assinatura.</p>';
  }
  list.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-choice]");
    if (!button) return;
    if (!canSignBonus()) return;
    const bonus = window.portalDemoStore.getReleases().find((item) => item.id === button.dataset.id);
    if (!bonus) return;
    bonus.bonusStatus = button.dataset.choice;
    window.portalDemoStore.updateRelease(bonus.id, {
      bonusStatus: bonus.bonusStatus,
      hours: bonus.bonusStatus === "approved" ? "Abonado" : "Não abonado",
      engineer: window.portalAuthDemo?.getSession()?.name || "Engenheiro responsável"
    });
    render();
  });
  if (isAdministrator) {
    adminSecurity.hidden = false;
    unlockAdminBonus.addEventListener("click", () => {
      if (adminCode.value.trim() !== "3029") {
        adminMessage.textContent = "Código incorreto. A assinatura continua bloqueada.";
        adminMessage.className = "text-danger";
        adminCode.focus();
        return;
      }
      adminBonusUnlocked = true;
      adminMessage.textContent = "Assinatura liberada para esta sessão.";
      adminMessage.className = "text-success";
      adminCode.value = "";
      render();
    });
  }
  render();
})();
