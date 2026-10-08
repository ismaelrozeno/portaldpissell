// Aviso de liberação retroativa embaixo do campo Data (#release-date), nas telas de liberação individual e coletiva:
// com data anterior a hoje, o colaborador já saiu. Depois do engenheiro a liberação já fica registrada, sem autorização
// de saída do DP e sem portaria (regra em portalReleaseFlow.isRetroactive / collective-release-sheet.js).
// Só avisa: a data retroativa continua valendo.
(() => {
  const pad = (n) => String(n).padStart(2, "0");
  const today = () => {
    const now = new Date();
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  };

  function setup() {
    const input = document.querySelector("#release-date");
    if (!input || input.dataset.retroReady) return;
    input.dataset.retroReady = "1";
    const hint = document.createElement("small");
    hint.className = "retro-hint";
    hint.hidden = true;
    hint.innerHTML = "<b>Data retroativa:</b> o colaborador já saiu. Depois do engenheiro, a liberação fica registrada, sem autorização de saída do DP e sem portaria.";
    input.insertAdjacentElement("afterend", hint);
    const update = () => { hint.hidden = !input.value || input.value >= today(); };
    ["input", "change"].forEach((type) => input.addEventListener(type, update));
    update();
    // A edição (reenvio) preenche a data depois de carregar a liberação.
    setTimeout(update, 1500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup);
  else setup();
})();
