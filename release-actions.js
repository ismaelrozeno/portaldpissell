// Ações sobre liberações (engenheiro, DP e portaria) num só lugar.
// Usadas pelo painel inicial "Meu portal" e pelas telas de cada perfil, para as regras não divergirem.
(() => {
  const flow = () => window.portalReleaseFlow;
  const store = () => window.portalDemoStore;
  const session = () => window.portalAuthDemo?.getSession();
  const adminPhysicalCode = "3029";
  let adminSignatureUnlocked = false;

  const signerName = (fallback) => session()?.name || fallback;

  // ---------- Engenheiro ----------

  // Abonado / Não abonado ficam sempre disponíveis, mesmo depois de o DP autorizar a saída ou de o colaborador sair
  // (o abono é sobre as horas, não sobre a saída). Só saem quando: a liberação foi recusada ou negada pelo DP,
  // o abono já foi lançado no RM, ou a decisão de abono é de outro engenheiro.
  function engineerCanAct(release) {
    const stage = flow().stageOf(release);
    if (release.abonoLaunchedAt) return false;
    if (stage === "foreman" || stage === "closed") return false;
    return !release.bonusStatus || release.engineer === signerName("Engenheiro responsável");
  }

  // Abonar, Não abonar e Recusar são as 3 opções de uma escolha só do engenheiro.
  // Recusar continua disponível (mesmo depois de o DP autorizar a saída) enquanto o engenheiro AINDA NÃO
  // decidiu o abono. Depois que ele abonou ou não abonou, Recusar sai. Também não vale para: recusada,
  // negada, saída já confirmada na portaria ou abono lançado no RM.
  function engineerCanRefuse(release) {
    const stage = flow().stageOf(release);
    if (release.abonoLaunchedAt || release.bonusStatus) return false;
    return ["engineer", "dp", "gate"].includes(stage);
  }

  // O engenheiro assina direto; o Administrador Analista precisa do código físico (uma vez por sessão do navegador).
  function ensureEngineerSignature() {
    const role = session()?.roleValue;
    if (role === "engenheiro") return true;
    if (role !== "administrador-analista") return false;
    if (adminSignatureUnlocked) return true;
    const code = window.prompt("Código físico do Administrador Analista para assinar como engenheiro:");
    if (code === null) return false;
    if (code.trim() !== adminPhysicalCode) {
      window.alert("Código incorreto. A assinatura continua bloqueada.");
      return false;
    }
    adminSignatureUnlocked = true;
    return true;
  }

  async function engineerDecide(release, choice) {
    const now = new Date().toISOString();
    const stage = flow().stageOf(release);
    const changes = {
      engineer: signerName("Engenheiro responsável"),
      engineerRole: session()?.role || "Engenheiro responsável",
      engineerDecisionAt: now,
      bonusStatus: choice,
      hours: choice === "approved" ? "Abonado" : "Não abonado",
      hoursType: choice === "approved" ? "abonado" : "nao-abonado"
    };
    if (stage === "engineer") {
      // Fluxo normal: o engenheiro decide primeiro e libera para o DP.
      changes.stage = "dp";
      changes.status = "pending";
    } else if (stage === "dp") {
      // Engenheiro corrigindo a própria decisão antes de o DP finalizar.
      changes.engineerChangedAt = now;
    }
    // Se o DP já autorizou a saída (gate/exited), stage e status não mudam: a saída não é desfeita.
    await store().updateRelease(release.id, changes);
  }

  // Clicar de novo no botão já marcado desfaz a decisão (clique errado): a liberação volta a "sem decisão".
  // Devolve true se algo mudou.
  async function engineerToggleDecision(release, choice) {
    if (release.bonusStatus !== choice) {
      await engineerDecide(release, choice);
      return true;
    }
    const question = choice === "approved" ? "Deseja desfazer o abono?" : "Deseja desfazer o não abono?";
    if (!window.confirm(`${question}

${release.name}
A liberação volta a ficar sem decisão do engenheiro.`)) return false;
    const stage = flow().stageOf(release);
    const changes = {
      bonusStatus: null,
      hours: "Pendente",
      hoursType: null,
      engineer: null,
      engineerRole: null,
      engineerDecisionAt: null,
      engineerUndoneAt: new Date().toISOString(),
      engineerUndoneBy: signerName("Engenheiro responsável")
    };
    // Se a decisão do engenheiro foi o que mandou a liberação para o DP, ela volta a aguardar o engenheiro.
    if (stage === "dp") {
      changes.stage = "engineer";
      changes.status = "pending";
    }
    await store().updateRelease(release.id, changes);
    return true;
  }

  // A recusa só devolve ao encarregado com o motivo; ele ajusta e reenvia.
  async function engineerRefuse(release, reasons) {
    await store().updateRelease(release.id, {
      stage: "foreman",
      status: "pending",
      bonusStatus: null,
      hours: "Pendente",
      hoursType: null,
      // Se o DP já tinha autorizado a saída, essa autorização cai: o DP decide de novo após o reenvio.
      dpSigner: null,
      dpRole: null,
      dpDecisionAt: null,
      refusedBy: signerName("Engenheiro responsável"),
      refusedAt: new Date().toISOString(),
      refusalReasons: reasons,
      refusalReason: reasons.join(" e ")
    });
  }

  let refuseDialog = null;

  // Pop-up para escolher o motivo da recusa (criado na primeira vez que é usado).
  function openRefuseDialog(release, onDone) {
    if (!refuseDialog) {
      document.body.insertAdjacentHTML("beforeend", `
        <dialog id="refuse-dialog" class="refuse-dialog" aria-labelledby="refuse-title">
          <h2 id="refuse-title">Recusar liberação</h2>
          <p id="refuse-target"></p>
          <p>Escolha o que o encarregado precisa ajustar:</p>
          <div id="refuse-reasons" class="refuse-reasons"></div>
          <p id="refuse-error" class="text-danger" role="alert" hidden>Selecione pelo menos um motivo.</p>
          <div class="refuse-buttons">
            <button type="button" id="refuse-cancel" class="bonus-yes">Cancelar</button>
            <button type="button" id="refuse-confirm" class="bonus-no">Confirmar recusa</button>
          </div>
        </dialog>`);
      refuseDialog = document.querySelector("#refuse-dialog");
    }
    const reasonsBox = refuseDialog.querySelector("#refuse-reasons");
    const error = refuseDialog.querySelector("#refuse-error");
    refuseDialog.querySelector("#refuse-target").textContent = `${release.name} · solicitado por ${release.requester}`;
    reasonsBox.innerHTML = flow().refusalReasons.map((reason) => `<label><input type="checkbox" name="refusal-reason" value="${escapeHtml(reason)}"> ${escapeHtml(reason)}</label>`).join("");
    error.hidden = true;
    // Botões recriados a cada abertura para não acumular ouvintes de recusas anteriores.
    for (const id of ["#refuse-cancel", "#refuse-confirm"]) {
      const old = refuseDialog.querySelector(id);
      old.replaceWith(old.cloneNode(true));
    }
    refuseDialog.querySelector("#refuse-cancel").addEventListener("click", () => refuseDialog.close());
    refuseDialog.querySelector("#refuse-confirm").addEventListener("click", async () => {
      const reasons = [...reasonsBox.querySelectorAll("input:checked")].map((input) => input.value);
      if (!reasons.length) {
        error.hidden = false;
        return;
      }
      await engineerRefuse(release, reasons);
      refuseDialog.close();
      if (onDone) onDone();
    });
    refuseDialog.showModal();
  }

  // ---------- DP ----------

  // O DP pode autorizar/negar mesmo com a liberação ainda aguardando o engenheiro.
  const dpCanDecide = (release) => ["dp", "engineer"].includes(flow().stageOf(release));

  async function dpDecide(release, authorize) {
    await store().updateRelease(release.id, {
      status: authorize ? "authorized" : "denied",
      stage: authorize ? "gate" : "closed",
      dpRole: session()?.role || "Departamento Pessoal",
      dpSigner: signerName("Departamento Pessoal"),
      dpDecisionAt: new Date().toISOString()
    });
  }

  // Abono aprovado pelo engenheiro que o DP ainda precisa lançar no RM.
  const needsLaunch = (release) => release.bonusStatus === "approved"
    && !release.abonoLaunchedAt
    && ["dp", "gate", "exited"].includes(flow().stageOf(release));

  // ---------- Portaria ----------

  const canConfirmExit = () => ["porteiro", "administrador-analista"].includes(session()?.roleValue);

  async function confirmExit(release) {
    await store().updateRelease(release.id, {
      stage: "exited",
      exitConfirmedBy: signerName("Portaria"),
      exitConfirmedRole: session()?.role || "Porteiro",
      exitConfirmedAt: new Date().toISOString()
    });
  }

  // ---------- Lixeira de cada usuário ----------
  // "Apagar" manda a liberação para a lixeira DE QUEM APAGOU (o id dele entra em "hiddenFor"): some da tela
  // inicial dele e nada muda para os outros. Da lixeira dá para restaurar ou apagar de vez:
  //  - perfis comuns: "apagar de vez" só some do histórico deles (id em "purgedFor"); o DP continua vendo;
  //  - DP e Administrador: "apagar da lixeira" APAGA DO BANCO DE DADOS, para todos os perfis, sem volta.
  const myId = () => session()?.uid || session()?.email || session()?.name || "";
  const has = (list) => (list || []).includes(myId());
  const without = (list) => (list || []).filter((id) => id !== myId());
  const withMe = (list) => [...new Set([...(list || []), myId()])];

  // Só no perfil do DP se apaga de verdade no banco: o próprio DP, ou o Administrador com o painel do DP aberto.
  // Nos demais perfis (mesmo o administrador operando-os) "apagar da lixeira" só some do histórico de quem apagou.
  const canHardDelete = (dpContext) => {
    const role = session()?.roleValue;
    return role === "dp" || (role === "administrador-analista" && !!dpContext);
  };

  // O administrador só age como DP na tela/painel do DP (dpContext) — usado no lançamento de abono.
  function actsAsDp(dpContext) {
    const role = session()?.roleValue;
    return role === "dp" || (role === "administrador-analista" && !!dpContext);
  }

  const isTrashed = (release) => has(release.hiddenFor) && !has(release.purgedFor);
  // Liberações que o usuário vê (fora da lixeira e não apagadas de vez). O 2º argumento existe só por compatibilidade.
  const visibleFor = (releases) => releases.filter((release) => !has(release.hiddenFor) && !has(release.purgedFor));
  const trashFor = (releases) => releases.filter(isTrashed);

  async function trashRelease(release) {
    if (!myId()) return;
    await store().updateRelease(release.id, { hiddenFor: withMe(release.hiddenFor) });
  }

  async function restoreRelease(release) {
    await store().updateRelease(release.id, { hiddenFor: without(release.hiddenFor) });
  }

  // Apagar da lixeira: DP/Admin apagam no banco; os demais só somem do próprio histórico.
  async function emptyTrashItem(release, dpContext) {
    if (canHardDelete(dpContext)) {
      await store().removeRelease(release.id);
      return "database";
    }
    await store().updateRelease(release.id, { purgedFor: withMe(release.purgedFor) });
    return "history";
  }

  async function forEachSequential(list, fn) {
    for (const release of list) await fn(release);
  }
  const trashMany = (list) => forEachSequential(list, trashRelease);
  const restoreMany = (list) => forEachSequential(list, restoreRelease);
  const emptyTrashMany = (list, dpContext) => forEachSequential(list, (release) => emptyTrashItem(release, dpContext));

  // Textos das perguntas de confirmação.
  const trashQuestion = (release) => `Mover para a lixeira?

Liberação de ${release.name}
Você pode restaurar depois. Some só da sua tela inicial.`;
  const trashAllQuestion = (count) => `Mover ${count} liberação(ões) para a lixeira?

A tela inicial fica limpa e você pode restaurar depois.
Os outros perfis não são afetados.`;
  const restoreAllQuestion = (count) => `Restaurar ${count} liberação(ões) da lixeira para a tela inicial?`;
  function emptyQuestion(count, single, dpContext) {
    const what = single ? `a liberação de ${single.name}` : `${count} liberação(ões)`;
    if (canHardDelete(dpContext)) {
      return `⚠ ATENÇÃO — APAGAR DO BANCO DE DADOS ⚠

Você vai apagar DEFINITIVAMENTE ${what} do BANCO DE DADOS.

• Some para TODOS os perfis (DP, engenheiro, encarregado e portaria).
• NÃO existe como recuperar.

Deseja realmente apagar do banco de dados?`;
    }
    return `Apagar de vez da lixeira?

Você vai apagar ${what} do SEU histórico.
• Não dá para restaurar depois.
• O DP continua vendo essa liberação.

Deseja continuar?`;
  }

  window.portalReleaseActions = Object.freeze({
    actsAsDp,
    canHardDelete,
    visibleFor,
    trashFor,
    trashRelease,
    restoreRelease,
    emptyTrashItem,
    trashMany,
    restoreMany,
    emptyTrashMany,
    trashQuestion,
    trashAllQuestion,
    restoreAllQuestion,
    emptyQuestion,
    engineerCanAct,
    engineerCanRefuse,
    ensureEngineerSignature,
    engineerDecide,
    engineerToggleDecision,
    engineerRefuse,
    openRefuseDialog,
    dpCanDecide,
    dpDecide,
    needsLaunch,
    canConfirmExit,
    confirmExit
  });
})();
