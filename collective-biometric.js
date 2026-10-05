// Assinatura por digital dos colaboradores de uma liberação coletiva (leitor Hamster DX), feita no DP:
// cada participante põe o dedo e a assinatura dele vai para a linha com o nome na folha.
// Uso: window.portalCollectiveBiometric.open(sheet, aoFechar)
(() => {
  const esc = (value) => window.escapeHtml(value);
  const reader = () => window.portalBiometricReader;
  const sheetApi = () => window.portalCollectiveSheet;

  let dialog = null;
  let current = null;
  let onClose = null;
  let changed = false;
  let signing = "";          // matrícula que está com o dedo no leitor agora (um leitor só, uma pessoa por vez)
  let readerReady = false;
  const errors = new Map();  // matrícula -> mensagem do último erro

  const formatTime = (value) => {
    const date = value ? new Date(value) : null;
    return !date || Number.isNaN(date.getTime()) ? "" : date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  function ensureDialog() {
    if (dialog) return dialog;
    document.body.insertAdjacentHTML("beforeend", `
      <dialog id="collective-bio-dialog" class="refuse-dialog collective-bio-dialog" aria-labelledby="collective-bio-title">
        <h2 id="collective-bio-title">Assinaturas por digital</h2>
        <p id="collective-bio-sub" class="collective-bio-sub"></p>
        <p id="collective-bio-notice" class="collective-bio-notice" hidden></p>
        <ul id="collective-bio-list" class="collective-bio-list"></ul>
        <div class="refuse-buttons"><button type="button" id="collective-bio-close" class="bonus-yes">Fechar</button></div>
      </dialog>`);
    dialog = document.querySelector("#collective-bio-dialog");
    dialog.querySelector("#collective-bio-close").addEventListener("click", () => dialog.close());
    // Esc com alguém no leitor: espera a leitura terminar para não perder a assinatura.
    dialog.addEventListener("cancel", (event) => { if (signing) event.preventDefault(); });
    dialog.addEventListener("close", () => {
      if (changed) onClose?.();
    });
    dialog.querySelector("#collective-bio-list").addEventListener("click", (event) => {
      const button = event.target.closest("[data-bio-sign]");
      if (button) sign(button.dataset.bioSign);
    });
    return dialog;
  }

  function draw() {
    const people = current.participants || [];
    const signed = sheetApi().signedCount(current);
    dialog.querySelector("#collective-bio-sub").textContent = `${current.motive || "Liberação coletiva"} · ${signed} de ${people.length} ${people.length === 1 ? "assinou" : "assinaram"}`;
    dialog.querySelector("#collective-bio-close").disabled = !!signing;
    dialog.querySelector("#collective-bio-list").innerHTML = people.map((person, index) => {
      const signature = sheetApi().signatureOf(current, person);
      const error = errors.get(person.matricula);
      const action = signature
        ? `<span class="collective-bio-done">✓ Assinado ${esc(formatTime(signature.signedAt))}</span>`
        : `<button type="button" class="row-yes-btn" data-bio-sign="${esc(person.matricula)}"${signing || !readerReady ? " disabled" : ""}>${signing === person.matricula ? '<span class="button-spinner" aria-hidden="true"></span>Coloque o dedo…' : "Assinar"}</button>`;
      return `<li>
        <span class="collective-bio-who"><strong>${index + 1}. ${esc(person.nome)}</strong><small>${esc(person.funcao || "")}${person.funcao ? " · " : ""}Matrícula ${esc(person.matricula)}</small>${error ? `<small class="collective-bio-error">${esc(error)}</small>` : ""}</span>
        ${action}
      </li>`;
    }).join("");
  }

  async function sign(matricula) {
    if (signing || !current) return;
    signing = matricula;
    errors.delete(matricula);
    draw();
    try {
      const signature = await reader().signAs(matricula);
      await window.portalCollectiveStore.signParticipant(current.id, matricula, signature);
      current.participantSignatures = { ...(current.participantSignatures || {}), [matricula]: signature };
      changed = true;
    } catch (error) {
      console.error(error);
      const bioError = error instanceof reader().BiometricError;
      errors.set(matricula, bioError
        ? error.message + (error.code === "sem-cadastro" ? " (menu Biometria)" : "")
        : "A digital conferiu, mas não deu para salvar. Verifique a internet e tente de novo.");
      if (bioError && error.code === "agente-indisponivel") await checkReader();
    } finally {
      signing = "";
      draw();
    }
  }

  async function checkReader() {
    readerReady = await reader().isAvailable();
    const notice = dialog.querySelector("#collective-bio-notice");
    notice.hidden = readerReady;
    notice.textContent = readerReady ? "" : new (reader().BiometricError)("agente-indisponivel").message;
    draw();
  }

  async function open(sheet, afterClose) {
    if (!reader()) return;
    ensureDialog();
    current = sheet;
    onClose = afterClose;
    changed = false;
    errors.clear();
    readerReady = false;
    draw();
    dialog.showModal();
    await checkReader();
  }

  window.portalCollectiveBiometric = Object.freeze({ open });
})();
