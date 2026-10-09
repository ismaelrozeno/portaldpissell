// Aviso de liberação retroativa embaixo do campo Data (#release-date), nas telas de liberação individual e coletiva:
// com data anterior a hoje, ou com entrada E saída marcadas (o colaborador não bateu o ponto), a movimentação já
// aconteceu. Depois do engenheiro a liberação já fica registrada, sem autorização de saída do DP e sem portaria
// (regra em portalReleaseFlow.isRetroactive / collective-release-sheet.js). Só avisa: o que foi marcado continua valendo.
// Também deixa o Horário opcional quando entrada e saída estão marcadas.
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
    input.insertAdjacentElement("afterend", hint);
    const both = () => {
      const marked = [...document.querySelectorAll('input[name="movement"]:checked')].map((box) => box.value);
      return marked.includes("entrada") && marked.includes("saida");
    };
    const after = "Depois do engenheiro, a liberação fica registrada como <b>retroativa</b>, sem autorização de saída do DP e sem portaria.";
    // Com entrada E saída marcadas, o Horário não é obrigatório (some o asterisco); com uma só, volta a ser.
    const timeInput = document.querySelector("#release-time");
    const timeStar = document.querySelector('label[for="release-time"] span[aria-hidden="true"]');
    const update = () => {
      const pastDate = !!input.value && input.value < today();
      hint.hidden = !pastDate && !both();
      hint.innerHTML = both()
        ? `<b>Entrada e saída marcadas:</b> o colaborador não bateu o ponto. ${after}`
        : `<b>Data retroativa:</b> o colaborador já saiu. ${after}`;
      if (timeInput) timeInput.required = !both();
      if (timeStar) timeStar.hidden = both();
    };
    ["input", "change"].forEach((type) => input.addEventListener(type, update));
    document.querySelectorAll('input[name="movement"]').forEach((box) => box.addEventListener("change", update));
    update();
    // A edição (reenvio) preenche a data depois de carregar a liberação.
    setTimeout(update, 1500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup);
  else setup();
})();
