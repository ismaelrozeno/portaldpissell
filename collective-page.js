// Mostra o cartão "Liberações coletivas" nas telas próprias de cada perfil (Engenheiro, DP e Portaria).
(async () => {
  await window.portalAuthDemo?.ready();
  const host = document.querySelector("[data-collective-host]");
  if (host) window.portalCollectivePanel?.render(host.dataset.profile);
})();
