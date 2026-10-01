// Folha "Liberação coletiva" da liberação coletiva (A4 retrato, no modelo de papel da obra).
// Uso: window.portalCollectiveSheet.show(sheet)
(() => {
  const MIN_ROWS = 24;
  const esc = (value) => window.escapeHtml(value);

  const formatDate = (value) => {
    if (!value) return "____/____/________";
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR");
  };
  const formatDateTime = (value) => {
    const date = value ? new Date(value) : null;
    return !date || Number.isNaN(date.getTime()) ? "" : date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };
  const movementLabel = (sheet) => {
    const list = sheet.movement?.length ? sheet.movement : ["saida"];
    const names = list.map((item) => item === "entrada" ? "Entrada" : "Saída");
    return names.length > 1 ? "Entrada e saída" : names[0];
  };

  // Mesmo fluxo da liberação individual: engenheiro (abono) -> DP (autoriza a saída) -> portaria (confirma a saída).
  const STAGES = {
    engineer: { label: "Aguardando engenheiro", tone: "pending" },
    dp: { label: "Aguardando DP", tone: "pending" },
    gate: { label: "Autorizada · aguardando saída", tone: "approved" },
    exited: { label: "Saída confirmada", tone: "approved" },
    closed: { label: "Negada pelo DP", tone: "denied" }
  };
  // Folhas antigas guardavam "decided" (engenheiro já decidiu) ou nada: viram "dp" e "engineer".
  const stageOf = (sheet) => sheet.stage === "decided" ? "dp" : (STAGES[sheet.stage] ? sheet.stage : "engineer");
  const statusLabel = (sheet) => {
    const stage = stageOf(sheet);
    const abono = sheet.bonusStatus ? ` · ${sheet.bonusStatus === "approved" ? "Abonado" : "Não abonado"} por ${sheet.engineer || "engenheiro"}` : "";
    return stage === "engineer"
      ? `Aguardando engenheiro${sheet.targetEngineer ? ` (${sheet.targetEngineer})` : ""}`
      : `${STAGES[stage].label}${abono}`;
  };

  // Valores já formatados da folha, usados pelo PDF (os mesmos que a tela mostra).
  function pdfFields(sheet) {
    const stage = stageOf(sheet);
    const signed = (name, at) => ({ name: name || "", time: name ? formatDateTime(at) : "" });
    const eng = sheet.bonusStatus && sheet.engineer ? signed(sheet.engineer, sheet.engineerDecisionAt) : signed("", "");
    const dp = signed(sheet.dpSigner, sheet.dpDecisionAt);
    const gate = signed(sheet.exitConfirmedBy, sheet.exitConfirmedAt);
    return {
      motive: sheet.motive || "",
      date: formatDate(sheet.date),
      foreman: sheet.foreman || "",
      requester: sheet.requester || "",
      requesterTime: formatDateTime(sheet.createdAt),
      engineer: sheet.engineer || sheet.targetEngineer || "",
      engineerSigner: eng.name, engineerTime: eng.time,
      dp: sheet.dpSigner || (stage === "closed" ? "Negou a saída" : ""),
      dpSigner: dp.name, dpTime: dp.time,
      gate: sheet.exitConfirmedBy || "",
      gateSigner: gate.name, gateTime: gate.time,
      hours: sheet.bonusStatus === "approved" ? "ABONADO" : sheet.bonusStatus === "denied" ? "NÃO ABONADO" : "PENDENTE · aguardando decisão do engenheiro",
      hoursTone: sheet.bonusStatus === "approved" ? "yes" : sheet.bonusStatus === "denied" ? "no" : "wait",
      footer: `Obra 369 · ${movementLabel(sheet)}${sheet.time ? ` a partir das ${sheet.time} hs` : ""}`
    };
  }

  function sheetHtml(sheet) {
    const people = sheet.participants || [];
    const rows = Math.max(MIN_ROWS, people.length);
    const body = Array.from({ length: rows }, (_, index) => {
      const person = people[index];
      return `<tr><td class="cs-id">${index + 1}</td><td>${person ? esc(person.nome) : ""}</td><td class="cs-role">${person ? esc(String(person.funcao || "").toUpperCase()) : ""}</td><td></td></tr>`;
    }).join("");
    return `
      <header class="cs-head">
        <div class="cs-logo">DIRECIONAL</div>
        <div class="cs-title">LIBERAÇÃO COLETIVA</div>
        <div class="cs-meta">
          <div><span>MOTIVO</span><strong>${esc(sheet.motive || "")}</strong></div>
          <div><span>DATA</span><strong>${esc(formatDate(sheet.date))}</strong></div>
        </div>
      </header>
      <table class="cs-sign">
        <tr><th>Encarregado</th><td>${esc(sheet.foreman || "")}</td><th>Assinatura</th><td class="cs-esign">${esc(sheet.requester || "")}<small>${esc(formatDateTime(sheet.createdAt))}</small></td></tr>
        <tr><th>Engenheiro</th><td>${esc(sheet.engineer || sheet.targetEngineer || "")}</td><th>Assinatura</th><td class="cs-esign">${sheet.bonusStatus && sheet.engineer ? `${esc(sheet.engineer)}<small>${esc(formatDateTime(sheet.engineerDecisionAt))}</small>` : ""}</td></tr>
        <tr><th>DP</th><td>${esc(sheet.dpSigner || (stageOf(sheet) === "closed" ? "Negou a saída" : ""))}</td><th>Assinatura</th><td class="cs-esign">${sheet.dpSigner ? `${esc(sheet.dpSigner)}<small>${esc(formatDateTime(sheet.dpDecisionAt))}</small>` : ""}</td></tr>
        <tr><th>Portaria</th><td>${esc(sheet.exitConfirmedBy || "")}</td><th>Assinatura</th><td class="cs-esign">${sheet.exitConfirmedBy ? `${esc(sheet.exitConfirmedBy)}<small>${esc(formatDateTime(sheet.exitConfirmedAt))}</small>` : ""}</td></tr>
        <tr><th>Horas</th><td colspan="3" class="cs-bonus cs-bonus-${sheet.bonusStatus === "approved" ? "yes" : sheet.bonusStatus === "denied" ? "no" : "wait"}">${sheet.bonusStatus === "approved" ? "ABONADO" : sheet.bonusStatus === "denied" ? "NÃO ABONADO" : "PENDENTE · aguardando decisão do engenheiro"}</td></tr>
      </table>
      <table class="cs-list">
        <thead>
          <tr><th colspan="4" class="cs-participants">Participantes</th></tr>
          <tr><th class="cs-id">ID</th><th>NOME</th><th>Função</th><th>Assinatura</th></tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
      <p class="cs-foot">Obra 369 · ${esc(movementLabel(sheet))}${sheet.time ? ` a partir das ${esc(sheet.time)} hs` : ""}</p>`;
  }

  let overlay = null;
  let current = null;

  // Carrega, só quando precisa, o gerador de PDF (jsPDF + collective-release-pdf.js).
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const tag = document.createElement("script");
      tag.src = src;
      tag.onload = resolve;
      tag.onerror = () => reject(new Error(`Não foi possível carregar ${src}`));
      document.head.append(tag);
    });
  }
  async function ensurePdfTools() {
    if (!window.jspdf?.jsPDF) await loadScript("https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js");
    if (!window.portalCollectivePdf) await loadScript("collective-release-pdf.js?v=20261001c");
  }

  // "Imprimir / salvar PDF": gera o PDF da folha e abre numa aba nova (como a folha individual), pronto para
  // imprimir ou salvar. Se não der (sem internet, pop-up bloqueado), cai na impressão pela janela própria.
  async function printSheet() {
    if (!current) return;
    const button = overlay.querySelector("#cs-print");
    const original = button.textContent;
    button.disabled = true;
    button.textContent = "Gerando PDF…";
    // Abre a aba já no clique (antes do carregamento), para o navegador não bloquear o pop-up.
    const tab = window.open("", "_blank");
    try {
      await ensurePdfTools();
      const blob = window.portalCollectivePdf.build(current, pdfFields(current));
      const url = URL.createObjectURL(blob);
      if (tab) {
        tab.location.href = url;
      } else {
        const link = document.createElement("a");
        link.href = url;
        link.download = `lista-de-presenca-obra-369_${String(current.motive || "folha").normalize("NFD").replace(/[^a-zA-Z0-9]+/g, "-").toUpperCase().slice(0, 30)}.pdf`;
        document.body.append(link);
        link.click();
        link.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 120000);
    } catch (error) {
      console.warn("PDF indisponível, usando a impressão pela janela própria.", error);
      if (tab) tab.close();
      printHtmlFallback();
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  // Plano B (sem internet para o gerador de PDF): imprime numa janela própria, só com a folha: as telas do portal têm regras de impressão de outras folhas
  // (ex.: Release-Preview.css) que escondem tudo que não é delas e deixariam a impressão em branco.
  function printHtmlFallback() {
    if (!current) return;
    const win = window.open("", "_blank");
    if (!win) {
      window.alert("O navegador bloqueou a janela de impressão. Permita pop-ups para este site e tente de novo.");
      return;
    }
    const css = new URL("Liberacao-Coletiva.css?v=20261001h", document.baseURI).href;
    win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Liberação coletiva · Obra 369</title>
      <link rel="stylesheet" href="${css}"></head>
      <body style="margin:0;background:#fff"><div class="cs-overlay" id="collective-preview" style="position:static;background:#fff;padding:0"><section class="cs-dialog"><article class="cs-sheet" style="box-shadow:none;margin:0 auto">${sheetHtml(current)}</article></section></div></body></html>`);
    win.document.close();
    // Espera o estilo carregar antes de abrir a impressão.
    const link = win.document.querySelector("link");
    let done = false;
    const go = () => { if (done) return; done = true; win.focus(); win.print(); };
    link.addEventListener("load", go);
    link.addEventListener("error", go);
    setTimeout(go, 2500);
  }

  function ensureOverlay() {
    if (overlay) return overlay;
    document.body.insertAdjacentHTML("beforeend", `
      <div class="cs-overlay" id="collective-preview" hidden>
        <section class="cs-dialog" role="dialog" aria-modal="true" aria-label="Liberação coletiva">
          <div class="cs-actions">
            <button type="button" id="cs-close">Fechar</button>
            <button type="button" id="cs-print">Imprimir / salvar PDF</button>
          </div>
          <article class="cs-sheet" id="cs-sheet"></article>
        </section>
      </div>`);
    overlay = document.querySelector("#collective-preview");
    overlay.querySelector("#cs-close").addEventListener("click", close);
    overlay.querySelector("#cs-print").addEventListener("click", printSheet);
    overlay.addEventListener("click", (event) => {
      if (!event.target.closest(".cs-sheet, .cs-actions")) close();
    });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !overlay.hidden) close(); });
    window.addEventListener("resize", () => { if (!overlay.hidden) fit(); });
    return overlay;
  }

  function close() {
    overlay.hidden = true;
  }

  // A folha tem largura fixa de A4 (794 px); em telas menores é reduzida para caber inteira.
  function fit() {
    overlay.querySelector(".cs-sheet").style.zoom = Math.min(1, (overlay.clientWidth - 16) / 794);
  }

  function show(sheet) {
    ensureOverlay();
    current = sheet;
    overlay.querySelector("#cs-sheet").innerHTML = sheetHtml(sheet);
    overlay.hidden = false;
    fit();
    overlay.scrollTop = 0;
  }

  window.portalCollectiveSheet = Object.freeze({ show, statusLabel, stageOf, STAGES });
})();
