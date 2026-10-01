// Cartão "Liberações coletivas" do painel (Meu portal): o engenheiro assina abonado / não abonado para
// todos da lista de uma vez; os demais perfis acompanham a situação e abrem a folha.
(() => {
  const esc = window.escapeHtml;
  const store = () => window.portalCollectiveStore;
  const actions = () => window.portalReleaseActions;
  const session = () => window.portalAuthDemo?.getSession();
  let sheets = [];
  let trash = [];
  // Uma só lixeira para tudo: o modo vem do painel principal (botão "Lixeira" da lista de liberações).
  const isTrashMode = () => !!window.portalIsTrashMode?.();
  let trashMode = false;
  let profile = "";
  // Só no perfil do DP (ou no painel do DP, para o administrador) se apaga de verdade no banco; nos demais perfis
  // "apagar da lixeira" só some do histórico de quem apagou.
  const canHard = () => actions().canHardDelete(profile === "dp");

  const section = () => document.querySelector("#collective-section");
  const dateLabel = (value) => String(value || "").split("-").reverse().join("/");

  // Mesma regra da liberação individual: quem já decidiu pode corrigir a própria decisão (clicando de novo desfaz).
  const sheetApi = () => window.portalCollectiveSheet;
  const stageOf = (sheet) => sheetApi().stageOf(sheet);
  const canDecide = (sheet) => profile === "engenheiro" && stageOf(sheet) !== "closed"
    && (!sheet.bonusStatus || String(sheet.engineer || "").trim().toLowerCase() === String(session()?.name || "").trim().toLowerCase());

  function row(sheet) {
    const id = esc(sheet.id);
    const decided = sheet.bonusStatus;
    const stage = stageOf(sheet);
    const stageInfo = sheetApi().STAGES[stage];
    const btn = (cls, action, label) => `<button class="${cls}" type="button" data-collective="${action}" data-id="${id}">${label}</button>`;
    const chip = (kind, html) => `<span class="sig-chip sig-${kind}">${html}</span>`;
    const chips = [];
    if (sheet.bonusRequest) chips.push(chip("info", `Pedido do encarregado: <b>${sheet.bonusRequest === "abonado" ? "Abonado" : "Não abonado"}</b>`));
    chips.push(decided
      ? chip(decided === "approved" ? "yes" : "no", `Eng. <b>${esc(sheet.engineer || "")}</b> · assinou como ${decided === "approved" ? "abonado" : "não abonado"}`)
      : chip("wait", `Engenheiro: aguardando${sheet.targetEngineer ? ` (${esc(sheet.targetEngineer)})` : ""}`));
    chips.push(sheet.dpSigner
      ? chip(stage === "closed" ? "no" : "yes", `DP <b>${esc(sheet.dpSigner)}</b> · ${stage === "closed" ? "negou" : "assinou"}`)
      : chip("wait", "DP: aguardando"));
    if (sheet.exitConfirmedBy) chips.push(chip("info", `Portaria <b>${esc(sheet.exitConfirmedBy)}</b> · assinou`));
    else if (stage === "gate") chips.push(chip("wait", "Portaria: aguardando saída"));

    const engineerButtons = canDecide(sheet)
      ? `${btn("row-yes-btn", "approved", decided === "approved" ? "Abonado ✓" : "Abonado")}${btn("row-no-btn", "denied", decided === "denied" ? "Não abonado ✓" : "Não abonado")}`
      : "";
    // O DP pode autorizar ou negar mesmo com a folha ainda aguardando o engenheiro (como nas individuais).
    const dpButtons = profile === "dp" && ["engineer", "dp"].includes(stage)
      ? `${btn("row-yes-btn", "authorize", "Autorizar saída")}${btn("row-no-btn", "deny", "Negar")}`
      : "";
    const gateButtons = profile === "portaria" && stage === "gate" && actions().canConfirmExit()
      ? btn("gate-confirm-btn", "confirm-exit", "Confirmar saída")
      : "";
    const view = btn("release-view-btn", "view", "Visualizar folha");
    const buttons = trashMode
      ? `${btn("row-yes-btn", "restore", "Restaurar")}${view}${btn("row-delete-btn", "purge", canHard() ? "Apagar do banco" : "Apagar de vez")}`
      : `${gateButtons}${dpButtons}${engineerButtons}${view}${btn("row-delete-btn", "trash", "Apagar")}`;
    const people = (sheet.participants || []).length;
    return `<tr>
      <td data-label="Liberação" class="col-who"><strong>${esc(sheet.motive || "Sem motivo")}</strong><small class="row-role">Liberação coletiva · ${people} ${people === 1 ? "colaborador" : "colaboradores"}</small><small class="row-who">Solicitante: ${esc(sheet.requester || "—")}</small><small class="row-meta">${esc(dateLabel(sheet.date))}</small><div class="sig-chips">${chips.join("")}</div></td>
      <td data-label="Frente" class="col-frente">Coletiva</td>
      <td data-label="Horário" class="col-horario">${esc(sheet.time || "—")}</td>
      <td data-label="Status" class="col-status"><span class="status-badge status-${stageInfo.tone}">${esc(stageInfo.label)}</span></td>
      <td class="text-end row-actions col-actions" data-label="Ação">${buttons}</td>
    </tr>`;
  }

  // Coloca as coletivas apagadas na tabela da lixeira (a mesma das individuais).
  function injectTrashRows() {
    const tbody = document.querySelector("#records-table");
    if (!tbody) return;
    tbody.querySelectorAll("tr[data-ctrash]").forEach((tr) => tr.remove());
    if (!isTrashMode()) return;
    trashMode = true;
    const query = window.normalizeSearchText(document.querySelector("#records-search")?.value || "");
    const rows = trash.filter((sheet) => !query || window.normalizeSearchText(sheet.motive).includes(query));
    if (rows.length) {
      tbody.querySelector("td.empty-state")?.closest("tr")?.remove();
      tbody.insertAdjacentHTML("beforeend", rows.map(row).join("").replace(/<tr>/g, "<tr data-ctrash>"));
    } else if (!tbody.querySelector("tr")) {
      tbody.innerHTML = '<tr data-ctrash><td colspan="5" class="empty-state">A lixeira está vazia.</td></tr>';
    }
  }

  async function render(profileKey) {
    profile = profileKey;
    const el = section();
    if (!el) return;
    if (!store()) {
      el.hidden = true;
      el.parentElement.classList.remove("has-collective");
      document.querySelector("#portal-view-tabs").hidden = true;
      setView("individual");
      return;
    }
    let loadFailed = false;
    try {
      const all = await store().getAll();
      sheets = store().visibleFor(all);
      trash = store().trashFor(all);
    } catch (error) {
      // O painel continua aparecendo, dizendo que não deu para carregar (ex.: sem internet ou regras do banco).
      console.warn("Não foi possível carregar as liberações coletivas.", error);
      sheets = [];
      trash = [];
      loadFailed = true;
    }
    trashMode = isTrashMode();
    // O painel e o seletor aparecem sempre (mesmo sem folhas, para mostrar "Nenhuma liberação coletiva").
    // Uma só lixeira: com ela aberta, as coletivas apagadas entram na tabela da lixeira e o cartão some.
    const showCard = !trashMode;
    el.hidden = !showCard;
    el.parentElement.classList.toggle("has-collective", showCard);
    const tabs = document.querySelector("#portal-view-tabs");
    tabs.hidden = !showCard;
    tabs.querySelector("#tab-coletiva-count").textContent = sheets.length || "";
    if (!showCard) setView("individual");
    // Mesmo título pequeno do cartão de cima (ex.: "Assinaturas pendentes" para o engenheiro), para os dois combinarem.
    const eyebrow = document.querySelector("#table-eyebrow")?.textContent;
    if (eyebrow) el.querySelector("#collective-eyebrow").textContent = eyebrow;
    // Atalho para criar uma nova liberação coletiva (a portaria só consulta, não cria).
    const newButton = el.querySelector("#collective-new");
    if (newButton) newButton.hidden = profileKey === "portaria";
    const shown = trashMode ? trash : sheets;
    el.querySelector("#collective-list").innerHTML = shown.length ? shown.map(row).join("") : `<tr><td colspan="5" class="empty-state">${trashMode ? "A lixeira está vazia." : loadFailed ? "Não foi possível carregar as liberações coletivas. Verifique a internet e atualize a página." : "Nenhuma liberação coletiva."}</td></tr>`;
    el.querySelector("#collective-count").textContent = `${shown.length} ${shown.length === 1 ? "folha" : "folhas"}`;
    injectTrashRows();
    window.portalToolbarRefresh?.();
  }

  const failBox = (title) => actions().ask({ title, message: "Verifique a internet e tente de novo.", okText: "OK", cancelText: null });

  // Tira UMA folha da lixeira de vez: o DP apaga do banco; os outros perfis só somem do próprio histórico.
  async function purge(sheet) {
    if (canHard()) await store().remove(sheet.id);
    else await store().addToList(sheet.id, "purgedFor", store().myId());
  }

  // Ações em lote vindas da barra única (Apagar tudo / Restaurar tudo / Esvaziar lixeira).
  async function bulk(kind, dpContext) {
    const list = trashMode ? trash : sheets;
    const me = store().myId();
    for (const sheet of list) {
      if (kind === "trash-all") await store().addToList(sheet.id, "hiddenFor", me);
      else if (kind === "restore-all") await store().removeFromList(sheet.id, "hiddenFor", me);
      else if (kind === "empty") {
        if (actions().canHardDelete(dpContext)) await store().remove(sheet.id);
        else await store().addToList(sheet.id, "purgedFor", me);
      }
    }
  }

  // DP autoriza/nega a saída e assina na folha; a portaria confirma a saída e assina (mesmos campos das individuais).
  async function dpOrGate(sheet, action) {
    const now = new Date().toISOString();
    const who = session();
    let changes;
    if (action === "confirm-exit") {
      changes = { stage: "exited", exitConfirmedBy: who?.name || "Portaria", exitConfirmedRole: who?.role || "Porteiro", exitConfirmedAt: now };
    } else {
      const authorize = action === "authorize";
      changes = { status: authorize ? "authorized" : "denied", stage: authorize ? "gate" : "closed", dpRole: who?.role || "Departamento Pessoal", dpSigner: who?.name || "Departamento Pessoal", dpDecisionAt: now };
    }
    try {
      await store().update(sheet.id, changes);
    } catch (error) {
      console.error(error);
      await failBox("Não foi possível salvar");
      return;
    }
    await render(profile);
  }

  async function decide(sheet, choice) {
    if (!await actions().ensureEngineerSignature()) return;
    const session_ = session();
    let changes;
    if (sheet.bonusStatus === choice) {
      // Clicar de novo no botão já marcado desfaz a decisão.
      const question = choice === "approved" ? "Deseja desfazer o abono?" : "Deseja desfazer o não abono?";
      if (!await actions().ask({ title: question, message: `${sheet.motive}\nA liberação coletiva volta a ficar sem decisão do engenheiro.`, okText: "Desfazer" })) return;
      changes = { bonusStatus: null, hours: "Pendente", engineer: null, engineerRole: null, engineerDecisionAt: null, engineerUndoneAt: new Date().toISOString(), engineerUndoneBy: session_?.name || "Engenheiro responsável" };
      // Se foi a decisão do engenheiro que mandou a folha para o DP, ela volta a aguardar o engenheiro.
      if (stageOf(sheet) === "dp") changes.stage = "engineer";
    } else {
      changes = { bonusStatus: choice, hours: choice === "approved" ? "Abonado" : "Não abonado", engineer: session_?.name || "Engenheiro responsável", engineerRole: session_?.role || "Engenheiro responsável", engineerDecisionAt: new Date().toISOString() };
      // Fluxo normal: o engenheiro decide primeiro e libera para o DP. Se o DP já autorizou, a etapa não muda.
      if (stageOf(sheet) === "engineer") changes.stage = "dp";
    }
    try {
      await store().update(sheet.id, changes);
    } catch (error) {
      console.error(error);
      await actions().ask({ title: "Não foi possível salvar a decisão", message: "Verifique a internet e tente de novo.", okText: "OK", cancelText: null });
      return;
    }
    await render(profile);
  }

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-collective]");
    if (!button) return;
    const sheet = [...sheets, ...trash].find((item) => item.id === button.dataset.id);
    if (!sheet) return;
    const action = button.dataset.collective;
    if (action === "view") window.portalCollectiveSheet.show(sheet);
    else if (action === "approved" || action === "denied") {
      button.disabled = true;
      await decide(sheet, action);
    } else if (action === "authorize" || action === "deny" || action === "confirm-exit") {
      button.disabled = true;
      await dpOrGate(sheet, action);
    } else if (action === "trash" || action === "restore" || action === "purge") {
      button.disabled = true;
      try {
        if (action === "trash") await store().addToList(sheet.id, "hiddenFor", store().myId());
        else if (action === "restore") await store().removeFromList(sheet.id, "hiddenFor", store().myId());
        else {
          const message = canHard() ? `${sheet.motive}\nIsto APAGA DO BANCO, para todos os perfis. Não tem como recuperar.` : `${sheet.motive}\nSome só do seu histórico.`;
          if (!await actions().ask({ title: "Apagar de vez?", message, okText: "Apagar" })) { button.disabled = false; return; }
          await purge(sheet);
        }
      } catch (error) {
        console.error(error);
        await failBox("Não foi possível concluir");
      }
      await render(profile);
    }
  });

  // Telas menores mostram um tipo por vez; as tabs só aparecem quando existe alguma folha coletiva.
  function setView(view) {
    document.querySelector("[data-collective-host]")?.setAttribute("data-view", view);
    document.querySelectorAll(".portal-view-tab").forEach((tab) => {
      const active = tab.dataset.view === view;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
  }
  document.querySelector("#portal-view-tabs")?.addEventListener("click", (event) => {
    const tab = event.target.closest(".portal-view-tab");
    if (tab) setView(tab.dataset.view);
  });

  window.portalCollectivePanel = Object.freeze({
    render,
    bulk,
    injectTrashRows,
    // O que está na lista agora (para a barra única contar e agir junto com as individuais).
    items: () => (isTrashMode() ? trash : sheets),
    counts: () => ({ visible: sheets.length, trash: trash.length })
  });
})();
