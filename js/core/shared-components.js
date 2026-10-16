// Botão "carregando" padrão do site: enquanto espera o servidor, trava o botão e mostra um giro com a etapa atual,
// para ninguém achar que a tela travou. Chamar de novo no mesmo botão só troca o texto da etapa.
// Uso: const stop = window.portalButtonLoading(button, "Salvando…"); ... stop(); // devolve o botão como era
window.portalButtonLoading = (button, text) => {
  if (!button) return () => {};
  if (!button.classList.contains("is-loading")) {
    button.dataset.loadingOriginal = button.innerHTML;
    button.dataset.loadingWasDisabled = String(button.disabled);
    button.classList.add("is-loading");
    button.setAttribute("aria-busy", "true");
    button.disabled = true;
  }
  const spinner = document.createElement("span");
  spinner.className = "button-spinner";
  spinner.setAttribute("aria-hidden", "true");
  button.replaceChildren(spinner, document.createTextNode(text || "Carregando…"));
  return () => {
    if (!button.classList.contains("is-loading")) return;
    button.innerHTML = button.dataset.loadingOriginal;
    button.disabled = button.dataset.loadingWasDisabled === "true";
    button.classList.remove("is-loading");
    button.removeAttribute("aria-busy");
    delete button.dataset.loadingOriginal;
    delete button.dataset.loadingWasDisabled;
  };
};

// Avatares de perfil (Microsoft Fluent Emoji 3D, licença MIT em images/avatars/LICENSE.txt).
// O usuário escolhe um da lista; não há envio de foto própria. No perfil fica salvo só o id.
window.portalAvatars = (() => {
  const tones = [["default", "padrão"], ["light", "pele clara"], ["medium-light", "pele morena clara"], ["medium", "pele morena"], ["medium-dark", "pele morena escura"], ["dark", "pele escura"]];
  const list = [
    ...tones.map(([tone, label]) => ({ id: `pedreiro-${tone}`, label: `Pedreiro (${label})` })),
    ...tones.map(([tone, label]) => ({ id: `pedreira-${tone}`, label: `Pedreira (${label})` })),
    { id: "engenheiro-light", label: "Engenheiro" },
    { id: "engenheiro-medium-dark", label: "Engenheiro" },
    { id: "engenheira-light", label: "Engenheira" },
    { id: "engenheira-medium-dark", label: "Engenheira" },
    { id: "mecanico-medium", label: "Mecânico" },
    { id: "mecanica-medium", label: "Mecânica" },
    { id: "obra", label: "Obra" },
    { id: "colete", label: "Colete refletivo" },
    { id: "ferramentas", label: "Ferramentas" },
    { id: "tijolo", label: "Tijolo" },
    { id: "cavalete", label: "Cavalete de obra" },
    { id: "esquadro", label: "Esquadro" }
  ];
  // Fotos premium: aparecem com cadeado; só quem ganhou de presente do administrador pode usar (campo
  // "premiumAvatars" do cadastro, gravado só pelo administrador; as regras do banco conferem).
  const premium = [
    { id: "premium-cabelo-longo", label: "Cabelo longo", premium: true, file: "images/avatars/premium/cabelo-longo.png" },
    { id: "premium-cabelo-ruivo", label: "Cabelo ruivo", premium: true, file: "images/avatars/premium/cabelo-ruivo.png" },
    { id: "premium-cabelo-castanho", label: "Cabelo castanho", premium: true, file: "images/avatars/premium/cabelo-castanho.png" },
    { id: "premium-cabelo-cacheado", label: "Cabelo cacheado", premium: true, file: "images/avatars/premium/cabelo-cacheado.png" }
  ];
  const find = (id) => list.find((item) => item.id === id) || premium.find((item) => item.id === id) || null;
  const url = (id) => { const item = find(id); return item ? item.file || `images/avatars/${id}.png` : ""; };
  const isPremium = (id) => !!find(id)?.premium;
  const owns = (profile, id) => (profile?.premiumAvatars || []).includes(id);
  // Imagem que a pessoa pode mostrar: premium só se ela tiver ganho (se o presente for retirado, voltam as iniciais).
  const srcOf = (profile) => (isPremium(profile?.avatar) && !owns(profile, profile.avatar) ? "" : url(profile?.avatar));
  // Sem avatar escolhido (padrão de toda conta nova): iniciais do primeiro e do último nome, como no Gmail,
  // sempre no laranja do portal (igual para todo mundo).
  const ignoredWords = new Set(["da", "das", "de", "do", "dos", "e"]);
  function initials(name) {
    const words = String(name || "").trim().split(/\s+/).filter((word) => word && !ignoredWords.has(word.toLowerCase()));
    if (!words.length) return "?";
    const first = words[0].charAt(0);
    const last = words.length > 1 ? words[words.length - 1].charAt(0) : "";
    return (first + last).toUpperCase();
  }
  const color = () => "#ef6c00";
  // Preenche um círculo com o avatar escolhido ou com as iniciais coloridas.
  function render(element, profile, alt = "") {
    if (!element) return;
    const src = srcOf(profile);
    element.classList.toggle("has-image", !!src);
    element.classList.toggle("has-initials", !src);
    if (src) {
      element.style.removeProperty("background");
      element.style.removeProperty("color");
      element.innerHTML = `<img src="${src}" alt="${alt}">`;
    } else {
      element.style.background = color(profile?.name);
      element.style.color = "#fff";
      element.textContent = initials(profile?.name);
    }
  }
  // Mesmo círculo em HTML, para listas (ex.: usuários cadastrados na Administração).
  function html(profile, className = "user-avatar") {
    const src = srcOf(profile);
    const letters = initials(profile?.name).replace(/[<>&"]/g, "");
    return src
      ? `<span class="${className} has-image" aria-hidden="true"><img src="${src}" alt=""></span>`
      : `<span class="${className} has-initials" aria-hidden="true" style="background:${color(profile?.name)};color:#fff">${letters}</span>`;
  }
  return { list, premium, find, url, isPremium, owns, initials, color, render, html };
})();

// Avisos de atualização (Atualizacoes.html): o administrador escreve, com palavras simples, o que mudou no portal, e o
// aviso mais novo aparece para todos numa janela com OK. No texto, "- item" vira lista (linha recuada continua o item)
// e o resto vira parágrafo.
window.portalUpdates = (() => {
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  function bodyHtml(body) {
    const blocks = [];
    for (const raw of String(body || "").split("\n")) {
      const line = raw.replace(/\s+$/, "");
      if (!line.trim()) { blocks.push({ type: "gap" }); continue; }
      const last = blocks[blocks.length - 1];
      if (/^\s*[-*•]\s+/.test(line)) {
        const text = line.replace(/^\s*[-*•]\s+/, "");
        if (last?.type === "list") last.items.push(text);
        else blocks.push({ type: "list", items: [text] });
      } else if (/^\s+/.test(line) && last?.type === "list") {
        last.items[last.items.length - 1] += ` ${line.trim()}`;
      } else if (last?.type === "p") {
        last.text += ` ${line.trim()}`;
      } else {
        blocks.push({ type: "p", text: line.trim() });
      }
    }
    return blocks.map((block) => {
      if (block.type === "list") return `<ul>${block.items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`;
      if (block.type === "p") return `<p>${esc(block.text)}</p>`;
      return "";
    }).join("");
  }
  // Janela do aviso. Sem "cancelText" só tem o botão OK. Devolve uma promessa: true no botão principal, false ao fechar.
  function openModal({ kicker = "Atualização do portal", title, body, okText = "OK", cancelText = "" }) {
    return new Promise((resolve) => {
      const modal = document.createElement("div");
      modal.className = "logout-modal announce-modal";
      modal.innerHTML = `
        <div class="logout-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="announce-modal-title">
          <span class="announce-modal__kicker">${esc(kicker)}</span>
          <h2 id="announce-modal-title">${esc(title)}</h2>
          ${body ? `<div class="announce-modal__body">${bodyHtml(body)}</div>` : ""}
          <div class="logout-modal__actions">
            ${cancelText ? `<button class="logout-modal__cancel" type="button" data-announce-cancel>${esc(cancelText)}</button>` : ""}
            <button class="logout-modal__confirm announce-modal__ok" type="button" data-announce-ok>${esc(okText)}</button>
          </div>
        </div>`;
      document.body.append(modal);
      const close = (result) => { modal.remove(); resolve(result); };
      modal.querySelector("[data-announce-ok]").addEventListener("click", () => close(true));
      modal.querySelector("[data-announce-cancel]")?.addEventListener("click", () => close(false));
      if (cancelText) modal.addEventListener("click", (event) => { if (event.target === modal) close(false); });
      modal.querySelector("[data-announce-ok]").focus();
    });
  }
  return { bodyHtml, openModal, escape: esc };
})();

(async function loadSharedComponents() {
  const protectedPages = new Set([
    "Portal.html", "Liberacao.html", "Liberacao-Coletiva.html", "DP-Liberacoes.html", "Portaria.html",
    "Engenheiro.html", "Importar-Colaboradores.html", "Cadastrar-Colaborador.html", "Administrador-Portal.html", "Fechamento.html", "Perfil.html", "Backup.html", "Equipes.html", "Biometria.html",
    "Senhas.html", "Trocar-Senha.html"
  ]);
  const currentPage = window.location.pathname.split("/").pop();

  // Cabeçalho e rodapé começam a baixar JÁ, junto com a confirmação do login (antes esperavam o login, que pode levar
  // alguns segundos, e o topo ficava vazio). Entram na página assim que chegam; a parte da conta (nome, avatar, sair)
  // é preenchida depois do login. Os botões de "Entrar" ficam invisíveis até lá, para não piscarem para quem já está
  // logado. A versão (?v=) vem do tools/versionar.js, então o navegador pode reaproveitar a cópia guardada.
  // Preenche a parte da conta do cabeçalho (nome, avatar, sair, links de quem está logado) ou, sem sessão, volta aos
  // botões de "Entrar". Usada duas vezes: na hora, com a sessão guardada no aparelho, e depois com a confirmada.
  const fillAccount = (session) => {
    const guestActions = document.querySelector("[data-guest-actions]");
    const profileAction = document.querySelector("[data-profile-action]");
    const profileLabel = document.querySelector("[data-profile-label]");
    const logoutAction = document.querySelector("[data-logout-action]");
    const accountActions = document.querySelector("[data-account-actions]");
    const isAdmin = session && (session.role === "Administrador Analista" || session.roleValue === "administrador-analista");
    document.querySelectorAll("[data-auth-only]").forEach((link) => { link.hidden = !session; });
    document.querySelectorAll("[data-admin-only]").forEach((link) => { link.hidden = !isAdmin; });
    if (!guestActions || !profileAction) return;
    guestActions.hidden = !!session;
    guestActions.classList.toggle("d-none", !!session);
    if (accountActions) accountActions.hidden = !session;
    if (logoutAction) logoutAction.hidden = !session;
    if (!session) return;
    profileAction.href = "Perfil.html";
    profileAction.setAttribute("aria-label", `Abrir perfil de ${session.name}`);
    if (profileLabel) profileLabel.textContent = session.name;
    window.portalAvatars?.render(document.querySelector(".site-header .profile-avatar"), session);
  };

  const components = [
    ["[data-site-header]", "partials/header.html?v=6d28ef16"],
    ["[data-site-footer]", "partials/footer.html?v=e41ce720"]
  ];
  let authConfirmed = false;
  const partialsReady = Promise.all(components.map(async ([selector, file]) => {
    const target = document.querySelector(selector);
    if (!target) return;
    const response = await fetch(file);
    if (!response.ok) {
      throw new Error(`Não foi possível carregar ${file}: ${response.status}`);
    }
    target.outerHTML = await response.text();
    if (selector !== "[data-site-header]" || authConfirmed) return;
    // Já entrou antes neste aparelho: o cabeçalho aparece na hora com nome e avatar guardados (o login é confirmado por
    // trás e, se a sessão tiver acabado, volta para "Entrar"). Primeira vez: bolinha girando no lugar do perfil.
    const cached = window.portalAuthDemo?.cachedSession?.();
    if (cached) {
      fillAccount(cached);
      return;
    }
    document.querySelectorAll("[data-guest-actions]").forEach((el) => { el.style.visibility = "hidden"; });
    const accountSlot = document.querySelector(".site-header [data-account-actions]");
    if (accountSlot && !document.querySelector(".header-auth-loading")) {
      accountSlot.insertAdjacentHTML("beforebegin", '<span class="header-auth-loading" role="status" aria-label="Carregando a sua conta"><span class="button-spinner" aria-hidden="true"></span></span>');
    }
  }));

  await window.portalAuthDemo?.ready();
  authConfirmed = true;
  const currentSession = window.portalAuthDemo?.getSession();
  if (protectedPages.has(currentPage) && !currentSession) {
    window.location.replace("Acesso.html#login");
    return;
  }
  const isAdminSession = currentSession?.role === "Administrador Analista" || currentSession?.roleValue === "administrador-analista";
  // Qualquer perfil de DP (o DP e o analista, com ou sem acesso de DP) também importa o relatório do RM e cadastra
  // colaborador manualmente.
  const isDpSession = ["dp", "analista"].includes(currentSession?.roleValue) || !!window.portalAuthDemo?.isDpDelegate?.();
  const pageAllowed = ["Importar-Colaboradores.html", "Cadastrar-Colaborador.html"].includes(currentPage) ? isAdminSession || isDpSession : isAdminSession;
  if (["Cadastrar-Colaborador.html", "Importar-Colaboradores.html", "Administrador-Portal.html", "Senhas.html"].includes(currentPage) && !pageAllowed) {
    window.location.replace("Portal.html");
    return;
  }

  await partialsReady;

  const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
  document.querySelectorAll(".site-header .navbar-nav a.nav-link").forEach((link) => {
    const linkPath = new URL(link.href, window.location.href).pathname.replace(/\/+$/, "") || "/";
    const active = linkPath === currentPath;

    link.classList.toggle("is-active", active);
    if (active) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  const session = window.portalAuthDemo?.getSession();
  const logoutModal = document.createElement("div");
  logoutModal.className = "logout-modal";
  logoutModal.hidden = true;
  logoutModal.innerHTML = `
    <div class="logout-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="logout-modal-title">
      <button class="logout-modal__close" type="button" aria-label="Fechar confirmação">×</button>
      <div class="logout-modal__icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 3v8"/><path d="M6.3 6.8a8 8 0 1 0 11.4 0"/></svg></div>
      <h2 id="logout-modal-title">Sair da conta?</h2>
      <p>Você realmente deseja encerrar sua sessão?</p>
      <div class="logout-modal__actions">
        <button class="logout-modal__cancel" type="button">Continuar conectado</button>
        <button class="logout-modal__confirm" type="button">Sair da conta</button>
      </div>
    </div>`;
  document.body.append(logoutModal);
  const closeLogoutModal = () => { logoutModal.hidden = true; };
  const confirmLogout = async () => {
    // Espera a saída terminar de verdade antes de abrir o login (senão a conta ainda aparece logada e o login manda de volta ao portal).
    try { await window.portalAuthDemo.logout(); } catch (error) { console.warn("Falha ao sair da conta.", error); }
    window.location.href = "Acesso.html#login";
  };
  logoutModal.querySelector(".logout-modal__close").addEventListener("click", closeLogoutModal);
  logoutModal.querySelector(".logout-modal__cancel").addEventListener("click", closeLogoutModal);
  logoutModal.querySelector(".logout-modal__confirm").addEventListener("click", confirmLogout);
  logoutModal.addEventListener("click", (event) => {
    if (event.target === logoutModal) closeLogoutModal();
  });
  window.portalOpenLogoutModal = () => { logoutModal.hidden = false; };
  // Círculo do cabeçalho: o avatar escolhido ou, sem avatar, as iniciais do nome.
  window.portalRenderHeaderAvatar = (profile) => {
    window.portalAvatars.render(document.querySelector(".site-header .profile-avatar"), profile);
  };
  fillAccount(session);
  document.querySelector("[data-logout-action]")?.addEventListener("click", () => {
    window.portalOpenLogoutModal();
  });
  // Login confirmado: os botões de "Entrar" voltam a valer (escondidos acima se a pessoa está logada) e sai a bolinha.
  document.querySelectorAll("[data-guest-actions]").forEach((el) => { el.style.visibility = ""; });
  document.querySelector(".header-auth-loading")?.remove();

  // Presente do administrador (foto de perfil premium desbloqueada): aparece uma vez, no próximo login ou atualização
  // da página, e some do cadastro ("avatarGifts") assim que é mostrado.
  const gifts = (session?.avatarGifts || []).filter((gift) => window.portalAvatars.find(gift?.id));
  if (gifts.length) {
    const esc = (value) => String(value ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    const givers = [...new Set(gifts.map((gift) => gift.by).filter(Boolean))].join(" e ") || "Administrador";
    const last = gifts[gifts.length - 1].id;
    const giftModal = document.createElement("div");
    giftModal.className = "logout-modal gift-modal";
    giftModal.innerHTML = `
      <div class="logout-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="gift-modal-title">
        <button class="logout-modal__close" type="button" aria-label="Fechar">×</button>
        <div class="gift-modal__photos">${gifts.map((gift) => `<img src="${esc(window.portalAvatars.url(gift.id))}" alt="${esc(window.portalAvatars.find(gift.id).label)}">`).join("")}</div>
        <h2 id="gift-modal-title">🎁 ${gifts.length > 1 ? "Fotos desbloqueadas!" : "Foto desbloqueada!"}</h2>
        <p>Você recebeu um presente de <strong>${esc(givers)}</strong>.</p>
        <div class="logout-modal__actions">
          <button class="logout-modal__cancel" type="button" data-gift-close>Depois</button>
          <button class="logout-modal__confirm gift-modal__use" type="button" data-gift-use>Usar agora</button>
        </div>
      </div>`;
    document.body.append(giftModal);
    const closeGift = () => giftModal.remove();
    giftModal.querySelector(".logout-modal__close").addEventListener("click", closeGift);
    giftModal.querySelector("[data-gift-close]").addEventListener("click", closeGift);
    giftModal.addEventListener("click", (event) => { if (event.target === giftModal) closeGift(); });
    giftModal.querySelector("[data-gift-use]").addEventListener("click", async (event) => {
      event.currentTarget.disabled = true;
      try {
        const updated = await window.portalAuthDemo.updateProfile({ avatar: last, photo: "" });
        window.portalRenderHeaderAvatar(updated || { ...session, avatar: last });
        document.dispatchEvent(new CustomEvent("portal:avatar-changed", { detail: updated }));
      } catch (error) {
        console.warn("Não foi possível usar a foto agora.", error);
      }
      closeGift();
    });
    // Mostrado: tira do cadastro, para não aparecer de novo.
    window.portalAuthDemo.updateProfile({ avatarGifts: [] }).catch((error) => console.warn("Não foi possível marcar o presente como visto.", error));
  }

  // Aviso de atualização mandado pelo administrador (Atualizacoes.html → "Novo aviso"): o último aviso aparece uma
  // vez para cada conta, em qualquer página, até a pessoa apertar OK ("announcementSeenAt" no cadastro).
  const db = window.portalFirebaseDb;
  if (db && session?.status === "approved" && !session.mustChangePassword && !["Acesso.html", "Trocar-Senha.html"].includes(currentPage)) {
    try {
      const snapshot = await db.collection("announcements").orderBy("postedAt", "desc").limit(1).get();
      const latest = snapshot.docs[0]?.data();
      if (latest?.postedAt && latest.postedAt > (session.announcementSeenAt || "")) {
        await window.portalUpdates.openModal({ title: latest.title, body: latest.body, okText: "OK" });
        await window.portalAuthDemo.updateProfile({ announcementSeenAt: latest.postedAt });
      }
    } catch (error) {
      console.warn("Não foi possível conferir os avisos de atualização.", error);
    }
  }

})().catch((error) => {
  console.error("Falha ao carregar os componentes compartilhados.", error);
});

// Aplicativo: deixa o portal instalável (manifest + service worker) em todas as páginas que carregam este arquivo.
(() => {
  const head = document.head;
  const add = (tag, attrs) => {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
    head.append(el);
  };
  if (!head.querySelector('link[rel="manifest"]')) add("link", { rel: "manifest", href: "manifest.webmanifest" });
  if (!head.querySelector('meta[name="theme-color"]')) add("meta", { name: "theme-color", content: "#00142d" });
  if (!head.querySelector('link[rel="apple-touch-icon"]')) add("link", { rel: "apple-touch-icon", href: "icons/apple-touch-icon.png" });
  if ("serviceWorker" in navigator && /^https?:$/.test(window.location.protocol)) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => { /* sem service worker o site funciona igual */ }));
  }
})();
