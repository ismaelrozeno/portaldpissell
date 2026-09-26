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

  // ---------- Apagar / histórico de cada perfil ----------
  // Só o DP apaga de verdade (some para todos). Qualquer outro perfil "apaga" só do próprio histórico:
  // o id dele entra em "hiddenFor" na liberação e as telas dele passam a escondê-la. Ninguém apaga nada do DP.
  const myId = () => session()?.uid || session()?.email || session()?.name || "";

  // O administrador só age como DP na tela/painel do DP (dpContext).
  function actsAsDp(dpContext) {
    const role = session()?.roleValue;
    return role === "dp" || (role === "administrador-analista" && !!dpContext);
  }

  const isHiddenForMe = (release) => (release.hiddenFor || []).includes(myId());

  // Lista de liberações que o usuário vê: o DP vê tudo; os outros não veem o que apagaram do próprio histórico.
  const visibleFor = (releases, asDp) => (asDp ? releases : releases.filter((release) => !isHiddenForMe(release)));

  async function deleteRelease(release, asDp) {
    if (asDp) {
      await store().removeRelease(release.id);
      return "all";
    }
    const id = myId();
    if (!id) return null;
    await store().updateRelease(release.id, { hiddenFor: [...new Set([...(release.hiddenFor || []), id])] });
    return "me";
  }

  // Texto da pergunta antes de apagar, conforme quem está apagando.
  const deleteQuestion = (release, asDp) => (asDp
    ? `Liberação de ${release.name}
(some para TODOS os perfis)`
    : `Liberação de ${release.name}
(some só do seu histórico; o DP continua vendo)`);

  window.portalReleaseActions = Object.freeze({
    actsAsDp,
    visibleFor,
    deleteRelease,
    deleteQuestion,
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
