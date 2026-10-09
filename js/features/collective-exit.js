// Saída dos colaboradores de uma liberação coletiva, na portaria: nem todo mundo sai junto (um ainda está no
// vestiário...), então a portaria marca cada um quando ele passa ("Saiu") e só depois de todos marcados confirma
// a saída da folha inteira. Cada saída fica gravada com a hora e quem confirmou (participantExits.{matricula}).
// Uso: window.portalCollectiveExit.open(sheet, aoFechar)
(() => {
  const esc = (value) => window.escapeHtml(value);
  const sheetApi = () => window.portalCollectiveSheet;
  const store = () => window.portalCollectiveStore;
  const session = () => window.portalAuthDemo?.getSession();

  let dialog = null;
  let current = null;
  let onClose = null;
  let changed = false;
  let busy = "";             // matrícula sendo salva agora ("*" = confirmando a folha inteira)
  let error = "";

  const formatTime = (value) => {
    const date = value ? new Date(value) : null;
    return !date || Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  function ensureDialog() {
    if (dialog) return dialog;
    document.body.insertAdjacentHTML("beforeend", `
      <dialog id="collective-exit-dialog" class="refuse-dialog collective-bio-dialog" aria-labelledby="collective-exit-title">
        <h2 id="collective-exit-title">Saída dos colaboradores</h2>
        <p id="collective-exit-sub" class="collective-bio-sub"></p>
        <p class="collective-exit-help">Toque em <b>Saiu</b> quando cada colaborador passar pela portaria. A saída da folha só é confirmada depois que todos saírem.</p>
        <p id="collective-exit-error" class="collective-bio-notice" hidden></p>
        <ul id="collective-exit-list" class="collective-bio-list"></ul>
        <div class="refuse-buttons collective-exit-buttons">
          <button type="button" id="collective-exit-close" class="bonus-no">Fechar</button>
          <button type="button" id="collective-exit-all" class="bonus-yes"></button>
        </div>
      </dialog>`);
    dialog = document.querySelector("#collective-exit-dialog");
    dialog.querySelector("#collective-exit-close").addEventListener("click", () => dialog.close());
    dialog.querySelector("#collective-exit-all").addEventListener("click", confirmAll);
    dialog.addEventListener("cancel", (event) => { if (busy) event.preventDefault(); });
    dialog.addEventListener("close", () => { if (changed) onClose?.(); });
    dialog.querySelector("#collective-exit-list").addEventListener("click", (event) => {
      const mark = event.target.closest("[data-exit-mark]");
      const undo = event.target.closest("[data-exit-undo]");
      if (mark) markExit(mark.dataset.exitMark, true);
      else if (undo) markExit(undo.dataset.exitUndo, false);
    });
    return dialog;
  }

  function draw() {
    const people = current.participants || [];
    const out = sheetApi().exitedCount(current);
    const missing = people.length - out;
    dialog.querySelector("#collective-exit-sub").textContent = `${current.motive || "Liberação coletiva"} · ${out} de ${people.length} ${out === 1 ? "saiu" : "saíram"}`;
    const errorBox = dialog.querySelector("#collective-exit-error");
    errorBox.hidden = !error;
    errorBox.textContent = error;
    dialog.querySelector("#collective-exit-close").disabled = !!busy;
    const all = dialog.querySelector("#collective-exit-all");
    all.disabled = !!busy || missing > 0;
    all.innerHTML = busy === "*"
      ? '<span class="button-spinner" aria-hidden="true"></span>Confirmando…'
      : missing > 0 ? `Faltam ${missing} para sair` : `Confirmar saída de todos (${people.length})`;
    dialog.querySelector("#collective-exit-list").innerHTML = people.map((person, index) => {
      const exit = sheetApi().exitOf(current, person);
      const mat = esc(person.matricula);
      const action = exit
        ? `<span class="collective-exit-done"><span class="collective-bio-done">✓ Saiu ${esc(formatTime(exit.at))}</span><button type="button" class="collective-exit-undo" data-exit-undo="${mat}"${busy ? " disabled" : ""}>Desfazer</button></span>`
        : `<button type="button" class="row-yes-btn" data-exit-mark="${mat}"${busy ? " disabled" : ""}>${busy === person.matricula ? '<span class="button-spinner" aria-hidden="true"></span>Salvando…' : "Saiu"}</button>`;
      return `<li class="${exit ? "is-out" : ""}">
        <span class="collective-bio-who"><strong>${index + 1}. ${esc(person.nome)}</strong><small>${esc(person.funcao || "")}${person.funcao ? " · " : ""}Matrícula ${mat}</small></span>
        ${action}
      </li>`;
    }).join("");
  }

  // Marca (ou desmarca, se a portaria tocou errado) a saída de um colaborador.
  async function markExit(matricula, out) {
    if (busy || !current) return;
    busy = matricula;
    error = "";
    draw();
    const who = session();
    const value = out ? { at: new Date().toISOString(), by: who?.name || "Portaria", byRole: who?.role || "Porteiro" } : null;
    try {
      await store().markExit(current.id, matricula, value);
      const exits = { ...(current.participantExits || {}) };
      if (value) exits[matricula] = value; else delete exits[matricula];
      current.participantExits = exits;
      changed = true;
    } catch (err) {
      console.error(err);
      error = "Não foi possível salvar. Verifique a internet e tente de novo.";
    } finally {
      busy = "";
      draw();
    }
  }

  // Com todos marcados: a folha passa para "Saída confirmada" e a portaria assina.
  async function confirmAll() {
    const people = current?.participants || [];
    if (busy || !current || sheetApi().exitedCount(current) < people.length) return;
    busy = "*";
    error = "";
    draw();
    const who = session();
    const changes = { stage: "exited", exitConfirmedBy: who?.name || "Portaria", exitConfirmedRole: who?.role || "Porteiro", exitConfirmedAt: new Date().toISOString() };
    try {
      await store().update(current.id, changes);
      Object.assign(current, changes);
      changed = true;
      busy = "";
      dialog.close();
    } catch (err) {
      console.error(err);
      error = "Não foi possível confirmar a saída. Verifique a internet e tente de novo.";
      busy = "";
      draw();
    }
  }

  function open(sheet, afterClose) {
    ensureDialog();
    current = { ...sheet, participantExits: { ...(sheet.participantExits || {}) } };
    onClose = afterClose;
    changed = false;
    busy = "";
    error = "";
    draw();
    dialog.showModal();
  }

  window.portalCollectiveExit = Object.freeze({ open });
})();
