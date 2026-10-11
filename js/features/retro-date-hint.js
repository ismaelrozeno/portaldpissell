// Aviso de liberação retroativa embaixo do campo Data (#release-date), nas telas de liberação individual e coletiva:
// com data anterior a hoje, ou com entrada E saída marcadas (o colaborador não bateu o ponto), a movimentação já
// aconteceu. Depois do engenheiro a liberação já fica registrada, sem autorização de saída do DP e sem portaria
// (regra em portalReleaseFlow.isRetroactive / collective-release-sheet.js). Só avisa: o que foi marcado continua valendo.
// Com entrada e saída marcadas o colaborador não bateu o ponto: o Horário fica bloqueado com "Não bateu o ponto".
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
    // Com entrada E saída marcadas, o Horário some (vazio) e no lugar aparece "Não bateu o ponto", bloqueado;
    // desmarcando, o horário volta (com o que estava digitado antes) e é obrigatório de novo.
    const timeInput = document.querySelector("#release-time");
    const timeStar = document.querySelector('label[for="release-time"] span[aria-hidden="true"]');
    let timeOff = null;
    let savedTime = "";
    if (timeInput) {
      timeOff = document.createElement("input");
      timeOff.type = "text";
      timeOff.className = `${timeInput.className} time-off`.trim();
      timeOff.value = "Não bateu o ponto";
      timeOff.disabled = true;
      timeOff.hidden = true;
      timeOff.style.display = "none";
      Object.assign(timeOff.style, { background: "#f1f4f8", color: "#617188", fontWeight: "600", cursor: "not-allowed" });
      timeOff.setAttribute("aria-label", "Horário: não bateu o ponto (entrada e saída marcadas)");
      timeInput.insertAdjacentElement("afterend", timeOff);
    }
    const update = () => {
      const pastDate = !!input.value && input.value < today();
      hint.hidden = !pastDate && !both();
      hint.innerHTML = both()
        ? `<b>Entrada e saída marcadas:</b> o colaborador não bateu o ponto. ${after}`
        : `<b>Data retroativa:</b> o colaborador já saiu. ${after}`;
      if (timeInput) {
        const off = both();
        if (off && timeInput.value) { savedTime = timeInput.value; timeInput.value = ""; }
        if (!off && timeInput.hidden && !timeInput.value) timeInput.value = savedTime;
        timeInput.required = !off;
        timeInput.hidden = off;
        timeInput.style.display = off ? "none" : "";
        timeOff.hidden = !off;
        timeOff.style.display = off ? "" : "none";
      }
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
