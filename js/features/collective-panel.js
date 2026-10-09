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
  // Caixa "Concluídas", também comandada pelo painel principal.
  const isDoneMode = () => !!window.portalIsDoneMode?.();
  let doneCount = 0;
  // Folhas da lista como está na tela (com filtros), para "Apagar tudo" agir só nelas.
  let shownSheets = [];
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
  const canDecide = (sheet) => profile === "engenheiro" && !["closed", "foreman"].includes(stageOf(sheet))
    && (!sheet.bonusStatus || String(sheet.engineer || "").trim().toLowerCase() === String(session()?.name || "").trim().toLowerCase());

  function row(sheet) {
    const id = esc(sheet.id);
    const decided = sheet.bonusStatus;
    const stage = stageOf(sheet);
    // Retroativa (data anterior ao dia em que foi criada): sem autorização de saída do DP e sem portaria.
    const retroactive = sheetApi().isRetroactive(sheet);
    const stageInfo = sheetApi().STAGES[stage];
    const busyKind = pending.get(sheet.id);
    const busyText = { trash: "Movendo para a lixeira…", restore: "Restaurando…", purge: "Apagando…" };
    const btn = (cls, action, label) => {
      const mine = busyKind && action === busyKind;
      return `<button class="${cls}" type="button" data-collective="${action}" data-id="${id}"${busyKind ? " disabled" : ""}>${mine ? `<span class="button-spinner" aria-hidden="true"></span>${busyText[busyKind]}` : label}</button>`;
    };
    const chip = (kind, html) => `<span class="sig-chip sig-${kind}">${html}</span>`;
    const chips = [];
    if (sheet.bonusRequest) chips.push(chip("info", `Pedido do encarregado: <b>${sheet.bonusRequest === "abonado" ? "Abonado" : "Não abonado"}</b>`));
    chips.push(decided
      ? chip(decided === "approved" ? "yes" : "no", `Eng. <b>${esc(sheet.engineer || "")}</b> · assinou como ${decided === "approved" ? "abonado" : "não abonado"}`)
      : chip("wait", `Engenheiro: aguardando${sheet.targetEngineer ? ` (${esc(sheet.targetEngineer)})` : ""}`));
    chips.push(sheet.dpSigner
      ? chip(stage === "closed" ? "no" : "yes", `DP <b>${esc(sheet.dpSigner)}</b> · ${stage === "closed" ? "negou" : "assinou"}`)
      : retroactive ? chip("info", "Retroativa · sem autorização de saída nem portaria") : chip("wait", "DP: aguardando"));
    if (sheet.abonoLaunchedAt) chips.push(chip("yes", `Abono lançado no RM · <b>${esc(sheet.abonoLaunchedBy || "DP")}</b>`));
    else if (decided === "approved" && profile === "dp") chips.push(chip("wait", "Abono: por lançar no RM"));
    if (sheet.exitConfirmedBy) chips.push(chip("info", `Portaria <b>${esc(sheet.exitConfirmedBy)}</b> · assinou`));
    else if (stage === "gate") {
      // A portaria marca a saída de cada colaborador; a folha só fecha quando todos saírem.
      const out = sheetApi().exitedCount(sheet);
      const total = (sheet.participants || []).length;
      chips.push(chip(out ? "info" : "wait", `Portaria: <b>${out} de ${total}</b> ${out === 1 ? "saiu" : "saíram"}`));
    }
    // Digitais dos colaboradores: o DP sempre vê quantos faltam; os outros perfis só depois que alguém assinou.
    const people = (sheet.participants || []).length;
    const signedBio = sheetApi().signedCount(sheet);
    if (people && (signedBio || profile === "dp")) chips.push(chip(signedBio === people ? "yes" : "wait", `Digitais: <b>${signedBio} de ${people}</b>`));

    if (stage === "foreman") {
      chips.length = 0;
      chips.push(chip("no", `Recusada por <b>${esc(sheet.refusedBy || "")}</b>${sheet.refusalReason ? ` · ${esc(sheet.refusalReason)}` : ""}`));
    }
    const engineerButtons = canDecide(sheet)
      ? `${btn("row-yes-btn", "approved", decided === "approved" ? "Abonado ✓" : "Abonado")}${btn("row-no-btn", "denied", decided === "denied" ? "Não abonado ✓" : "Não abonado")}`
      : "";
    // O DP pode autorizar ou negar mesmo com a folha ainda aguardando o engenheiro (como nas individuais).
    const dpButtons = profile === "dp" && ["engineer", "dp"].includes(stage) && !retroactive
      ? `${btn("row-yes-btn", "authorize", "Autorizar saída")}${btn("row-no-btn", "dp-refuse", "Recusar")}`
      : "";
    // Coleta das digitais dos colaboradores (leitor Hamster DX), no DP, inclusive depois da saída confirmada na portaria.
    const bioButton = profile === "dp" && window.portalCollectiveBiometric && ["engineer", "dp", "gate", "exited", "registered"].includes(stage) && signedBio < people
      ? btn("row-bio-btn", "bio", "Assinar com digital")
      : "";
    const gateButtons = profile === "portaria" && stage === "gate" && actions().canConfirmExit()
      ? btn("gate-confirm-btn", "exits", "Confirmar saídas")
      : "";
    // Recusar: só enquanto o engenheiro ainda não decidiu o abono (mesma regra das individuais).
    const refuseButton = profile === "engenheiro" && !decided && ["engineer", "dp", "gate", "registered"].includes(stage) ? btn("row-no-btn", "refuse", "Recusar") : "";
    // Folha recusada volta para quem solicitou ajustar e reenviar.
    const mine = sheet.createdByUid === session()?.uid || session()?.roleValue === "administrador-analista";
    const editButton = stage === "foreman" && mine ? `<a class="table-action" href="Liberacao-Coletiva.html?edit=${id}">Editar e reenviar</a>` : "";
    const view = btn("release-view-btn", "view", "Visualizar folha");
    const buttons = trashMode
      ? `${btn("row-yes-btn", "restore", "Restaurar")}${view}${btn("row-delete-btn", "purge", canHard() ? "Apagar do banco" : "Apagar de vez")}`
      : `${gateButtons}${bioButton}${dpButtons}${engineerButtons}${refuseButton}${editButton}${view}${btn("row-delete-btn", "trash", "Apagar")}`;
    return `<tr>
      <td data-label="Liberação" class="col-who"><strong>${esc(sheet.motive || "Sem motivo")}</strong><small class="row-role">Liberação coletiva · ${people} ${people === 1 ? "colaborador" : "colaboradores"}</small><small class="row-who">Solicitante: ${esc(sheet.requester || "—")}</small><small class="row-meta">${esc(dateLabel(sheet.date))}</small>${window.portalCreatedLabel?.(sheet.createdAt) || ""}<div class="sig-chips">${chips.join("")}</div></td>
      <td data-label="Frente" class="col-frente">Coletiva</td>
      <td data-label="Horário" class="col-horario">${esc(sheet.time || "—")}</td>
      <td data-label="Status" class="col-status"><span class="status-badge status-${stageInfo.tone}">${esc(stageInfo.label)}</span>${!isDoneMode() && sheetApi().isConcluded(sheet) ? '<small class="row-concluded">✓ Concluída</small>' : ""}</td>
      <td class="text-end row-actions col-actions" data-label="Ação">${buttons}</td>
    </tr>`;
  }

  // Coloca as coletivas apagadas na tabela da lixeira (a mesma das individuais).
  function injectTrashRows() {
    const tbody = document.querySelector("#records-table");
    if (!tbody) return;
    if (!isTrashMode()) {
      tbody.querySelectorAll("tr[data-ctrash]").forEach((tr) => tr.remove());
      delete tbody.dataset.ctrashHtml;
      return;
    }
    trashMode = true;
    const query = window.normalizeSearchText(document.querySelector("#records-search")?.value || "");
    const rows = trash.filter((sheet) => !query || window.normalizeSearchText(sheet.motive).includes(query));
    const html = rows.map(row).join("").replace(/<tr>/g, "<tr data-ctrash>");
    // Já está igual na tela: não mexe (trocar os botões no meio de um clique fazia o clique se perder).
    if (tbody.dataset.ctrashHtml === html && (!rows.length || tbody.querySelector("tr[data-ctrash]"))) return;
    tbody.querySelectorAll("tr[data-ctrash]").forEach((tr) => tr.remove());
    tbody.dataset.ctrashHtml = html;
    if (rows.length) {
      tbody.querySelector("td.empty-state")?.closest("tr")?.remove();
      tbody.insertAdjacentHTML("beforeend", html);
    } else if (!tbody.querySelector("tr")) {
      tbody.innerHTML = '<tr data-ctrash><td colspan="5" class="empty-state">A lixeira está vazia.</td></tr>';
    }
  }

  async function render(profileKey) {
    profile = profileKey;
    // Mesma ordem padrão das individuais: o engenheiro vê primeiro as pendentes de abono.
    window.portalSortFilter?.setDefault(document.querySelector("#collective-search"), profileKey === "engenheiro" ? "unbonusedRecent" : "recent");
    const el = section();
    if (!el) return;
    if (!store()) {
      el.hidden = true;
      el.parentElement.classList.remove("has-collective");
      document.querySelector("#portal-view-tabs").hidden = true;
      setView("individual");
      return;
    }
    loadFailed = false;
    try {
      const all = await store().getAll();
      sheets = store().visibleFor(all, profileKey);
      trash = store().trashFor(all, profileKey);
    } catch (error) {
      // O painel continua aparecendo, dizendo que não deu para carregar (ex.: sem internet ou regras do banco).
      console.warn("Não foi possível carregar as liberações coletivas.", error);
      sheets = [];
      trash = [];
      loadFailed = true;
    }
    draw();
  }

  let loadFailed = false;
  let lastListHtml = "";
  // Paginação (mesma das individuais). Criada na primeira vez que a lista é desenhada.
  let listPager = null;
  const pager = () => listPager || (listPager = window.portalPagination?.create({
    key: "coletivas",
    after: section().querySelector(".table-responsive"),
    search: document.querySelector("#collective-search"),
    onChange: () => draw()
  }));
  // id da folha -> ação ainda em gravação ("trash" | "restore" | "purge").
  const pending = new Map();

  // Desenha a partir do que já está carregado (usado também pelas ações instantâneas).
  function draw() {
    const el = section();
    if (!el) return;
    const profileKey = profile;
    trashMode = isTrashMode();
    // O painel e o seletor aparecem sempre (mesmo sem folhas, para mostrar "Nenhuma liberação coletiva").
    // Uma só lixeira: com ela aberta, as coletivas apagadas entram na tabela da lixeira e o cartão some.
    const showCard = !trashMode;
    el.hidden = !showCard;
    el.parentElement.classList.toggle("has-collective", showCard);
    const tabs = document.querySelector("#portal-view-tabs");
    tabs.hidden = !showCard;
    if (!showCard) setView("individual");
    // Mesmo título pequeno do cartão de cima (ex.: "Assinaturas pendentes" para o engenheiro), para os dois combinarem.
    const eyebrow = document.querySelector("#table-eyebrow")?.textContent;
    if (eyebrow) el.querySelector("#collective-eyebrow").textContent = eyebrow;
    // Atalho para criar uma nova liberação coletiva (a portaria só consulta, não cria).
    const newButton = el.querySelector("#collective-new");
    if (newButton) newButton.hidden = profileKey === "portaria";
    const newIndividual = el.querySelector("#collective-new-individual");
    if (newIndividual) newIndividual.hidden = profileKey === "portaria";
    // Busca: colaborador da folha, motivo, solicitante, engenheiro/DP/portaria que assinou, data e situação.
    const searchEl = document.querySelector("#collective-search");
    const query = window.normalizeSearchText(searchEl?.value || "");
    // Situação da barra de filtros do perfil (js/core/filter-bar.js), separada da barra das individuais. Fora da lixeira.
    const filterBar = !trashMode && window.portalFilterBar?.active() ? window.portalFilterBar : null;
    const byStatus = !!filterBar && filterBar.status(searchEl) !== "all";
    // Caixa "Concluídas" (botão da barra única, como a lixeira): as concluídas saem da lista e só aparecem nela.
    // Com uma Situação escolhida, a lista mostra tudo o que entra no número do cartão, inclusive as concluídas.
    const doneMode = !trashMode && isDoneMode();
    const concluded = sheetApi().isConcluded;
    doneCount = sheets.filter(concluded).length;
    const base = trashMode ? trash : doneMode ? sheets.filter(concluded) : byStatus ? sheets : sheets.filter((sheet) => !concluded(sheet));
    // Busca por texto + filtro por data (De/Até ao lado da busca).
    const filtered = base.filter((sheet) => {
      if (byStatus && !filterBar.matchesStatus(searchEl, sheet, stageOf(sheet), true)) return false;
      if (!window.portalDateFilter.matches(searchEl, window.portalDateFilter.dayOf(sheet))) return false;
      if (!query) return true;
      return window.normalizeSearchText([
        sheet.motive, sheet.requester, sheet.foreman, sheet.targetEngineer, sheet.engineer, sheet.dpSigner, sheet.exitConfirmedBy, sheet.date,
        window.portalCollectiveSheet.statusLabel(sheet), ...(sheet.participants || []).flatMap((person) => [person.nome, person.matricula, person.funcao])
      ].filter(Boolean).join(" ")).includes(query);
    });
    // Ordenação (seletor ao lado da busca das coletivas).
    const shown = window.portalSortFilter.sort(filtered, searchEl, {
      createdAt: (sheet) => String(sheet.createdAt || sheet.date || ""),
      stage: (sheet) => stageOf(sheet),
      name: (sheet) => sheet.motive || "",
      bonus: (sheet) => sheet.bonusStatus || ""
    });
    shownSheets = shown;
    const pageItems = pager() ? pager().slice(shown) : shown;
    const listHtml = shown.length ? pageItems.map(row).join("") : `<tr><td colspan="5" class="empty-state">${(query || byStatus || !window.portalDateFilter.matches(searchEl, "")) ? "Nenhuma liberação coletiva encontrada para os filtros." : trashMode ? "A lixeira está vazia." : doneMode ? "Nenhuma liberação coletiva concluída ainda." : loadFailed ? "Não foi possível carregar as liberações coletivas. Verifique a internet e atualize a página." : "Nenhuma liberação coletiva."}</td></tr>`;
    // Só troca o conteúdo se mudou: a tela inicial redesenha sozinha quando chegam dados novos, e trocar os botões no
    // meio de um clique fazia o clique se perder.
    if (listHtml !== lastListHtml) {
      el.querySelector("#collective-list").innerHTML = listHtml;
      lastListHtml = listHtml;
    }
    injectTrashRows();
    refreshStats();
    window.portalToolbarRefresh?.();
  }

  // Cartões de resumo do Meu portal: as liberações coletivas entram na conta, com as mesmas regras das individuais.
  // Aqui só separa as folhas de cada cartão; quem soma e escreve os cartões é o portal (window.portalWriteStats).
  function refreshStats() {
    const me = session();
    const foremanRoles = ["encarregado", "estagiario_engenharia", "analista", "seguranca_trabalho"];
    // Encarregado/estagiário/segurança contam só o que eles mesmos solicitaram.
    const mine = foremanRoles.includes(profile) ? sheets.filter((sheet) => sheet.createdByUid === me?.uid) : sheets;
    const open = (sheet) => !["foreman", "closed"].includes(stageOf(sheet));
    const day = (value) => {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? "" : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    };
    const today = day(Date.now());
    const extra = { pending: [], approved: [], bonus: [], stageOf };
    if (profile === "engenheiro") extra.pending = mine.filter((sheet) => !sheet.bonusStatus && open(sheet));
    else if (profile === "dp") extra.pending = mine.filter((sheet) => stageOf(sheet) === "dp");
    else if (profile !== "portaria") extra.pending = mine.filter((sheet) => ["engineer", "foreman", "dp"].includes(stageOf(sheet)));
    extra.approved = mine.filter((sheet) => ["gate", "exited"].includes(stageOf(sheet)) && day(sheet.dpDecisionAt) === today);
    if (profile !== "portaria") extra.bonus = mine.filter((sheet) => !sheet.bonusStatus && open(sheet));
    // Abono no RM: as coletivas abonadas também são lançadas pelo DP (cartão "Abonos lançados").
    extra.launched = mine.filter((sheet) => !!sheet.abonoLaunchedAt);
    extra.toLaunch = mine.filter((sheet) => sheet.bonusStatus === "approved" && !sheet.abonoLaunchedAt && open(sheet));
    window.portalWriteStats?.(extra);
  }

  const failBox = (title, error) => actions().ask({ title, message: `Verifique a internet e tente de novo.${error?.code ? `\n(código: ${error.code})` : ""}`, okText: "OK", cancelText: null });

  // Mensagem curta no pé da tela ("Folha movida para a lixeira ✓"), para a pessoa saber que deu certo.
  let toastTimer = null;
  function toast(text, ok = true) {
    let el = document.querySelector("#collective-toast");
    if (!el) {
      document.body.insertAdjacentHTML("beforeend", '<div id="collective-toast" class="collective-toast" role="status" aria-live="polite" hidden></div>');
      el = document.querySelector("#collective-toast");
    }
    el.textContent = text;
    el.classList.toggle("is-error", !ok);
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 3500);
  }

  // Apagar / restaurar / apagar de vez: a linha mostra "Salvando…" (botões travados) até o servidor confirmar; só então a folha
  // muda de lugar e aparece o aviso de que deu certo. Se o servidor recusar, a folha fica onde estava e avisa o motivo.
  async function mutate(kind, sheet) {
    const me = store().myId();
    pending.set(sheet.id, kind);
    draw();
    try {
      if (kind === "trash") await store().addToList(sheet.id, "hiddenFor", me);
      else if (kind === "restore") await store().removeFromList(sheet.id, "hiddenFor", me);
      else await purge(sheet);
    } catch (error) {
      console.error(error);
      pending.delete(sheet.id);
      draw();
      toast("Não foi possível concluir. Nada foi alterado.", false);
      await failBox("Não foi possível concluir", error);
      return;
    }
    const without = (list) => list.filter((item) => item.id !== sheet.id);
    if (kind === "trash") { sheets = without(sheets); trash = [{ ...sheet, hiddenFor: [...(sheet.hiddenFor || []), me] }, ...trash]; }
    else if (kind === "restore") { trash = without(trash); sheets = [{ ...sheet, hiddenFor: (sheet.hiddenFor || []).filter((id) => id !== me) }, ...sheets]; }
    else { trash = without(trash); }
    pending.delete(sheet.id);
    draw();
    toast(kind === "trash" ? "Folha movida para a lixeira ✓" : kind === "restore" ? "Folha restaurada ✓" : (canHard() ? "Folha apagada do banco ✓" : "Folha apagada do seu histórico ✓"));
  }

  // Tira UMA folha da lixeira de vez: o DP apaga do banco; os outros perfis só somem do próprio histórico.
  async function purge(sheet) {
    if (canHard()) await store().remove(sheet.id);
    else await store().addToList(sheet.id, "purgedFor", store().myId());
  }

  // Ações em lote vindas da barra única (Apagar tudo / Restaurar tudo / Esvaziar lixeira).
  async function bulk(kind, dpContext) {
    const list = trashMode ? trash : shownSheets;
    const me = store().myId();
    await Promise.all(list.map((sheet) => {
      if (kind === "trash-all") return store().addToList(sheet.id, "hiddenFor", me);
      if (kind === "restore-all") return store().removeFromList(sheet.id, "hiddenFor", me);
      if (kind === "empty") return actions().canHardDelete(dpContext) ? store().remove(sheet.id) : store().addToList(sheet.id, "purgedFor", me);
      return null;
    }));
  }

  // DP autoriza/nega a saída e assina na folha (a saída na portaria é um por um, em js/features/collective-exit.js).
  async function dpOrGate(sheet, action) {
    const now = new Date().toISOString();
    const who = session();
    const authorize = action === "authorize";
    const changes = { status: authorize ? "authorized" : "denied", stage: authorize ? "gate" : "closed", dpRole: who?.role || "Departamento Pessoal", dpSigner: who?.name || "Departamento Pessoal", dpDecisionAt: now };
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
    if (action === "view") window.portalCollectiveSheet.show(sheet, { dpContext: profile === "dp", onChange: () => render(profile) });
    else if (action === "bio") window.portalCollectiveBiometric?.open(sheet, () => render(profile));
    else if (action === "exits") window.portalCollectiveExit?.open(sheet, () => render(profile));
    else if (action === "approved" || action === "denied") {
      button.disabled = true;
      await decide(sheet, action);
    } else if (action === "refuse" || action === "dp-refuse") {
      // Engenheiro ou DP recusam do mesmo jeito: a folha volta ao solicitante com os motivos, para ajustar e reenviar.
      const byDp = action === "dp-refuse";
      if (!byDp && !await actions().ensureEngineerSignature()) return;
      const who = session();
      actions().openRefuseDialog(sheet, () => render(profile), {
        target: `Liberação coletiva: ${sheet.motive} · solicitada por ${sheet.requester}`,
        refuse: (reasons) => store().update(sheet.id, {
          stage: "foreman",
          status: "pending",
          bonusStatus: null,
          hours: "Pendente",
          // Se o DP já tinha autorizado, a autorização cai: ele decide de novo depois do reenvio.
          dpSigner: null,
          dpRole: null,
          dpDecisionAt: null,
          refusedBy: who?.name || (byDp ? "Departamento Pessoal" : "Engenheiro responsável"),
          refusedByRole: byDp ? "DP" : "Engenheiro",
          refusedAt: new Date().toISOString(),
          refusalReasons: reasons,
          refusalReason: reasons.join(" e ")
        })
      });
    } else if (action === "authorize" || action === "deny") {
      button.disabled = true;
      await dpOrGate(sheet, action);
    } else if (action === "trash" || action === "restore" || action === "purge") {
      // Mesmas perguntas das liberações individuais.
      const named = { name: `"${sheet.motive}" (liberação coletiva · ${(sheet.participants || []).length} colaboradores)` };
      if (action === "trash") {
        if (!await actions().confirmText(`Mover para a lixeira?\n\nLiberação coletiva: ${sheet.motive}\n${(sheet.participants || []).length} colaboradores · você pode restaurar depois. Some só da sua tela inicial.`, "Mover para a lixeira")) return;
      } else if (action === "purge") {
        if (!await actions().confirmText(actions().emptyQuestion(1, named, profile === "dp"), "Apagar")) return;
        // Apagar do banco (DP/Admin) pede uma segunda confirmação: não tem volta.
        if (canHard() && !await actions().confirmText(`ÚLTIMO AVISO\nA liberação coletiva "${sheet.motive}" será APAGADA DO BANCO DE DADOS agora.\nIsso NÃO pode ser desfeito.`, "Apagar do banco")) return;
      }
      await mutate(action, sheet);
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
  // Busca da lista coletiva: filtra enquanto digita.
  document.querySelector("#collective-search")?.addEventListener("input", () => draw());
  document.querySelector("#portal-view-tabs")?.addEventListener("click", (event) => {
    const tab = event.target.closest(".portal-view-tab");
    if (tab) setView(tab.dataset.view);
  });

  window.portalCollectivePanel = Object.freeze({
    render,
    refreshStats,
    bulk,
    injectTrashRows,
    // O que está na lista agora (para a barra única contar e agir junto com as individuais).
    items: () => (isTrashMode() ? trash : shownSheets),
    counts: () => ({ visible: shownSheets.length, trash: trash.length, done: doneCount })
  });
})();
