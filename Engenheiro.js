(async () => {
  await window.portalAuthDemo?.ready();
  const session = window.portalAuthDemo?.getSession();
  const isAdministrator = session?.roleValue === "administrador-analista";
  const isEngineer = session?.roleValue === "engenheiro";
  const flow = window.portalReleaseFlow;
  let adminBonusUnlocked = false;
  const canSign = () => isEngineer || (isAdministrator && adminBonusUnlocked);
  const list = document.querySelector("#bonus-list");
  const search = document.querySelector("#bonus-search");
  const counter = document.querySelector("#engineer-counter");
  const filter = document.querySelector("#engineer-filter");
  const pendingSummary = document.querySelector("#summary-pending");
  const approvedSummary = document.querySelector("#summary-approved");
  const deniedSummary = document.querySelector("#summary-denied");
  const refusedSummary = document.querySelector("#summary-refused");
  const adminSecurity = document.querySelector("#admin-bonus-security");
  const adminCode = document.querySelector("#admin-bonus-code");
  const unlockAdminBonus = document.querySelector("#unlock-admin-bonus");
  const adminMessage = document.querySelector("#admin-bonus-message");
  const formatDateTime = (value) => value ? new Date(value).toLocaleString("pt-BR") : "";

  function badgeOf(release, stage) {
    if (stage === "foreman") return ["RECUSADA", "is-denied"];
    if (release.bonusStatus === "approved") return ["ABONADO", "is-approved"];
    if (release.bonusStatus === "denied") return ["NÃO ABONADO", "is-denied"];
    return ["PENDENTE", "is-pending"];
  }

  // Pode mexer: liberação ainda sem abono decidido (o DP pode autorizar a saída antes do
  // engenheiro decidir, pra agilizar — o abono continua em aberto até aqui), ou a que o
  // próprio engenheiro abonou/não abonou e o DP ainda não deu a decisão final.
  // Decisão de outro engenheiro, recusada ou já autorizada/negada pelo DP fica só para consulta.
  const signerName = () => session?.name || "Engenheiro responsável";
  const canAct = (release) => {
    const stage = flow.stageOf(release);
    if (release.abonoLaunchedAt) return false; // abono já lançado no RM: não muda mais
    if (stage === "foreman" || stage === "closed") return false; // recusada ou negada pelo DP: nada a decidir
    if (!release.bonusStatus) return true; // abono ainda nao decidido: pode decidir a qualquer momento
    return (stage === "engineer" || stage === "dp") && release.engineer === signerName();
  };

  function actionsHtml(release, current, stage) {
    if (!canSign()) {
      return `<div class="bonus-signature">${isAdministrator ? "Informe o código físico para liberar a assinatura do Administrador Analista." : "Consulta permitida. Somente o engenheiro responsável pode decidir."}</div><div class="bonus-actions"><button class="release-view-btn" type="button" data-choice="view">Visualizar liberação</button></div>`;
    }
    // "Recusar" só faz sentido antes do DP autorizar a saída — depois disso (saída já
    // liberada, colaborador pode já ter saído), só resta decidir o abono.
    const refuseButton = stage === "engineer" ? '<button class="bonus-refuse" type="button" data-choice="refuse">Recusar</button>' : "";
    return `<div class="bonus-actions">
        <button class="release-view-btn" type="button" data-choice="view">Visualizar liberação</button>
        <button class="bonus-yes" type="button" data-choice="approved">${current === "approved" ? "Abonado ✓" : "Abonado"}</button>
        <button class="bonus-no" type="button" data-choice="denied">${current === "denied" ? "Não abonado ✓" : "Não abonado"}</button>
        ${refuseButton}
        <button class="bonus-delete" type="button" data-choice="delete">Apagar</button>
      </div>`;
  }

  function releaseCard(release) {
    const stage = flow.stageOf(release);
    const id = escapeHtml(release.id);
    const [badge, tone] = badgeOf(release, stage);
    const note = stage === "foreman"
      ? `Devolvida ao encarregado por ${escapeHtml(release.refusedBy)} em ${formatDateTime(release.refusedAt)}. Ele vai ajustar e reenviar.`
      : release.engineerDecisionAt ? `Decisão assinada por ${escapeHtml(release.engineer)} em ${formatDateTime(release.engineerDecisionAt)}.` : "";
    return `
      <article class="bonus-item" data-release="${id}">
        <div class="bonus-item-head"><div><strong>${escapeHtml(release.name)}</strong><small>Matrícula ${escapeHtml(release.registration)} · Solicitante: ${escapeHtml(release.requester)}</small></div><span class="bonus-status ${tone}">${badge}</span></div>
        <div class="bonus-details"><span><strong>Data:</strong> ${escapeHtml(release.date)}</span><span><strong>Horário:</strong> ${escapeHtml(release.time)}</span><span><strong>Movimentação:</strong> ${escapeHtml(flow.movementLabel(release))}</span><span><strong>Motivo:</strong> ${escapeHtml(release.reason)}</span><span><strong>Etapa:</strong> ${escapeHtml(flow.stages[stage]?.label)}</span>${release.bonusRequest ? `<span><strong>Pedido do encarregado:</strong> ${release.bonusRequest === "abonado" ? "Abonado" : "Não abonado"}</span>` : ""}${stage === "foreman" ? `<span><strong>Recusa:</strong> ${escapeHtml(release.refusalReason)}</span>` : ""}</div>
        ${canAct(release) ? actionsHtml(release, release.bonusStatus, stage) : `<div class="bonus-signature">Somente consulta: esta liberação já foi decidida e está bloqueada para alteração.</div><div class="bonus-actions"><button class="release-view-btn" type="button" data-choice="view">Visualizar liberação</button>${canSign() ? '<button class="bonus-delete" type="button" data-choice="delete">Apagar</button>' : ""}</div>`}
        ${note ? `<div class="bonus-signature">${note}</div>` : ""}
      </article>`;
  }

  // Abono ainda nao decidido: conta como "pendente" mesmo que o DP ja tenha autorizado a saida
  // adiantado (o abono corre em paralelo, nao trava mais a autorizacao do DP).
  const needsDecision = (release) => {
    const stage = flow.stageOf(release);
    return !release.bonusStatus && stage !== "foreman" && stage !== "closed";
  };

  async function render() {
    const releases = await window.portalDemoStore.getReleases();
    const order = { engineer: 0, dp: 1, foreman: 2, gate: 3, exited: 4, closed: 5 };
    const stageOf = flow.stageOf;
    const sorted = [...releases].sort((a, b) => order[stageOf(a)] - order[stageOf(b)]);
    const stageFiltered = sorted.filter((release) => filter.value === "all" || needsDecision(release));
    const query = window.normalizeSearchText(search?.value || "");
    const visible = query
      ? stageFiltered.filter((release) => window.normalizeSearchText(`${release.name} ${release.requester}`).includes(query))
      : stageFiltered;
    const pending = releases.filter(needsDecision).length;
    counter.textContent = `${pending} pendentes`;
    pendingSummary.textContent = pending;
    approvedSummary.textContent = releases.filter((release) => release.bonusStatus === "approved" && stageOf(release) !== "foreman").length;
    deniedSummary.textContent = releases.filter((release) => release.bonusStatus === "denied").length;
    refusedSummary.textContent = releases.filter((release) => stageOf(release) === "foreman").length;
    list.innerHTML = visible.length ? visible.map(releaseCard).join("") : `<p class="engineer-empty">${query ? "Nenhuma liberação encontrada para a busca." : "Nenhuma liberação encontrada."}</p>`;
  }

  filter.addEventListener("change", render);
  search?.addEventListener("input", render);

  const dialog = document.querySelector("#refuse-dialog");
  const dialogReasons = document.querySelector("#refuse-reasons");
  const dialogError = document.querySelector("#refuse-error");
  const dialogTarget = document.querySelector("#refuse-target");
  let refusingId = null;

  function openRefuseDialog(release) {
    refusingId = release.id;
    dialogTarget.textContent = `${release.name} · solicitado por ${release.requester}`;
    dialogReasons.innerHTML = flow.refusalReasons.map((reason) => `<label><input type="checkbox" name="refusal-reason" value="${escapeHtml(reason)}"> ${escapeHtml(reason)}</label>`).join("");
    dialogError.hidden = true;
    dialog.showModal();
  }

  document.querySelector("#refuse-cancel").addEventListener("click", () => dialog.close());
  document.querySelector("#refuse-confirm").addEventListener("click", async () => {
    const reasons = [...dialogReasons.querySelectorAll("input:checked")].map((input) => input.value);
    if (!reasons.length) {
      dialogError.hidden = false;
      return;
    }
    // A recusa só devolve ao encarregado com o motivo; ele ajusta e reenvia.
    await window.portalDemoStore.updateRelease(refusingId, {
      stage: "foreman",
      status: "pending",
      bonusStatus: null,
      hours: "Pendente",
      hoursType: null,
      refusedBy: session?.name || "Engenheiro responsável",
      refusedAt: new Date().toISOString(),
      refusalReasons: reasons,
      refusalReason: reasons.join(" e ")
    });
    dialog.close();
    render();
  });

  list.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-choice]");
    if (!button) return;
    const releases = await window.portalDemoStore.getReleases();
    const release = releases.find((item) => item.id === button.closest("[data-release]").dataset.release);
    if (!release) return render();
    if (button.dataset.choice === "view") {
      window.portalReleasePreview.show(release);
      return;
    }
    if (!canSign()) return;
    if (button.dataset.choice === "delete") {
      if (!window.confirm(`Apagar a liberação de ${release.name}? Essa ação não pode ser desfeita.`)) return;
      await window.portalDemoStore.removeRelease(release.id);
      render();
      return;
    }
    if (!canAct(release)) return render();
    if (button.dataset.choice === "refuse") {
      if (flow.stageOf(release) !== "engineer") return render();
      openRefuseDialog(release);
      return;
    }
    const now = new Date().toISOString();
    const currentStage = flow.stageOf(release);
    const changes = {
      engineer: session?.name || "Engenheiro responsável",
      engineerRole: session?.role || "Engenheiro responsável",
      engineerDecisionAt: now,
      bonusStatus: button.dataset.choice,
      hours: button.dataset.choice === "approved" ? "Abonado" : "Não abonado",
      hoursType: button.dataset.choice === "approved" ? "abonado" : "nao-abonado"
    };
    if (currentStage === "engineer") {
      // Fluxo normal: engenheiro decide primeiro e libera para o DP.
      changes.stage = "dp";
      changes.status = "pending";
    } else if (currentStage === "dp") {
      // Engenheiro corrigindo a própria decisão antes do DP finalizar.
      changes.engineerChangedAt = now;
    }
    // Se já estiver em "gate"/"exited" (DP autorizou a saída adiantado), não mexe em
    // stage/status: a saída já foi autorizada e não deve ser desfeita só porque o
    // abono foi decidido agora.
    await window.portalDemoStore.updateRelease(release.id, changes);
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
