(() => {
  const fileInput = document.querySelector("#employee-file");
  const fileName = document.querySelector("#file-name");
  const preview = document.querySelector("#import-preview");
  const previewBody = document.querySelector("#preview-body");
  const previewCount = document.querySelector("#preview-count");
  const warning = document.querySelector("#import-warning");
  const result = document.querySelector("#import-result");
  const confirmButton = document.querySelector("#confirm-import");
  const clearButton = document.querySelector("#clear-file");
  const demoRows = [
    ["1000001", "Carlos Henrique", "Montador", "Forma", "Ativo"],
    ["1000002", "Marcos Vinicius", "Eletricista", "Elétrica", "Ativo"],
    ["1000003", "João Pedro", "Armador", "Armação", "Ativo"]
  ];

  function showPreview() {
    const file = fileInput.files[0];
    if (!file) return;
    fileName.textContent = `Arquivo selecionado: ${file.name}`;
    fileName.hidden = false;
    preview.hidden = false;
    previewCount.textContent = "3 registros encontrados";
    previewBody.innerHTML = demoRows.map((row) => `<tr>${row.map((value) => `<td>${value}</td>`).join("")}</tr>`).join("");
    warning.textContent = "Prévia local. A validação das colunas será ampliada quando o importador do RM for implementado.";
    warning.hidden = false;
    result.hidden = true;
    confirmButton.disabled = false;
  }

  fileInput.addEventListener("change", showPreview);
  clearButton.addEventListener("click", () => {
    fileInput.value = "";
    fileName.hidden = true;
    preview.hidden = true;
    result.hidden = true;
  });
  confirmButton.addEventListener("click", () => {
    demoRows.forEach(([matricula, nome, funcao, setor, status]) => {
      window.portalEmployeeStore?.upsert({ matricula, nome, funcao, setor, encarregado: "", status: status.toLowerCase() === "ativo" ? "ativo" : "inativo" });
    });
    result.textContent = "Colaboradores incluídos ou atualizados na base local.";
    result.hidden = false;
    confirmButton.disabled = true;
  });
})();
