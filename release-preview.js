// Folha "Autorização de saída" (meia folha A4) compartilhada por todos os perfis.
// Uso: window.portalReleasePreview.show(release)
// A folha fica "ao vivo": enquanto aberta, acompanha as mudanças da liberação (ex.: abono lançado no RM pelo DP).
(() => {
  const template = `
<div class="release-preview-overlay" id="release-preview" hidden>
    <section class="release-preview" role="dialog" aria-modal="true" aria-labelledby="release-preview-title">
      <div class="release-preview-actions">
        <button type="button" id="close-release-preview">Fechar</button>
        <button type="button" id="launch-release-preview" class="release-launch-btn" hidden>Lançar abono</button>
        <button type="button" id="undo-launch-release-preview" class="release-undo-btn" hidden>Desfazer lançamento</button>
        <button type="button" id="print-release-preview">Imprimir / salvar PDF</button>
        <span class="release-live" title="A folha acompanha a liberação em tempo real">● ao vivo</span>
      </div>
      <article class="release-sheet">
        <header class="release-sheet-header">
          <strong>DIRECIONAL</strong>
          <div><h2 id="release-preview-title">AUTORIZAÇÃO DE SAÍDA DE COLABORADORES</h2><span>DA FRENTE DE SERVIÇO</span></div>
        </header>
        <div class="release-sheet-grid">
          <span><b>OBRA:</b> 369</span><span><b>DATA:</b> <i id="preview-date"></i></span>
        </div>
        <div class="release-sheet-line"><b>O Sr.:</b> <span id="preview-name"></span><b>Função:</b> <span id="preview-role"></span></div>
        <div class="release-sheet-line"><b>Está autorizado no dia de hoje a partir das:</b> <span id="preview-time"></span> hs</div>
        <div class="release-sheet-checks"><b>Movimentação:</b> <span id="preview-movement"></span><b>Motivo da saída:</b> <span id="preview-reason"></span><span id="preview-hours"></span></div>
        <div class="release-sheet-block"><b>Motivo / observação:</b><p id="preview-observation"></p></div>
        <div class="release-sheet-hours"><b>Tratamento das horas:</b><strong id="preview-bonus"></strong></div>
        <div class="release-sheet-signature">Assinatura do colaborador: ______________________________________________</div>
        <footer><span><b>SOLICITANTE (ENCARREGADO)</b><br><i class="signature-name" id="preview-requester"></i></span><span><b>ENGENHEIRO</b><br><i class="signature-name" id="preview-engineer"></i></span><span><b>DEPARTAMENTO PESSOAL</b><br><i class="signature-name" id="preview-dp"></i></span></footer>
        <div class="release-stamp" id="release-stamp" hidden aria-label="Abono lançado no RM">
          <strong>LANÇADO</strong><span>NO RM</span><small id="stamp-detail"></small>
        </div>
      </article>
    </section>
  </div>
  `;

  const formatDate = (value) => {
    if (!value) return "____/____/________";
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR");
  };

  let overlay = null;
  let current = null;
  let unsubscribe = null;
  let launching = false;

  // Só o DP lança (e desfaz) abono no RM, e só o que o engenheiro abonou.
  // O Administrador Analista só conta como DP quando está operando a tela do DP (dpContext).
  let dpContext = false;
  function isDp() {
    const role = window.portalAuthDemo?.getSession()?.roleValue;
    return role === "dp" || (role === "administrador-analista" && dpContext);
  }

  function canLaunch(release) {
    const stage = window.portalReleaseFlow.stageOf(release);
    return isDp()
      && release.bonusStatus === "approved"
      && !release.abonoLaunchedAt
      && ["dp", "gate", "exited"].includes(stage);
  }

  function ensureOverlay() {
    if (overlay) return overlay;
    document.body.insertAdjacentHTML("beforeend", template);
    overlay = document.querySelector("#release-preview");
    overlay.querySelector("#close-release-preview").addEventListener("click", close);
    overlay.querySelector("#print-release-preview").addEventListener("click", () => window.print());
    overlay.querySelector("#launch-release-preview").addEventListener("click", launch);
    overlay.querySelector("#undo-launch-release-preview").addEventListener("click", undoLaunch);
    overlay.addEventListener("click", (event) => {
      if (!event.target.closest(".release-sheet, .release-preview-actions")) close();
    });
    window.addEventListener("resize", () => { if (!overlay.hidden) fit(); });
    return overlay;
  }

  function close() {
    overlay.hidden = true;
    if (unsubscribe) unsubscribe();
    unsubscribe = null;
    current = null;
  }

  // A folha tem tamanho fixo (meia A4); em telas menores é reduzida para caber inteira na largura.
  function fit() {
    overlay.querySelector(".release-sheet").style.zoom = Math.min(1, (overlay.clientWidth - 16) / 794);
  }

  async function findRole(release) {
    if (release.role) return release.role;
    if (!release.registration) return "";
    // Liberações antigas não guardaram a função: busca no cadastro pela matrícula.
    try {
      const employees = await window.portalEmployeeStore?.getAll() || [];
      return employees.find((item) => item.matricula === release.registration)?.funcao || "";
    } catch (error) {
      console.warn("Não foi possível buscar a função do colaborador.", error);
      return "";
    }
  }

  function renderStamp(release, animate) {
    const stamp = overlay.querySelector("#release-stamp");
    const sheet = overlay.querySelector(".release-sheet");
    const launched = !!release.abonoLaunchedAt;
    if (launched) {
      const when = new Date(release.abonoLaunchedAt);
      overlay.querySelector("#stamp-detail").textContent = `${when.toLocaleDateString("pt-BR")} · ${release.abonoLaunchedBy || "DP"}`;
    }
    const wasHidden = stamp.hidden;
    stamp.hidden = !launched;
    if (launched && wasHidden && animate) {
      // Reinicia a animação de carimbo (queda + impacto na folha).
      stamp.classList.remove("is-stamping");
      sheet.classList.remove("is-thud");
      void stamp.offsetWidth;
      stamp.classList.add("is-stamping");
      sheet.classList.add("is-thud");
    } else if (!launched) {
      stamp.classList.remove("is-stamping");
    }
  }

  function render(release, role, animate) {
    const set = (id, text) => { overlay.querySelector(id).textContent = text; };
    const stage = window.portalReleaseFlow.stageOf(release);
    const dpDecided = stage === "gate" || stage === "exited" || stage === "closed";
    set("#preview-date", formatDate(release.date || release.createdAt?.slice(0, 10)));
    set("#preview-name", release.name || "Não informado");
    set("#preview-role", role || "Não informada");
    set("#preview-time", release.time || "____:____");
    set("#preview-movement", window.portalReleaseFlow.movementLabel(release));
    // Tipo do motivo como no formulário de papel (☒ marcado / ☐ vazio) e o detalhe na observação.
    const legacyText = String(release.reason || "");
    const type = release.reasonType || (/^tarefa/i.test(legacyText) ? "tarefa" : /^particular/i.test(legacyText) ? "particular" : "");
    const box = (value, label) => `${type === value ? "☒" : "☐"} ${label}`;
    set("#preview-reason", type ? `${box("tarefa", "Tarefa")}   ${box("particular", "Particular")}` : "Não informado");
    const detail = release.reasonDetail ?? legacyText.replace(/^(tarefa|particular):?\s*/i, "");
    set("#preview-hours", release.hours || "Não informado");
    set("#preview-observation", detail || "Sem observação.");
    const bonus = overlay.querySelector("#preview-bonus");
    bonus.textContent = release.bonusStatus === "approved" ? "ABONADO" : release.bonusStatus === "denied" ? "NÃO ABONADO" : (release.hours || "PENDENTE");
    bonus.className = release.bonusStatus === "approved" ? "bonus-approved" : release.bonusStatus === "denied" ? "bonus-denied" : "bonus-pending";
    set("#preview-requester", release.requester || "Não informado");
    set("#preview-engineer", release.engineer || "Pendente");
    set("#preview-dp", release.dpSigner || (dpDecided ? "Departamento Pessoal" : "Pendente"));
    overlay.querySelector("#launch-release-preview").hidden = !canLaunch(release);
    overlay.querySelector("#undo-launch-release-preview").hidden = !(isDp() && release.abonoLaunchedAt);
    renderStamp(release, animate);
  }

  async function launch() {
    if (!current || launching || !canLaunch(current)) return;
    launching = true;
    const session = window.portalAuthDemo?.getSession();
    const changes = {
      abonoLaunchedAt: new Date().toISOString(),
      abonoLaunchedBy: session?.name || "Departamento Pessoal",
      abonoLaunchedRole: session?.role || "Departamento Pessoal"
    };
    try {
      await window.portalDemoStore.updateRelease(current.id, changes);
      // Atualiza já na folha; o "ao vivo" confirma em seguida com o dado salvo.
      current = { ...current, ...changes };
      render(current, current._role, true);
      document.dispatchEvent(new CustomEvent("portal:release-changed", { detail: { id: current.id } }));
    } catch (error) {
      console.error("Não foi possível lançar o abono.", error);
      window.alert("Não foi possível lançar o abono. Tente novamente.");
    } finally {
      launching = false;
    }
  }

  // Desfaz um lançamento feito por engano: tira o carimbo e guarda quem lançou/desfez no histórico.
  async function undoLaunch() {
    if (!current || launching || !current.abonoLaunchedAt || !isDp()) return;
    if (!window.confirm(`Desfazer o lançamento do abono de ${current.name}? O carimbo será removido.`)) return;
    launching = true;
    const session = window.portalAuthDemo?.getSession();
    const changes = {
      abonoLaunchedAt: null,
      abonoLaunchedBy: null,
      abonoLaunchedRole: null,
      abonoLaunchHistory: [...(current.abonoLaunchHistory || []), {
        launchedBy: current.abonoLaunchedBy,
        launchedAt: current.abonoLaunchedAt,
        undoneBy: session?.name || "Departamento Pessoal",
        undoneAt: new Date().toISOString()
      }]
    };
    try {
      await window.portalDemoStore.updateRelease(current.id, changes);
      current = { ...current, ...changes };
      render(current, current._role, false);
      document.dispatchEvent(new CustomEvent("portal:release-changed", { detail: { id: current.id } }));
    } catch (error) {
      console.error("Não foi possível desfazer o lançamento.", error);
      window.alert("Não foi possível desfazer o lançamento. Tente novamente.");
    } finally {
      launching = false;
    }
  }

  async function show(release, options = {}) {
    ensureOverlay();
    dpContext = !!options.dpContext;
    if (unsubscribe) unsubscribe();
    const role = await findRole(release);
    current = { ...release, _role: role };
    render(current, role, false);
    overlay.hidden = false;
    fit();
    // Ao vivo: qualquer mudança na liberação aberta (feita aqui ou em outro aparelho) reflete na folha.
    unsubscribe = window.portalDemoStore.subscribeRelease?.(release.id, (fresh) => {
      if (!current || fresh.id !== current.id) return;
      const wasLaunched = !!current.abonoLaunchedAt;
      current = { ...fresh, _role: role };
      render(current, role, !wasLaunched);
      document.dispatchEvent(new CustomEvent("portal:release-changed", { detail: { id: fresh.id } }));
    }) || null;
  }

  window.portalReleasePreview = Object.freeze({ show });
})();
