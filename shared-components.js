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
  const find = (id) => list.find((item) => item.id === id) || null;
  const url = (id) => (find(id) ? `images/avatars/${id}.png` : "");
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
    const src = url(profile?.avatar);
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
    const src = url(profile?.avatar);
    const letters = initials(profile?.name).replace(/[<>&"]/g, "");
    return src
      ? `<span class="${className} has-image" aria-hidden="true"><img src="${src}" alt=""></span>`
      : `<span class="${className} has-initials" aria-hidden="true" style="background:${color(profile?.name)};color:#fff">${letters}</span>`;
  }
  return { list, find, url, initials, color, render, html };
})();

(async function loadSharedComponents() {
  const protectedPages = new Set([
    "Portal.html", "Liberacao.html", "DP-Liberacoes.html", "Portaria.html",
    "Engenheiro.html", "Importar-Colaboradores.html", "Cadastrar-Colaborador.html", "Administrador-Portal.html", "Fechamento.html", "Perfil.html", "Backup.html", "Equipes.html", "Biometria.html"
  ]);
  const currentPage = window.location.pathname.split("/").pop();
  await window.portalAuthDemo?.ready();
  const currentSession = window.portalAuthDemo?.getSession();
  if (protectedPages.has(currentPage) && !currentSession) {
    window.location.replace("Acesso.html#login");
    return;
  }
  if (["Cadastrar-Colaborador.html", "Importar-Colaboradores.html", "Administrador-Portal.html"].includes(currentPage)
    && currentSession?.role !== "Administrador Analista"
    && currentSession?.roleValue !== "administrador-analista") {
    window.location.replace("Portal.html");
    return;
  }

  const components = [
    ["[data-site-header]", "header.html"],
    ["[data-site-footer]", "footer.html"]
  ];

  await Promise.all(components.map(async ([selector, file]) => {
    const target = document.querySelector(selector);
    if (!target) return;

    const response = await fetch(`${file}?v=20260920-auth`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Não foi possível carregar ${file}: ${response.status}`);
    }

    target.outerHTML = await response.text();
  }));

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
  const confirmLogout = () => {
    window.portalAuthDemo.logout();
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
  const guestActions = document.querySelector("[data-guest-actions]");
  const profileAction = document.querySelector("[data-profile-action]");
  const profileLabel = document.querySelector("[data-profile-label]");
  const logoutAction = document.querySelector("[data-logout-action]");
  const accountActions = document.querySelector("[data-account-actions]");
  const authenticatedLinks = document.querySelectorAll("[data-auth-only]");
  const adminLinks = document.querySelectorAll("[data-admin-only]");
  if (session && guestActions && profileAction) {
    guestActions.hidden = true;
    guestActions.classList.add("d-none");
    if (accountActions) accountActions.hidden = false;
    profileAction.href = "Perfil.html";
    profileAction.setAttribute("aria-label", `Abrir perfil de ${session.name}`);
    if (profileLabel) profileLabel.textContent = session.name;
    window.portalRenderHeaderAvatar(session);
    authenticatedLinks.forEach((link) => { link.hidden = false; });
    adminLinks.forEach((link) => {
      link.hidden = session.role !== "Administrador Analista" && session.roleValue !== "administrador-analista";
    });
    if (logoutAction) {
      logoutAction.hidden = false;
      logoutAction.addEventListener("click", () => {
        window.portalOpenLogoutModal();
      });
    }
  } else {
    authenticatedLinks.forEach((link) => { link.hidden = true; });
    adminLinks.forEach((link) => { link.hidden = true; });
  }

})().catch((error) => {
  console.error("Falha ao carregar os componentes compartilhados.", error);
});
