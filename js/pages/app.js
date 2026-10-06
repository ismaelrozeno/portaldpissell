(() => {
  const ua = navigator.userAgent || "";
  const isAndroid = /Android/i.test(ua);
  const isIos = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const apk = document.querySelector("#apk-download");
  const meta = document.querySelector("#apk-meta");
  const install = document.querySelector("#pwa-install");

  // Destaca o caminho certo para o aparelho de quem abriu a página; no iPhone não existe APK.
  const highlight = (id) => document.querySelector(id)?.classList.add("is-recommended");
  if (isIos) {
    highlight("#card-ios");
    apk.hidden = true;
    meta.textContent = "No iPhone use o passo a passo abaixo (Adicionar à Tela de Início).";
  } else if (isAndroid) {
    highlight("#card-android");
  }

  // Tamanho do arquivo, para quem tem internet limitada saber antes de baixar.
  fetch(apk.getAttribute("href"), { method: "HEAD" })
    .then((response) => {
      if (!response.ok) throw new Error("sem arquivo");
      const bytes = Number(response.headers.get("content-length")) || 0;
      if (bytes) meta.textContent = `Android 7 ou mais novo · arquivo .apk de ${(bytes / 1048576).toFixed(1).replace(".", ",")} MB`;
    })
    .catch(() => {
      apk.classList.add("disabled");
      apk.removeAttribute("href");
      apk.setAttribute("aria-disabled", "true");
      meta.textContent = "O arquivo APK ainda não está disponível. Use a instalação pelo navegador abaixo.";
    });

  // Instalação direta pelo navegador (Chrome/Edge): o evento só dispara quando o portal pode ser instalado.
  let deferred = null;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event;
    install.hidden = false;
  });
  install.addEventListener("click", async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice.catch(() => {});
    deferred = null;
    install.hidden = true;
  });
  window.addEventListener("appinstalled", () => { install.hidden = true; });
})();
