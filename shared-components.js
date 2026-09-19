(async function loadSharedComponents() {
  const components = [
    ["[data-site-header]", "header.html"],
    ["[data-site-footer]", "footer.html"]
  ];

  await Promise.all(components.map(async ([selector, file]) => {
    const target = document.querySelector(selector);
    if (!target) return;

    const response = await fetch(file);
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

})().catch((error) => {
  console.error("Falha ao carregar os componentes compartilhados.", error);
});
