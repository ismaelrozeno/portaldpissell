(async function loadSharedComponents() {
  const protectedPages = new Set([
    "Portal.html", "Liberacao.html", "DP-Liberacoes.html", "Portaria.html",
    "Engenheiro.html", "Importar-Colaboradores.html", "Cadastrar-Colaborador.html", "Administrador-Portal.html", "Fechamento.html", "Perfil.html"
  ]);
  const currentPage = window.location.pathname.split("/").pop();
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
      <div class="logout-modal__icon" aria-hidden="true">⏻</div>
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
