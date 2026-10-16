// Página de atualizações: os avisos que o administrador escreve, com palavras simples, sobre o que mudou no portal
// (principalmente no fluxo), para todo mundo entender. Ficam na coleção "announcements"; o mais novo também aparece
// numa janela com OK para todas as contas (ver shared-components.js).
// O administrador tem "+ Novo aviso" e, em cada aviso, "Editar" e "Apagar".
(function updatesPage() {
  const NEW_DAYS = 3;

  const list = document.getElementById("updates-list");
  const status = document.getElementById("updates-status");
  const newButton = document.getElementById("updates-new");
  const updates = window.portalUpdates;
  const escape = updates.escape;
  const db = window.portalFirebaseDb;
  let announcements = []; // [{ id, ...dados }]
  let isAdmin = false;

  const formatDate = (iso) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const isNew = (iso) => Date.now() - new Date(iso).getTime() < NEW_DAYS * 24 * 60 * 60 * 1000;

  function render() {
    list.innerHTML = announcements.map((item) => `
      <li class="update-item">
        <div class="update-meta">
          <time datetime="${escape(item.postedAt)}">${escape(formatDate(item.postedAt))}</time>
          ${isNew(item.postedAt) ? '<span class="update-new">Novo</span>' : ""}
        </div>
        <h2>${escape(item.title)}</h2>
        ${item.body ? `<div class="update-body">${updates.bodyHtml(item.body)}</div>` : ""}
        ${isAdmin ? `<div class="update-admin-actions">
          <button class="update-announce" type="button" data-edit="${escape(item.id)}">Editar</button>
          <button class="update-announce is-danger" type="button" data-delete="${escape(item.id)}">Apagar</button>
        </div>` : ""}
      </li>`).join("");
    status.textContent = announcements.length
      ? "As novidades mais recentes aparecem primeiro."
      : "Nenhuma novidade por enquanto.";
  }

  async function load() {
    try {
      const snapshot = await db.collection("announcements").orderBy("postedAt", "desc").limit(50).get();
      announcements = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      render();
    } catch (error) {
      console.error(error);
      status.textContent = "Não foi possível carregar as atualizações agora. Tente de novo em alguns minutos.";
    }
  }

  // Janela do administrador para escrever (ou ajustar) um aviso.
  function openComposer({ title = "", body = "", editing = null } = {}) {
    return new Promise((resolve) => {
      const modal = document.createElement("div");
      modal.className = "logout-modal announce-modal";
      modal.innerHTML = `
        <form class="logout-modal__dialog announce-compose" role="dialog" aria-modal="true" aria-labelledby="announce-compose-title">
          <span class="announce-modal__kicker">${editing ? "Editar aviso" : "Avisar todos os usuários"}</span>
          <h2 id="announce-compose-title">Escreva com palavras simples</h2>
          <p>Explique como explicaria para um encarregado na obra: o que mudou e o que ele precisa fazer.${editing ? "" : " O aviso aparece numa janela com o botão OK para todas as contas, uma vez."}</p>
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
      document.body.append(modal);
      form.elements.title.focus();
      const close = (result) => { modal.remove(); resolve(result); };
      modal.querySelector("[data-cancel]").addEventListener("click", () => close(false));
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const stop = window.portalButtonLoading(form.querySelector('[type="submit"]'), editing ? "Salvando…" : "Enviando…");
        const errorBox = form.querySelector(".announce-compose__error");
        const text = { title: form.elements.title.value.trim(), body: form.elements.body.value.trim() };
        try {
          if (editing) {
            // Editar não manda a janela de novo para quem já apertou OK.
            await db.collection("announcements").doc(editing).update({ ...text, editedAt: new Date().toISOString() });
          } else {
            const data = { ...text, postedAt: new Date().toISOString(), postedBy: window.portalAuthDemo.getSession()?.name || "Administrador" };
            await db.collection("announcements").add(data);
            // Quem mandou já leu: não precisa ver a própria janela.
            await window.portalAuthDemo.updateProfile({ announcementSeenAt: data.postedAt }).catch(() => {});
          }
          close(true);
        } catch (error) {
          console.error(error);
          stop();
          errorBox.textContent = "Não foi possível salvar o aviso. Tente de novo.";
          errorBox.hidden = false;
        }
      });
    });
  }

  newButton.addEventListener("click", async () => { if (await openComposer()) load(); });
  list.addEventListener("click", async (event) => {
    const edit = event.target.closest("[data-edit]");
    const remove = event.target.closest("[data-delete]");
    if (!isAdmin || (!edit && !remove)) return;
    const item = announcements.find((entry) => entry.id === (edit || remove).dataset[edit ? "edit" : "delete"]);
    if (!item) return;
    if (edit) {
      if (await openComposer({ title: item.title, body: item.body, editing: item.id })) load();
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
    const session = window.portalAuthDemo?.getSession();
    isAdmin = session?.roleValue === "administrador-analista" || session?.role === "Administrador Analista";
    newButton.hidden = !isAdmin;
    await load();
  })();
})();
