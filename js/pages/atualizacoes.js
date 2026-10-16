// Página de atualizações: os avisos que o administrador escreve, com palavras simples, sobre o que mudou no portal
// (principalmente no fluxo), para todo mundo entender. Ficam na coleção "announcements"; o mais novo também aparece
// numa janela com OK para todas as contas (ver shared-components.js).
// O administrador tem "+ Novo aviso" e, em cada aviso, "Editar" e "Apagar", e escolhe para quem é o aviso: todos ou
// só alguns perfis (DP, engenheiros, encarregados...). Cada pessoa só vê os avisos do perfil dela; quem não entrou na
// conta vê só os que são para todos. O administrador vê todos, com a etiqueta de para quem foi.
// Contra excesso de avisos (cada um abre uma janela para todos): no mínimo 30 minutos entre um e outro e no máximo 3
// por dia. Quem garante são as regras do banco (firestore.rules, "announcementLimits"); aqui a tela só avisa antes.
(function updatesPage() {
  const NEW_DAYS = 3;
  const MIN_GAP_MS = 30 * 60 * 1000;
  const MAX_PER_DAY = 3;

  const list = document.getElementById("updates-list");
  const status = document.getElementById("updates-status");
  const newButton = document.getElementById("updates-new");
  const updates = window.portalUpdates;
  const escape = updates.escape;
  const db = window.portalFirebaseDb;
  let announcements = []; // [{ id, ...dados }]
  let isAdmin = false;
  let session = null;

  const { millisOf } = updates;
  const formatDate = (value) => new Date(millisOf(value)).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const isNew = (value) => Date.now() - millisOf(value) < NEW_DAYS * 24 * 60 * 60 * 1000;
  const formatTime = (ms) => new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const limitRef = () => db.collection("announcementLimits").doc("geral");

  function render() {
    const visible = announcements.filter((item) => updates.isFor(item, session));
    list.innerHTML = visible.map((item) => `
      <li class="update-item">
        <div class="update-meta">
          <time datetime="${escape(new Date(millisOf(item.postedAt)).toISOString())}">${escape(formatDate(item.postedAt))}</time>
          ${isNew(item.postedAt) ? '<span class="update-new">Novo</span>' : ""}
          ${isAdmin || !updates.audienceOf(item).includes("todos") ? `<span class="update-audience">Para: ${escape(updates.audienceLabel(item))}</span>` : ""}
        </div>
        <h2>${escape(item.title)}</h2>
        ${item.body ? `<div class="update-body">${updates.bodyHtml(item.body)}</div>` : ""}
        ${isAdmin ? `<div class="update-admin-actions">
          <button class="update-announce" type="button" data-edit="${escape(item.id)}">Editar</button>
          <button class="update-announce is-danger" type="button" data-delete="${escape(item.id)}">Apagar</button>
        </div>` : ""}
      </li>`).join("");
    status.textContent = visible.length
      ? "As novidades mais recentes aparecem primeiro."
      : "Nenhuma novidade por enquanto.";
  }

  async function load() {
    try {
      const snapshot = await db.collection("announcements").limit(200).get();
      announcements = updates.sortNewest(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      render();
    } catch (error) {
      console.error(error);
      status.textContent = "Não foi possível carregar as atualizações agora. Tente de novo em alguns minutos.";
    }
  }

  // Janela do administrador para escrever (ou ajustar) um aviso.
  function openComposer({ title = "", body = "", audience = ["todos"], editing = null } = {}) {
    return new Promise((resolve) => {
      const modal = document.createElement("div");
      modal.className = "logout-modal announce-modal";
      modal.innerHTML = `
        <form class="logout-modal__dialog announce-compose" role="dialog" aria-modal="true" aria-labelledby="announce-compose-title">
          <span class="announce-modal__kicker">${editing ? "Editar aviso" : "Avisar todos os usuários"}</span>
          <h2 id="announce-compose-title">Escreva com palavras simples</h2>
          <p>Explique como explicaria para um encarregado na obra: o que mudou e o que ele precisa fazer.${editing ? "" : " O aviso aparece uma vez, numa janela com o botão OK, para quem você escolher."}</p>
          <fieldset class="announce-compose__audience">
            <legend>Para quem</legend>
            <label><input type="checkbox" name="audience" value="todos"> Todos</label>
            ${updates.audiences.map(([key, label]) => `<label><input type="checkbox" name="audience" value="${key}"> ${escape(label)}</label>`).join("")}
          </fieldset>
          <label>Título<input name="title" required maxlength="160" placeholder="Ex.: Agora o DP também pode recusar a liberação"></label>
          <label>Texto <small>(cada linha começando com "- " vira um item)</small><textarea name="body" rows="7" maxlength="3000"></textarea></label>
          <p class="announce-compose__error" role="alert" hidden></p>
          <div class="logout-modal__actions">
            <button class="logout-modal__cancel" type="button" data-cancel>Cancelar</button>
            <button class="logout-modal__confirm announce-modal__ok" type="submit">${editing ? "Salvar" : "Enviar para todos"}</button>
          </div>
        </form>`;
      const form = modal.querySelector("form");
      form.elements.title.value = title;
      form.elements.body.value = body;
      // "Todos" e perfis não se misturam: marcar um perfil desmarca "Todos", e marcar "Todos" desmarca os perfis.
      const boxes = [...form.querySelectorAll('[name="audience"]')];
      boxes.forEach((box) => { box.checked = audience.includes(box.value); });
      form.querySelector(".announce-compose__audience").addEventListener("change", (event) => {
        if (!event.target.checked) return;
        boxes.forEach((box) => { if ((event.target.value === "todos") !== (box.value === "todos")) box.checked = false; });
      });
      document.body.append(modal);
      form.elements.title.focus();
      const close = (result) => { modal.remove(); resolve(result); };
      modal.querySelector("[data-cancel]").addEventListener("click", () => close(false));
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const stop = window.portalButtonLoading(form.querySelector('[type="submit"]'), editing ? "Salvando…" : "Enviando…");
        const errorBox = form.querySelector(".announce-compose__error");
        const chosen = boxes.filter((box) => box.checked).map((box) => box.value);
        if (!chosen.length) {
          stop();
          errorBox.textContent = "Escolha para quem é o aviso.";
          errorBox.hidden = false;
          return;
        }
        const text = { title: form.elements.title.value.trim(), body: form.elements.body.value.trim(), audience: chosen };
        try {
          if (editing) {
            // Editar não manda a janela de novo para quem já apertou OK.
            await db.collection("announcements").doc(editing).update({ ...text, editedAt: new Date().toISOString() });
          } else {
            stop();
            const sure = await updates.openModal({
              kicker: "Confirmar envio",
              title: `Enviar para ${updates.audienceLabel({ audience: chosen }).toLowerCase()}?`,
              body: "Cada pessoa vai ver este aviso numa janela com o botão OK. Depois de enviado, a janela não pode ser desfeita.",
              okText: "Enviar",
              cancelText: "Voltar"
            });
            if (!sure) return;
            window.portalButtonLoading(form.querySelector('[type="submit"]'), "Enviando…");
            await sendAnnouncement(text);
          }
          close(true);
        } catch (error) {
          console.error(error);
          stop();
          errorBox.textContent = error.userMessage || "Não foi possível salvar o aviso. Tente de novo.";
          errorBox.hidden = false;
        }
      });
    });
  }

  // Limite de avisos: devolve o motivo do bloqueio (texto) ou "" se pode mandar agora. Mesma conta das regras do banco.
  async function limitBlock() {
    const snapshot = await limitRef().get();
    if (!snapshot.exists) return "";
    const limit = snapshot.data();
    const last = millisOf(limit.lastAt);
    if (Date.now() < last + MIN_GAP_MS) return `O último aviso saiu há pouco. O próximo pode ser enviado a partir das ${formatTime(last + MIN_GAP_MS)}.`;
    const now = new Date();
    const today = limit.y === now.getUTCFullYear() && limit.m === now.getUTCMonth() + 1 && limit.d === now.getUTCDate();
    if (today && limit.count >= MAX_PER_DAY) return `Hoje já saíram ${MAX_PER_DAY} avisos, o máximo por dia. Tente amanhã.`;
    return "";
  }

  // Grava o aviso e o contador juntos, com o horário do servidor (as regras recusam um sem o outro).
  async function sendAnnouncement(text) {
    const serverTime = firebase.firestore.FieldValue.serverTimestamp();
    const snapshot = await limitRef().get();
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth() + 1;
    const d = now.getUTCDate();
    const previous = snapshot.exists ? snapshot.data() : null;
    const today = previous && previous.y === y && previous.m === m && previous.d === d;
    const ref = db.collection("announcements").doc();
    const batch = db.batch();
    batch.set(ref, { ...text, postedAt: serverTime, postedBy: session?.name || "Administrador" });
    batch.set(limitRef(), { lastAt: serverTime, y, m, d, count: today ? previous.count + 1 : 1 });
    try {
      await batch.commit();
    } catch (error) {
      const reason = await limitBlock().catch(() => "");
      error.userMessage = reason || "Não foi possível enviar o aviso. Tente de novo em alguns minutos.";
      throw error;
    }
    // Quem mandou já leu: não precisa ver a própria janela.
    const saved = await ref.get();
    await window.portalAuthDemo.updateProfile({ announcementSeenAt: millisOf(saved.data()?.postedAt) || Date.now() }).catch(() => {});
  }

  newButton.addEventListener("click", async () => {
    const stop = window.portalButtonLoading(newButton, "Conferindo…");
    const reason = await limitBlock().catch(() => "");
    stop();
    if (reason) {
      updates.openModal({ kicker: "Aguarde", title: "Limite de avisos", body: reason });
      return;
    }
    if (await openComposer()) load();
  });
  list.addEventListener("click", async (event) => {
    const edit = event.target.closest("[data-edit]");
    const remove = event.target.closest("[data-delete]");
    if (!isAdmin || (!edit && !remove)) return;
    const item = announcements.find((entry) => entry.id === (edit || remove).dataset[edit ? "edit" : "delete"]);
    if (!item) return;
    if (edit) {
      if (await openComposer({ title: item.title, body: item.body, audience: updates.audienceOf(item), editing: item.id })) load();
      return;
    }
    const ok = await updates.openModal({ kicker: "Apagar aviso", title: item.title, body: "Este aviso sai da página de atualizações para todos.", okText: "Apagar", cancelText: "Cancelar" });
    if (!ok) return;
    try {
      await db.collection("announcements").doc(item.id).delete();
      load();
    } catch (error) {
      console.error(error);
      updates.openModal({ kicker: "Erro", title: "Não foi possível apagar o aviso", body: "Tente de novo em alguns minutos." });
    }
  });

  (async () => {
    if (!db) {
      status.textContent = "Não foi possível carregar as atualizações agora.";
      return;
    }
    await window.portalAuthDemo?.ready?.();
    session = window.portalAuthDemo?.getSession() || null;
    isAdmin = session?.roleValue === "administrador-analista" || session?.role === "Administrador Analista";
    newButton.hidden = !isAdmin;
    await load();
  })();
})();
