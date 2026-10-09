// Menu do dashboard (o mesmo do Meu portal) em outras páginas: <body data-dash-shell="equipes"> ganha o menu lateral
// no computador e a barra de abas + botão "+" no celular, em volta do conteúdo que a página já tem (nada muda dentro dela).
// Visual em css/components/portal-dashboard.css. As abas levam ao Meu portal (Portal.html#individuais etc.).
(() => {
  const body = document.body;
  const active = body.dataset.dashShell;
  if (!active) return;

  const ICON = {
    overview: '<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-6h4v6"/>',
    individuais: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
    coletivas: '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M15.5 6a3 3 0 0 1 0 6"/><path d="M17 14.2a5.5 5.5 0 0 1 3.5 4.8"/>',
    indicadores: '<path d="M4 20h16"/><path d="M7 16v-5"/><path d="M12 16V7"/><path d="M17 16v-8"/>',
    equipe: '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h10"/>',
    equipes: '<circle cx="8" cy="8" r="2.5"/><circle cx="16" cy="8" r="2.5"/><path d="M3.5 18a4.5 4.5 0 0 1 9 0"/><path d="M11.5 18a4.5 4.5 0 0 1 9 0"/>',
    app: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 17.5h2"/>',
    admin: '<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>'
  };
  const svg = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`;
  const item = (key, href, label, extraClass = "") => `<li class="${extraClass}"><a class="dash-nav-item${key === active ? " is-active" : ""}" href="${href}"${key === active ? ' aria-current="page"' : ""}>${svg(key)}<span>${label}</span></a></li>`;

  const nav = document.createElement("nav");
  nav.className = "dash-nav";
  nav.setAttribute("aria-label", "Seções do portal");
  nav.innerHTML = `
    <div class="dash-nav-brand"><strong>Portal DP</strong><small>Obra 369 · liberações</small></div>
    <ul class="dash-nav-list">
      ${item("overview", "Portal.html", "Visão geral")}
      ${item("individuais", "Portal.html#individuais", "Individuais")}
      ${item("coletivas", "Portal.html#coletivas", "Coletivas")}
      ${item("indicadores", "Portal.html#indicadores", "BI Dados")}
      ${item("equipe", "Portal.html#equipe", "Atalhos")}
      ${item("equipes", "Equipes.html", "Equipes", "dash-nav-desktop")}
    </ul>
    <ul class="dash-nav-more" aria-label="Outras áreas do site">
      ${item("app", "App.html", "Aplicativo")}
      ${item("admin", "Administrador-Portal.html", "Administração").replace("<li", "<li data-dash-admin hidden")}
    </ul>
    <div class="dash-nav-actions" data-dash-create hidden>
      <a href="Liberacao.html">Nova liberação individual</a>
      <a href="Liberacao-Coletiva.html">Nova liberação coletiva</a>
    </div>
    <p class="dash-nav-foot">Fluxo: encarregado, engenheiro, DP e portaria.</p>`;

  // Estrutura: [menu][conteúdo da página], igual ao Meu portal.
  const main = document.querySelector("main");
  if (!main) return;
  const shell = document.createElement("div");
  shell.className = "dash-shell";
  const content = document.createElement("div");
  content.className = "dash-main dash-main-page";
  while (main.firstChild) content.append(main.firstChild);
  shell.append(nav, content);
  main.append(shell);
  body.classList.add("dash");

  // Botão "+" do celular
  main.insertAdjacentHTML("beforeend", `
    <button class="dash-fab" type="button" aria-expanded="false" aria-label="Nova liberação" data-dash-create hidden>${svg("plus")}</button>
    <div class="dash-fab-menu" hidden>
      <a href="Liberacao.html"><span class="dash-fab-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg></span>Nova liberação individual</a>
      <a href="Liberacao-Coletiva.html"><span class="dash-fab-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8.5" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M15.5 6a3 3 0 0 1 0 6"/><path d="M17 14.2a5.5 5.5 0 0 1 3.5 4.8"/></svg></span>Nova liberação coletiva</a>
    </div>`);
  const fab = main.querySelector(".dash-fab");
  const fabMenu = main.querySelector(".dash-fab-menu");
  const closeFab = () => { fab.setAttribute("aria-expanded", "false"); fabMenu.hidden = true; };
  fab.addEventListener("click", (event) => {
    event.stopPropagation();
    const open = fab.getAttribute("aria-expanded") !== "true";
    fab.setAttribute("aria-expanded", String(open));
    fabMenu.hidden = !open;
  });
  document.addEventListener("click", (event) => { if (!fabMenu.hidden && !event.target.closest(".dash-fab-menu")) closeFab(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeFab(); });

  // Administração só para o administrador; criar liberação não vale para a portaria.
  (async () => {
    await window.portalAuthDemo?.ready?.();
    const session = window.portalAuthDemo?.getSession();
    const isAdmin = session?.roleValue === "administrador-analista" || session?.role === "Administrador Analista";
    document.querySelectorAll("[data-dash-admin]").forEach((el) => { el.hidden = !isAdmin; });
    const canCreate = !!session && session.roleValue !== "porteiro";
    document.querySelectorAll("[data-dash-create]").forEach((el) => { el.hidden = !canCreate; });
  })();
})();
