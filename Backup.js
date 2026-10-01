(async () => {
  await window.portalAuthDemo?.ready();
  const session = window.portalAuthDemo?.getSession();
  const role = session?.roleValue;
  const isAdmin = role === "administrador-analista";
  const isDp = role === "dp" || !!window.portalAuthDemo?.isDpDelegate?.();
  const flow = window.portalReleaseFlow;
  const store = window.portalBackupStore;

  // Esta tela é do DP (o Administrador Analista também entra, por operar o portal do DP).
  if (!isDp && !isAdmin) {
    document.querySelector("#backup-denied").hidden = false;
    document.querySelector("#backup-grid").hidden = true;
    return;
  }

  // As regras do banco só deixam o administrador gravar colaboradores e matrículas permitidas (e listar estas últimas).
  const exportKeys = isAdmin ? ["releases", "employees", "allowedRegistrations"] : ["releases", "employees"];
  const importKeys = isAdmin ? ["releases", "employees", "allowedRegistrations"] : ["releases"];
  const labels = { releases: "Liberações", employees: "Colaboradores", allowedRegistrations: "Matrículas permitidas" };

  const $ = (selector) => document.querySelector(selector);
  const show = (element, text, isError) => {
    element.textContent = text;
    element.classList.toggle("is-error", !!isError);
    element.hidden = false;
  };
  const download = (blob, name) => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 2000);
  };
  const stamp = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  };

  $("#export-scope").innerHTML = exportKeys.map((key) => `<li>${labels[key]}</li>`).join("");

  // ---------- Exportar backup ----------
  $("#export-backup").addEventListener("click", async () => {
    const button = $("#export-backup");
    button.disabled = true;
    try {
      const backup = await store.exportData(exportKeys, session?.name);
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      download(blob, `backup-portal-obra-369_${stamp()}.json`);
      const lines = Object.entries(backup.counts).map(([key, total]) => `${labels[key]}: ${total}`);
      const skipped = Object.keys(backup.skipped);
      show($("#export-result"), `Backup gerado.\n${lines.join("\n")}${skipped.length ? `\nNão foi possível ler: ${skipped.map((key) => labels[key]).join(", ")}.` : ""}`);
    } catch (error) {
      console.error("Falha ao gerar o backup.", error);
      show($("#export-result"), "Não foi possível gerar o backup. Tente de novo.", true);
    } finally {
      button.disabled = false;
    }
  });

  // ---------- Importar backup ----------
  let loadedBackup = null;

  $("#import-file").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    loadedBackup = null;
    $("#import-summary").hidden = true;
    $("#import-result").hidden = true;
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text());
      const info = store.inspect(backup);
      loadedBackup = backup;
      const when = info.exportedAt ? new Date(info.exportedAt).toLocaleString("pt-BR") : "data desconhecida";
      const parts = Object.entries(info.counts).map(([key, total]) => `${labels[key]}: ${total}`);
      $("#import-summary-text").textContent = `Backup de ${when}${info.exportedBy ? ` (feito por ${info.exportedBy})` : ""}. ${parts.join(" · ")}.`;
      const available = importKeys.filter((key) => key in info.counts);
      const blocked = Object.keys(info.counts).filter((key) => !importKeys.includes(key));
      $("#import-scope").innerHTML = `
        <p class="mb-2"><strong>O que restaurar:</strong></p>
        ${available.map((key) => `<label class="d-block mb-1"><input type="checkbox" name="import-key" value="${key}" checked> ${labels[key]} (${info.counts[key]})</label>`).join("")}
        ${blocked.length ? `<small class="d-block mt-2">${blocked.map((key) => labels[key]).join(" e ")} só podem ser restaurados pelo Administrador Analista.</small>` : ""}`;
      $("#import-run").disabled = !available.length;
      $("#import-summary").hidden = false;
    } catch (error) {
      show($("#import-result"), error instanceof SyntaxError ? "O arquivo não é um backup válido (não consegui ler o conteúdo)." : error.message, true);
    }
  });

  $("#import-run").addEventListener("click", async () => {
    if (!loadedBackup) return;
    const keys = [...document.querySelectorAll('input[name="import-key"]:checked')].map((input) => input.value);
    if (!keys.length) {
      show($("#import-result"), "Marque pelo menos uma parte para restaurar.", true);
      return;
    }
    const mode = document.querySelector('input[name="import-mode"]:checked').value;
    const total = keys.reduce((sum, key) => sum + (loadedBackup.collections[key]?.length || 0), 0);
    const question = mode === "overwrite"
      ? `Restaurar ${total} registro(s) do backup?\n\nOS QUE JÁ EXISTEM SERÃO SOBRESCRITOS pela versão do arquivo (dados mais novos podem ser perdidos).\nNada é apagado do banco.`
      : `Restaurar o que está faltando (até ${total} registro(s))?\n\nO que já existe não é alterado. Nada é apagado do banco.`;
    if (!window.confirm(question)) return;
    const button = $("#import-run");
    button.disabled = true;
    try {
      const result = await store.restore(loadedBackup, { keys, mode });
      const lines = Object.entries(result).map(([key, stats]) => `${labels[key]}: ${stats.restored} restaurado(s), ${stats.skipped} já existia(m)${stats.failed ? `, ${stats.failed} com erro (${stats.error})` : ""}`);
      const failed = Object.values(result).some((stats) => stats.failed);
      show($("#import-result"), `${failed ? "Restauração concluída com erros." : "Restauração concluída."}\n${lines.join("\n")}`, failed);
    } catch (error) {
      console.error("Falha ao restaurar o backup.", error);
      show($("#import-result"), "Não foi possível restaurar o backup. Tente de novo.", true);
    } finally {
      button.disabled = false;
    }
  });

  // ---------- Exportar liberações para o Excel ----------
  const dateTime = (value) => (value ? new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "");
  const dateOnly = (value) => {
    if (!value) return "";
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("pt-BR");
  };
  const dayOf = (release) => release.date || release.createdAt?.slice(0, 10) || "";

  const columns = [
    ["Data", 12, (r) => dateOnly(dayOf(r))],
    ["Horário", 9, (r) => r.time || ""],
    ["Colaborador", 34, (r) => r.name || ""],
    ["Matrícula", 11, (r) => r.registration || ""],
    ["Função", 24, (r, ctx) => r.role || ctx.roles.get(r.registration) || ""],
    ["Movimentação", 15, (r) => flow.movementLabel(r)],
    ["Tipo do motivo", 14, (r) => (r.reasonType === "tarefa" ? "Tarefa" : r.reasonType === "particular" ? "Particular" : "")],
    ["Motivo / observação", 42, (r) => r.reasonDetail ?? String(r.reason || "").replace(/^(tarefa|particular):?\s*/i, "")],
    ["Tratamento das horas", 18, (r) => (r.bonusStatus === "approved" ? "Abonado" : r.bonusStatus === "denied" ? "Não abonado" : "Pendente")],
    ["Solicitante (encarregado)", 26, (r) => r.requester || ""],
    ["Solicitado em", 17, (r) => dateTime(r.requestedAt || r.createdAt)],
    ["Engenheiro", 26, (r) => r.engineer || ""],
    ["Decisão do engenheiro em", 20, (r) => dateTime(r.engineerDecisionAt)],
    ["Departamento Pessoal", 26, (r) => r.dpSigner || ""],
    ["Decisão do DP em", 17, (r) => dateTime(r.dpDecisionAt)],
    ["Portaria (saída)", 26, (r) => r.exitConfirmedBy || ""],
    ["Saída confirmada em", 19, (r) => dateTime(r.exitConfirmedAt)],
    ["Situação atual", 30, (r) => flow.stages[flow.stageOf(r)]?.label || ""],
    ["Abono lançado no RM", 16, (r) => (r.abonoLaunchedAt ? "Sim" : (r.bonusStatus === "approved" ? "Não" : ""))],
    ["Lançado por", 26, (r) => r.abonoLaunchedBy || ""],
    ["Lançado em", 17, (r) => dateTime(r.abonoLaunchedAt)],
    ["Motivo da recusa", 34, (r) => r.refusalReason || ""],
    ["Recusado por", 26, (r) => r.refusedBy || ""],
    ["Recusado em", 17, (r) => dateTime(r.refusedAt)]
  ];

  $("#export-excel").addEventListener("click", async () => {
    const button = $("#export-excel");
    const result = $("#excel-result");
    if (typeof ExcelJS === "undefined") {
      show(result, "Não foi possível carregar o gerador de Excel. Confira a internet e recarregue a página.", true);
      return;
    }
    button.disabled = true;
    try {
      const from = $("#excel-from").value;
      const to = $("#excel-to").value;
      const all = await window.portalDemoStore.getReleases();
      const chosen = all
        .filter((release) => (!from || (dayOf(release) && dayOf(release) >= from)) && (!to || (dayOf(release) && dayOf(release) <= to)))
        .sort((a, b) => `${dayOf(a)} ${a.time || ""}`.localeCompare(`${dayOf(b)} ${b.time || ""}`));
      if (!chosen.length) {
        show(result, "Nenhuma liberação nesse período.", true);
        return;
      }
      const employees = await window.portalEmployeeStore.getAll().catch(() => []);
      const ctx = { roles: new Map(employees.map((employee) => [employee.matricula, employee.funcao])) };

      const workbook = new ExcelJS.Workbook();
      workbook.creator = session?.name || "Portal DP";
      workbook.created = new Date();
      const sheet = workbook.addWorksheet("Liberações", { views: [{ state: "frozen", ySplit: 1, xSplit: 3 }] });
      sheet.columns = columns.map(([header, width]) => ({ header, width }));
      chosen.forEach((release) => sheet.addRow(columns.map(([, , read]) => read(release, ctx))));
      const header = sheet.getRow(1);
      header.height = 30;
      header.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF00142D" } };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      });
      sheet.eachRow((row, index) => {
        if (index === 1) return;
        row.alignment = { vertical: "top", wrapText: true };
        row.eachCell((cell) => { cell.border = { bottom: { style: "hair", color: { argb: "FFBFC9D6" } } }; });
      });
      sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };

      const count = (test) => chosen.filter(test).length;
      const summary = workbook.addWorksheet("Resumo");
      summary.columns = [{ width: 38 }, { width: 14 }];
      [
        ["Obra 369 · Liberações", ""],
        ["Período", from || to ? `${from ? dateOnly(from) : "início"} a ${to ? dateOnly(to) : "hoje"}` : "Todas"],
        ["Gerado em", dateTime(new Date().toISOString())],
        ["Gerado por", session?.name || ""],
        ["", ""],
        ["Total de liberações", chosen.length],
        ["Abonadas", count((r) => r.bonusStatus === "approved")],
        ["Não abonadas", count((r) => r.bonusStatus === "denied")],
        ["Sem decisão de abono", count((r) => !r.bonusStatus)],
        ["Abonos lançados no RM", count((r) => !!r.abonoLaunchedAt)],
        ["Abonos ainda por lançar no RM", count((r) => r.bonusStatus === "approved" && !r.abonoLaunchedAt)],
        ["Saídas confirmadas na portaria", count((r) => flow.stageOf(r) === "exited")],
        ["Recusadas (com o encarregado)", count((r) => flow.stageOf(r) === "foreman")],
        ["Negadas pelo DP", count((r) => flow.stageOf(r) === "closed")]
      ].forEach((row) => summary.addRow(row));
      summary.getRow(1).font = { bold: true, size: 14 };
      for (let index = 6; index <= 14; index += 1) summary.getRow(index).getCell(1).font = { bold: index === 6 };

      const buffer = await workbook.xlsx.writeBuffer();
      download(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `liberacoes-obra-369_${stamp()}.xlsx`);
      show(result, `Excel gerado com ${chosen.length} liberação(ões).`);
    } catch (error) {
      console.error("Falha ao gerar o Excel.", error);
      show(result, "Não foi possível gerar o Excel. Tente de novo.", true);
    } finally {
      button.disabled = false;
    }
  });
})();
