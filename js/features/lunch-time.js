// Horário de almoço (12:00 às 13:00): a batida de ponto do almoço é automática, então nenhuma liberação pode ter
// horário nessa faixa — só até 11:59 ou a partir de 13:01. Usado nas telas de liberação individual e coletiva
// (campo #release-time): impede o envio com horário de almoço e, só nesse caso, mostra o aviso embaixo do campo.
(() => {
  const START = 12 * 60;
  const END = 13 * 60;
  const MESSAGE = "12:00 às 13:00 é horário de almoço: o ponto do almoço é batido automaticamente. Use um horário até 11:59 ou a partir de 13:01.";

  const minutes = (value) => {
    const match = /^(\d{1,2}):(\d{2})/.exec(value || "");
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  };
  const isLunch = (value) => {
    const time = minutes(value);
    return time !== null && time >= START && time <= END;
  };

  // Marca o campo como inválido (o navegador não deixa enviar) e deixa o aviso em vermelho. Devolve true se o horário vale.
  function validate(input = document.querySelector("#release-time")) {
    if (!input) return true;
    const blocked = isLunch(input.value);
    input.setCustomValidity(blocked ? MESSAGE : "");
    input.closest(".release-field")?.classList.toggle("is-lunch", blocked);
    return !blocked;
  }

  function setup() {
    const input = document.querySelector("#release-time");
    if (!input || input.dataset.lunchReady) return;
    input.dataset.lunchReady = "1";
    const hint = document.createElement("small");
    hint.className = "lunch-hint";
    hint.innerHTML = "<b>12:00 às 13:00 é horário de almoço</b> (ponto automático). Use até 11:59 ou a partir de 13:01.";
    input.insertAdjacentElement("afterend", hint);
    ["input", "change", "blur"].forEach((type) => input.addEventListener(type, () => validate(input)));
    validate(input);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup);
  else setup();

  window.portalLunchTime = Object.freeze({ isLunch, validate, MESSAGE });
})();
