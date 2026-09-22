(() => {
  const fileInput = document.querySelector("#employee-file");
  const fileNameEl = document.querySelector("#file-name");
  const preview = document.querySelector("#import-preview");
  const previewBody = document.querySelector("#preview-body");
  const previewCount = document.querySelector("#preview-count");
  const warning = document.querySelector("#import-warning");
  const result = document.querySelector("#import-result");
  const confirmButton = document.querySelector("#confirm-import");
  const clearButton = document.querySelector("#clear-file");
  const summaryModalEl = document.querySelector("#import-summary-modal");
  const summaryText = document.querySelector("#import-summary-text");
  let parsedRows = [];
  let parsedInvalidCount = 0;
  let parsedDuplicateCount = 0;

  function situacaoToStatus(situacao) {
    return String(situacao || "").trim().toLowerCase() === "ativo" ? "ativo" : "inativo";
  }

  function parseXml(text) {
    const xmlDoc = new DOMParser().parseFromString(text, "application/xml");
    if (xmlDoc.querySelector("parsererror")) throw new Error("Arquivo XML inválido.");
    const nodes = Array.from(xmlDoc.getElementsByTagName("Detalhes"));
    const allRows = nodes.map((node) => ({
      matricula: (node.getAttribute("MATRICULA") || "").trim(),
      nome: (node.getAttribute("NOME") || "").trim(),
      funcao: (node.getAttribute("FUNCAO") || "").trim(),
      situacao: (node.getAttribute("SITUACAO") || "").trim()
    }));
    const invalidCount = allRows.filter((row) => !row.matricula).length;
    const seen = new Set();
    let duplicateCount = 0;
    const rows = [];
    allRows.filter((row) => row.matricula).forEach((row) => {
      const key = row.matricula.replace(/\D/g, "").slice(0, 7);
      if (seen.has(key)) {
        duplicateCount += 1;
        return;
      }
      seen.add(key);
      rows.push(row);
    });
    return { rows, invalidCount, duplicateCount };
  }

  function showWarning(message) {
    warning.textContent = message;
    warning.hidden = false;
  }

  function resetPreview() {
    parsedRows = [];
    parsedInvalidCount = 0;
    parsedDuplicateCount = 0;
    preview.hidden = true;
    previewBody.innerHTML = "";
    result.hidden = true;
    confirmButton.disabled = true;
  }

  function showSummaryModal({ imported, duplicates, invalid, errors }) {
    const lines = [
      `Importados com sucesso: ${imported}`,
      `Duplicados ignorados (mesma matrícula repetida no arquivo): ${duplicates}`,
      `Registros inválidos no arquivo (sem matrícula): ${invalid}`,
      `Erros ao salvar no banco de dados: ${errors}`
    ];
    summaryText.value = lines.join("\n");
    if (window.bootstrap?.Modal) {
      window.bootstrap.Modal.getOrCreateInstance(summaryModalEl).show();
    }
  }

  async function handleFile() {
    const file = fileInput.files[0];
    if (!file) return;
    fileNameEl.textContent = `Arquivo selecionado: ${file.name}`;
    fileNameEl.hidden = false;
    result.hidden = true;
    preview.hidden = false;
    warning.hidden = true;

    const extension = file.name.split(".").pop().toLowerCase();
    if (extension !== "xml") {
      previewBody.innerHTML = "";
      previewCount.textContent = "0 registros encontrados";
      showWarning("Por enquanto só a leitura de arquivos .xml (relatório do REPORTS) está disponível. Selecione um arquivo .xml.");
      confirmButton.disabled = true;
      parsedRows = [];
      return;
    }

    let parsed;
    try {
      const text = await file.text();
      parsed = parseXml(text);
    } catch (error) {
      previewBody.innerHTML = "";
      previewCount.textContent = "0 registros encontrados";
      showWarning("Não foi possível ler o arquivo. Confirme se é o relatório XML exportado do REPORTS (ATIVOS DAS OBRAS).");
      confirmButton.disabled = true;
      parsedRows = [];
      return;
    }

    parsedRows = parsed.rows;
    parsedInvalidCount = parsed.invalidCount;
    parsedDuplicateCount = parsed.duplicateCount;

    previewCount.textContent = `${parsedRows.length} registro${parsedRows.length === 1 ? "" : "s"} encontrado${parsedRows.length === 1 ? "" : "s"}`;
    previewBody.innerHTML = parsedRows.length
      ? parsedRows.map((row) => `<tr><td>${window.escapeHtml(row.matricula)}</td><td>${window.escapeHtml(row.nome)}</td><td>${window.escapeHtml(row.funcao)}</td><td>—</td><td>${window.escapeHtml(row.situacao)}</td></tr>`).join("")
      : '<tr><td colspan="5">Nenhum registro encontrado no arquivo.</td></tr>';

    const extraNotes = [];
    if (parsedDuplicateCount) extraNotes.push(`${parsedDuplicateCount} matrícula${parsedDuplicateCount === 1 ? "" : "s"} duplicada${parsedDuplicateCount === 1 ? "" : "s"} no arquivo (apenas a primeira ocorrência será importada)`);
    if (parsedInvalidCount) extraNotes.push(`${parsedInvalidCount} registro${parsedInvalidCount === 1 ? "" : "s"} sem matrícula ignorado${parsedInvalidCount === 1 ? "" : "s"}`);
    const baseNote = "O arquivo não traz frente de trabalho nem encarregado. Depois de importar, vincule o encarregado pela lista de colaboradores cadastrados (Administração).";
    showWarning(parsedRows.length
      ? [baseNote, ...extraNotes].join(" ")
      : "Nenhum registro <Detalhes> válido foi encontrado nesse XML.");
    confirmButton.disabled = parsedRows.length === 0;
  }

  fileInput.addEventListener("change", handleFile);
  clearButton.addEventListener("click", () => {
    fileInput.value = "";
    fileNameEl.hidden = true;
    resetPreview();
  });
  confirmButton.addEventListener("click", async () => {
    if (!parsedRows.length) return;
    confirmButton.disabled = true;
    const existing = await window.portalEmployeeStore.getAll();
    const existingByMatricula = new Map(existing.map((item) => [item.matricula, item]));
    const outcomes = await Promise.allSettled(parsedRows.map((row) => {
      const normalizedMatricula = row.matricula.replace(/\D/g, "").slice(0, 7);
      const current = existingByMatricula.get(normalizedMatricula);
      return window.portalEmployeeStore.upsert({
        matricula: row.matricula,
        nome: row.nome,
        funcao: row.funcao,
        setor: current?.setor || "",
        encarregado: current?.encarregado || "",
        status: situacaoToStatus(row.situacao)
      });
    }));
    const importedCount = outcomes.filter((outcome) => outcome.status === "fulfilled").length;
    const errorCount = outcomes.filter((outcome) => outcome.status === "rejected").length;
    result.textContent = `Importação concluída: ${importedCount} salvos, ${errorCount} com erro.`;
    result.hidden = false;
    showSummaryModal({
      imported: importedCount,
      duplicates: parsedDuplicateCount,
      invalid: parsedInvalidCount,
      errors: errorCount
    });
  });
})();
