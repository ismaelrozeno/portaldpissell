window.escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
}[char]));

window.normalizeSearchText = (value) => String(value ?? "")
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .toLowerCase();

// Datas "ao vivo": <span data-live-date="long|short"></span> mostra a data de hoje e vira à meia-noite.
(() => {
  const formats = {
    long: { day: "numeric", month: "long", year: "numeric" },
    short: { day: "2-digit", month: "2-digit", year: "numeric" }
  };
  const update = () => document.querySelectorAll("[data-live-date]").forEach((element) => {
    element.textContent = new Date().toLocaleDateString("pt-BR", formats[element.dataset.liveDate] || formats.short);
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", update);
  else update();
  setInterval(update, 60000);
})();
