// Horário da liberação: só dentro do expediente (07:00 às 12:00 e 13:00 às 17:00) e nunca no almoço.
// Almoço (12:00 às 13:00): a batida de ponto do almoço é automática, então só vale até 11:59 ou a partir de 13:01.
// Fora do expediente (antes das 07:00 ou depois das 17:00, como 01:01 da madrugada) também não vale.
// Usado nas telas de liberação individual e coletiva (campo #release-time): impede o envio e, só nesses casos,
// mostra o aviso embaixo do campo.
(() => {
  const DAY_START = 7 * 60;
  const DAY_END = 17 * 60;
  const START = 12 * 60;
  const END = 13 * 60;
  const MESSAGE = "12:00 às 13:00 é horário de almoço: o ponto do almoço é batido automaticamente. Use um horário até 11:59 ou a partir de 13:01.";
  const OFF_HOURS_MESSAGE = "Horário fora do expediente. O expediente é das 07:00 às 12:00 e das 13:00 às 17:00: use um horário entre 07:00 e 11:59 ou entre 13:01 e 17:00.";
  const LUNCH_HINT = "<b>12:00 às 13:00 é horário de almoço</b> (ponto automático). Use até 11:59 ou a partir de 13:01.";
  const OFF_HOURS_HINT = "<b>Fora do expediente.</b> O expediente é das 07:00 às 12:00 e das 13:00 às 17:00.";

  const minutes = (value) => {
    const match = /^(\d{1,2}):(\d{2})/.exec(value || "");
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  };
  const isLunch = (value) => {
    const time = minutes(value);
    return time !== null && time >= START && time <= END;
  };
  const isOffHours = (value) => {
    const time = minutes(value);
    return time !== null && (time < DAY_START || time > DAY_END);
  };
  // Mensagem do problema do horário, ou "" se o horário vale.
  const problemOf = (value) => isOffHours(value) ? OFF_HOURS_MESSAGE : isLunch(value) ? MESSAGE : "";

  // Marca o campo como inválido (o navegador não deixa enviar) e deixa o aviso em vermelho. Devolve true se o horário vale.
  function validate(input = document.querySelector("#release-time")) {
    if (!input) return true;
    const problem = problemOf(input.value);
    input.setCustomValidity(problem);
    const hint = input.parentElement?.querySelector("small.lunch-hint");
    if (hint && problem) hint.innerHTML = problem === MESSAGE ? LUNCH_HINT : OFF_HOURS_HINT;
    input.closest(".release-field")?.classList.toggle("is-lunch", !!problem);
    return !problem;
  }

  // Mensagem para a faixa de erro do formulário (o motivo de o horário não valer).
  const message = (input = document.querySelector("#release-time")) => problemOf(input?.value) || MESSAGE;

  function setup() {
    const input = document.querySelector("#release-time");
    if (!input || input.dataset.lunchReady) return;
    input.dataset.lunchReady = "1";
    // Fora do horário o seletor do navegador já limita, mas quem digita à mão ainda passa pela validação acima.
    input.min = "07:00";
    input.max = "17:00";
    const hint = document.createElement("small");
    hint.className = "lunch-hint";
    hint.innerHTML = LUNCH_HINT;
    input.insertAdjacentElement("afterend", hint);
    ["input", "change", "blur"].forEach((type) => input.addEventListener(type, () => validate(input)));
    validate(input);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup);
  else setup();

  window.portalLunchTime = Object.freeze({ isLunch, isOffHours, validate, message, MESSAGE });
})();
