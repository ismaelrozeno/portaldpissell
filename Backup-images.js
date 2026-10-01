// Exportar as folhas de liberação em imagem (PNG), separadas por dia, para arquivar o mês.
// Duas formas de salvar: direto numa pasta (Chrome/Edge, melhor para volumes enormes) ou em vários ZIPs.
(async () => {
  await window.portalAuthDemo?.ready();
  const role = window.portalAuthDemo?.getSession()?.roleValue;
  if (role !== "dp" && role !== "administrador-analista" && !window.portalAuthDemo?.isDpDelegate?.()) return; // Backup.js já mostra o aviso de acesso

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
    setTimeout(() => URL.revokeObjectURL(link.href), 60000);
  };
  const pad2 = (n) => String(n).padStart(2, "0");
  const localDay = (date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  const dayOf = (release) => release.date || release.createdAt?.slice(0, 10) || "";
  const pause = () => new Promise((resolve) => setTimeout(resolve, 0));

  // Sugestão: o mês atual, do dia 1 até hoje.
  const today = new Date();
  $("#images-from").value = localDay(new Date(today.getFullYear(), today.getMonth(), 1));
  $("#images-to").value = localDay(today);

  const supportsFolder = typeof window.showDirectoryPicker === "function";
  if (supportsFolder) {
    document.querySelector('input[name="images-mode"][value="folder"]').checked = true;
  } else {
    $("#images-mode-folder-label").hidden = true;
  }
  const currentFormat = () => document.querySelector('input[name="images-format"]:checked').value;
  const syncMode = () => {
    const format = currentFormat();
    $("#images-zip-options").hidden = format !== "png" || document.querySelector('input[name="images-mode"]:checked').value !== "zip";
    $("#images-pdf-options").hidden = format !== "pdf";
  };
  document.querySelectorAll('input[name="images-mode"], input[name="images-format"]').forEach((input) => input.addEventListener("change", syncMode));
  syncMode();

  // PDF: duas folhas por página A4 (release-pdf.js), com uma linha pontilhada de corte entre elas.
  function buildPdf(list, day, part, parts, roleOf) {
    const label = `Obra 369 · Autorizações de saída · ${day.split("-").reverse().join("/")}${parts > 1 ? ` · parte ${part}/${parts}` : ""}`;
    return window.portalReleasePdf.build(list, roleOf, { label });
  }

  const slug = (value) => String(value || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toUpperCase().slice(0, 40) || "SEM-NOME";
  const imageName = (release) => `${dayOf(release) || "sem-data"}_${(release.time || "00:00").replace(":", "-")}_${slug(release.name)}_${slug(release.registration)}_${String(release.id).slice(0, 6)}.png`;

  const kindFilters = {
    all: () => true,
    approved: (r) => r.bonusStatus === "approved",
    launched: (r) => r.bonusStatus === "approved" && !!r.abonoLaunchedAt,
    "pending-launch": (r) => r.bonusStatus === "approved" && !r.abonoLaunchedAt
  };

  let cancelled = false;
  $("#cancel-images").addEventListener("click", () => { cancelled = true; });

  $("#export-images").addEventListener("click", async () => {
    const result = $("#images-result");
    const progress = $("#images-progress");
    const start = $("#export-images");
    const mode = document.querySelector('input[name="images-mode"]:checked').value;
    const format = currentFormat();
    if (format === "pdf" && !window.jspdf?.jsPDF) {
      show(result, "Não foi possível carregar o gerador de PDF. Confira a internet e recarregue a página.", true);
      return;
    }
    if (format === "png" && mode === "zip" && typeof JSZip === "undefined") {
      show(result, "Não foi possível carregar o gerador de ZIP. Confira a internet e recarregue a página.", true);
      return;
    }
    const from = $("#images-from").value;
    const to = $("#images-to").value;
    const test = kindFilters[$("#images-kind").value] || kindFilters.all;
    let directory = null;
    if (mode === "folder") {
      try {
        directory = await window.showDirectoryPicker({ mode: "readwrite" });
      } catch (error) {
        return; // a pessoa fechou a janela de escolher a pasta
      }
    }
    start.disabled = true;
    cancelled = false;
    $("#cancel-images").hidden = false;
    progress.hidden = false;
    result.hidden = true;
    try {
      const all = await window.portalDemoStore.getReleases();
      const chosen = all
        .filter((release) => (!from || (dayOf(release) && dayOf(release) >= from)) && (!to || (dayOf(release) && dayOf(release) <= to)) && test(release))
        .sort((a, b) => `${dayOf(a)} ${a.time || ""}`.localeCompare(`${dayOf(b)} ${b.time || ""}`));
      if (!chosen.length) {
        show(result, "Nenhuma liberação nesse período.", true);
        return;
      }
      const employees = await window.portalEmployeeStore.getAll().catch(() => []);
      const roles = new Map(employees.map((employee) => [employee.matricula, employee.funcao]));
      const perZip = Number($("#images-per-zip").value) || 500;

      // Agrupa por dia: cada dia vira uma pasta (ou um ou mais ZIPs).
      const days = new Map();
      chosen.forEach((release) => {
        const day = dayOf(release) || "sem-data";
        if (!days.has(day)) days.set(day, []);
        days.get(day).push(release);
      });

      const total = chosen.length;
      progress.max = total;
      progress.value = 0;
      let done = 0;
      let failed = 0;
      let files = 0;
      const tick = async (day) => {
        done += 1;
        progress.value = done;
        if (done % 10 === 0) {
          show(result, `Gerando… ${done} de ${total} (${day})`, false);
          await pause(); // deixa a tela respirar
        }
      };
      const roleOf = (release) => release.role || roles.get(release.registration) || "";
      const png = (release) => window.portalReleaseImage.toPng(release, roleOf(release));
      const perPdf = Number($("#images-per-pdf").value) || 200;

      for (const [day, list] of days) {
        if (cancelled) break;
        if (format === "pdf") {
          // Um PDF por dia (dias muito cheios em partes); cada folha vira meia página A4.
          const parts = Math.ceil(list.length / perPdf);
          for (let part = 0; part < parts; part += 1) {
            if (cancelled) break;
            const slice = list.slice(part * perPdf, (part + 1) * perPdf);
            const pdfName = `liberacoes-obra-369_${day}${parts > 1 ? `_parte-${part + 1}` : ""}.pdf`;
            try {
              await pause();
              const blob = buildPdf(slice, day, part + 1, parts, roleOf);
              if (directory) {
                const handle = await directory.getFileHandle(pdfName, { create: true });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
              } else {
                download(blob, pdfName);
                await new Promise((resolve) => setTimeout(resolve, 500));
              }
              files += 1;
            } catch (error) {
              failed += slice.length;
              console.error("Falha ao gerar o PDF", pdfName, error);
            }
            done += slice.length;
            progress.value = done;
            show(result, `Gerando… ${done} de ${total} (${day})`, false);
          }
          continue;
        }
        if (mode === "folder") {
          const folder = await directory.getDirectoryHandle(day, { create: true });
          for (const release of list) {
            if (cancelled) break;
            try {
              const handle = await folder.getFileHandle(imageName(release), { create: true });
              const writable = await handle.createWritable();
              await writable.write(await png(release));
              await writable.close();
              files += 1;
            } catch (error) {
              failed += 1;
              console.error("Falha ao salvar a imagem", release.id, error);
            }
            await tick(day);
          }
        } else {
          for (let part = 0; part * perZip < list.length; part += 1) {
            if (cancelled) break;
            const zip = new JSZip();
            for (const release of list.slice(part * perZip, (part + 1) * perZip)) {
              if (cancelled) break;
              try {
                zip.file(imageName(release), await png(release));
              } catch (error) {
                failed += 1;
                console.error("Falha ao gerar a imagem", release.id, error);
              }
              await tick(day);
            }
            if (cancelled) break;
            const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
            download(blob, `liberacoes-obra-369_${day}${list.length > perZip ? `_parte-${part + 1}` : ""}.zip`);
            files += 1;
            await new Promise((resolve) => setTimeout(resolve, 500)); // dá tempo ao navegador de iniciar cada download
          }
        }
      }
      const where = format === "pdf"
        ? (mode === "folder" ? `${files} PDF(s) salvo(s) na pasta escolhida` : `${files} PDF(s) baixado(s)`)
        : (mode === "folder" ? `na pasta escolhida (uma subpasta por dia, ${days.size} no total)` : `${files} arquivo(s) ZIP baixado(s)`);
      const lines = [
        cancelled ? `Cancelado. ${done} de ${total} folha(s) processada(s).` : `Concluído: ${total - failed} folha(s) ${format === "pdf" ? "em PDF" : "em imagem"}, ${where}.`,
        failed ? `${failed} folha(s) deram erro e ficaram de fora.` : "",
        mode === "zip" && files > 1 ? "Se o navegador perguntar, permita baixar vários arquivos." : ""
      ].filter(Boolean);
      show(result, lines.join("\n"), failed > 0);
    } catch (error) {
      console.error("Falha ao exportar as imagens.", error);
      show(result, "Não foi possível gerar as imagens. Tente de novo.", true);
    } finally {
      start.disabled = false;
      $("#cancel-images").hidden = true;
      progress.hidden = true;
    }
  });
})();
