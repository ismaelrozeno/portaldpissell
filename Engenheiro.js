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

  // Regras de quem pode decidir/recusar ficam em release-actions.js (compartilhadas com o painel inicial).
  const actions = window.portalReleaseActions;
  const canAct = (release) => actions.engineerCanAct(release);

  // Recusar vale mesmo depois de o DP autorizar a saída.
  const refuseButtonHtml = (release) => actions.engineerCanRefuse(release) ? '<button class="bonus-refuse" type="button" data-choice="refuse">Recusar</button>' : "";

  function actionsHtml(release, current) {
    if (!canSign()) {
      return `<div class="bonus-signature">${isAdministrator ? "Informe o código físico para liberar a assinatura do Administrador Analista." : "Consulta permitida. Somente o engenheiro responsável pode decidir."}</div><div class="bonus-actions"><button class="release-view-btn" type="button" data-choice="view">Visualizar liberação</button></div>`;
    }
    return `<div class="bonus-actions">
        <button class="release-view-btn" type="button" data-choice="view">Visualizar liberação</button>
        <button class="bonus-yes" type="button" data-choice="approved">${current === "approved" ? "Abonado ✓" : "Abonado"}</button>
        <button class="bonus-no" type="button" data-choice="denied">${current === "denied" ? "Não abonado ✓" : "Não abonado"}</button>
        ${refuseButtonHtml(release)}
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
        ${canAct(release) ? actionsHtml(release, release.bonusStatus) : `<div class="bonus-signature">Somente consulta: esta liberação já foi decidida e está bloqueada para alteração.</div><div class="bonus-actions"><button class="release-view-btn" type="button" data-choice="view">Visualizar liberação</button>${canSign() ? `${refuseButtonHtml(release)}<button class="bonus-delete" type="button" data-choice="delete">Apagar</button>` : ""}</div>`}
        ${note ? `<div class="bonus-signature">${note}</div>` : ""}
      </article>`;
  }

  // Abono ainda nao decidido: conta como "pendente" mesmo que o DP ja tenha autorizado a saida
  // adiantado (o abono corre em paralelo, nao trava mais a autorizacao do DP).
  const needsDecision = (release) => {
    const stage = flow.stageOf(release);
    return !release.bonusStatus && stage !== "foreman" && stage !== "closed";
  };

  // Redesenho em fila: vários pedidos seguidos viram um só no final, com os dados mais novos.
  let renderRunning = null;
  let renderAgain = false;
  function render() {
    if (renderRunning) {
      renderAgain = true;
      return renderRunning;
    }
    renderRunning = (async () => {
      try {
        do {
          renderAgain = false;
          await renderNow();
        } while (renderAgain);
      } catch (error) {
        console.error("Falha ao atualizar a lista do engenheiro.", error);
      } finally {
        renderRunning = null;
      }
    })();
    return renderRunning;
  }

  async function renderNow() {
    // Na tela do engenheiro ninguém age como DP: apagar aqui só tira do histórico de quem apagou.
    const releases = actions.visibleFor(await window.portalDemoStore.getReleases());
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

  // Enquanto uma liberação está sendo salva, os botões do cartão dela ficam travados e o clicado mostra
  // "Salvando…" (evita clique duplo). Sempre destrava no final, mesmo com erro de internet.
  const busyReleases = new Set();
  function setCardBusy(button, on) {
    button.closest("[data-release]")?.querySelectorAll("button").forEach((item) => { item.disabled = on; });
    if (on) {
      button.dataset.label = button.textContent;
      button.textContent = "Salvando…";
    } else if (button.dataset.label) {
      button.textContent = button.dataset.label;
    }
  }

  list.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-choice]");
    if (!button || button.disabled) return;
    const id = button.closest("[data-release]").dataset.release;
    if (busyReleases.has(id)) return;
    busyReleases.add(id);
    try {
      const releases = await window.portalDemoStore.getReleases();
      const release = releases.find((item) => item.id === id);
      if (!release) return render();
      if (button.dataset.choice === "view") {
        window.portalReleasePreview.show(release);
        return;
      }
      if (!canSign()) return;
      let run = null;
      if (button.dataset.choice === "delete") {
        if (!await actions.confirmText(actions.trashQuestion(release), "Mover para a lixeira")) return;
        run = () => actions.trashRelease(release);
      } else if (button.dataset.choice === "refuse") {
        if (!actions.engineerCanRefuse(release)) return render();
        actions.openRefuseDialog(release, render);
        return;
      } else {
        if (!canAct(release)) return render();
        run = () => actions.engineerToggleDecision(release, button.dataset.choice);
      }
      setCardBusy(button, true);
      try {
        await run();
      } catch (error) {
        console.error("Não foi possível salvar a decisão.", error);
        await actions.ask({ title: "Não foi possível salvar", message: `${release.name}\nVerifique a internet e tente de novo.`, okText: "OK", cancelText: null });
      } finally {
        setCardBusy(button, false);
      }
      render();
    } finally {
      busyReleases.delete(id);
    }
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
