// Desenha a folha "Liberação coletiva" (liberação coletiva) como PDF vetorial A4 retrato (jsPDF), igual à tela.
// Uso: window.portalCollectivePdf.build(sheet, labels) -> Blob (uma folha), ou buildMany([[sheet, labels], ...]) -> Blob
// (várias folhas no mesmo PDF, cada uma começando numa página nova; usado na exportação do mês em Backup).
// Os textos já formatados vêm de collective-release-sheet.js (pdfFields).
(() => {
  const M = 10;          // margem (mm)
  const W = 190;         // largura útil (mm)
  const BOTTOM = 284;    // até onde as linhas podem ir antes de virar a página
  const GREY = [85, 85, 85];
  const TONES = { yes: [22, 128, 60], no: [198, 40, 53], wait: [139, 85, 21] };

  const newDoc = () => new window.jspdf.jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });

  // Desenha uma folha a partir da página atual do documento (que deve estar em branco).
  function draw(doc, sheet, f) {
    const firstPage = doc.getNumberOfPages();
    const line = (w = 0.25, color = 85) => { doc.setDrawColor(color); doc.setLineWidth(w); };
    const font = (style, size, color = [17, 17, 17], family = "helvetica") => { doc.setFont(family, style); doc.setFontSize(size); doc.setTextColor(...color); };
    const cell = (x, y, w, h, fill) => {
      if (fill) { doc.setFillColor(...fill); doc.rect(x, y, w, h, "FD"); } else doc.rect(x, y, w, h);
    };
    // Texto centralizado na vertical dentro de uma célula (até maxLines linhas, com quebra).
    const textIn = (value, x, y, w, h, { align = "left", size = 9, style = "normal", color, family, maxLines = 3, pad = 2 } = {}) => {
      font(style, size, color, family);
      const lines = doc.splitTextToSize(String(value ?? ""), w - pad * 2).slice(0, maxLines);
      const lh = size * 0.3528 * 1.2;
      const top = y + (h - lines.length * lh) / 2 + lh * 0.78;
      lines.forEach((l, i) => doc.text(l, align === "center" ? x + w / 2 : x + pad, top + i * lh, { align }));
    };

    // Assinatura por digital na linha do participante: desenho da digital + "Assinado por digital" e a hora.
    const drawBio = (bio, x, y, h) => {
      const size = h - 1;
      if (window.portalFingerprint) {
        line(0.1, 17);
        window.portalFingerprint.strokes(bio.seed).forEach((run) => {
          for (let k = 1; k < run.length; k += 1) {
            doc.line(x + 2 + run[k - 1][0] * size / 1.2, y + 0.5 + run[k - 1][1] * size / 1.2, x + 2 + run[k][0] * size / 1.2, y + 0.5 + run[k][1] * size / 1.2);
          }
        });
      }
      textIn(`Assinado por digital · ${bio.when}`, x + 3 + size / 1.2, y, 62 - size, h, { size: 6.5, color: GREY, maxLines: 1, pad: 0 });
    };

    // ---- Cabeçalho: logo | título | motivo + data
    const hy = M;
    const hh = 30;
    line(0.3);
    cell(M, hy, 50, hh);
    cell(M + 50, hy, 60, hh);
    cell(M + 110, hy, 80, hh * 0.65);
    cell(M + 110, hy + hh * 0.65, 80, hh * 0.35);
    textIn("DIRECIONAL", M, hy, 50, hh, { align: "center", size: 17, style: "bold", color: [68, 68, 68] });
    textIn("LIBERAÇÃO COLETIVA", M + 50, hy, 60, hh, { align: "center", size: 10, color: [119, 119, 119], family: "times" });
    textIn("MOTIVO", M + 110, hy, 22, hh * 0.65, { size: 6.5, color: [119, 119, 119], family: "times" });
    // Motivo longo: letra menor e mais linhas, para não cortar o texto.
    const mLen = String(f.motive || "").length;
    textIn(String(f.motive || "").toUpperCase(), M + 132, hy, 58, hh * 0.65, { size: mLen > 110 ? 7.5 : mLen > 70 ? 8.5 : 10, style: "bold", maxLines: mLen > 110 ? 6 : 5 });
    textIn("DATA", M + 110, hy + hh * 0.65, 22, hh * 0.35, { size: 6.5, color: [119, 119, 119], family: "times" });
    textIn(f.date, M + 132, hy + hh * 0.65, 58, hh * 0.35, { size: 11, style: "bold" });

    // ---- Assinaturas: encarregado, engenheiro, DP, portaria + horas
    let y = hy + hh + 4;
    const rh = 9;
    const rows = [
      ["Encarregado", f.foreman, f.requester, f.requesterTime],
      ["Engenheiro", f.engineer, f.engineerSigner, f.engineerTime],
      ["DP", f.dp, f.dpSigner, f.dpTime],
      ["Portaria", f.gate, f.gateSigner, f.gateTime]
    ];
    for (const [label, name, signer, time] of rows) {
      line(0.25);
      cell(M, y, 28, rh, [242, 242, 242]);
      cell(M + 28, y, 62, rh);
      cell(M + 90, y, 28, rh, [242, 242, 242]);
      cell(M + 118, y, 72, rh);
      textIn(label, M, y, 28, rh, { align: "center", size: 8, style: "bold", color: GREY, family: "times" });
      textIn(String(name || "").toUpperCase(), M + 28, y, 62, rh, { size: 8, color: GREY, maxLines: 2 });
      textIn("Assinatura", M + 90, y, 28, rh, { align: "center", size: 8, style: "bold", color: GREY, family: "times" });
      if (signer) {
        font("italic", 10);
        doc.text(doc.splitTextToSize(String(signer), 68)[0], M + 120, y + 4.6);
        font("normal", 6, GREY);
        doc.text(String(time || ""), M + 120, y + 7.6);
      }
      y += rh;
    }
    cell(M, y, 28, rh - 1, [242, 242, 242]);
    cell(M + 28, y, 162, rh - 1);
    textIn("Horas", M, y, 28, rh - 1, { align: "center", size: 8, style: "bold", color: GREY, family: "times" });
    textIn(f.hours, M + 28, y, 162, rh - 1, { size: 9, style: "bold", color: TONES[f.hoursTone] || TONES.wait });
    y += rh - 1 + 5;

    // ---- Participantes
    const cols = [12, 78, 38, 62];
    const heads = ["ID", "NOME", "Função", "Assinatura"];
    const header = () => {
      line(0.25);
      cell(M, y, W, 7, [238, 238, 238]);
      textIn("Participantes", M, y, W, 7, { align: "center", size: 9, style: "bold", color: GREY, family: "times" });
      y += 7;
      let x = M;
      cols.forEach((w, i) => { cell(x, y, w, 6, [238, 238, 238]); textIn(heads[i], x, y, w, 6, { align: "center", size: 7.5, style: "bold", color: GREY, family: "times" }); x += w; });
      y += 6;
    };
    header();
    const people = sheet.participants || [];
    const total = Math.max(24, people.length);
    // Cabe 24 linhas numa página só; com mais gente, as linhas ficam menores e, se precisar, a lista continua na página seguinte.
    const rowH = Math.max(5.2, Math.min(7.9, (BOTTOM - y) / Math.min(total, 40)));
    for (let i = 0; i < total; i += 1) {
      if (y + rowH > BOTTOM) { doc.addPage(); y = M; header(); }
      const person = people[i];
      let x = M;
      cols.forEach((w, c) => {
        line(0.25);
        cell(x, y, w, rowH);
        if (c === 0) textIn(i + 1, x, y, w, rowH, { align: "center", size: 7, color: GREY, family: "times" });
        else if (c === 1 && person) textIn(person.nome, x, y, w, rowH, { size: 9, maxLines: 1 });
        else if (c === 2 && person) textIn(String(person.funcao || "").toUpperCase(), x, y, w, rowH, { align: "center", size: 6.5, color: GREY, family: "times", maxLines: 2 });
        else if (c === 3 && f.participantBio?.[i]) drawBio(f.participantBio[i], x, y, rowH);
        x += w;
      });
      y += rowH;
    }

    // ---- Rodapé (numeração das páginas desta folha)
    const lastPage = doc.getNumberOfPages();
    const pages = lastPage - firstPage + 1;
    for (let p = firstPage; p <= lastPage; p += 1) {
      doc.setPage(p);
      font("normal", 7, [120, 120, 120]);
      doc.text(f.footer, M, 292);
      if (pages > 1) doc.text(`Página ${p - firstPage + 1} de ${pages}`, M + W, 292, { align: "right" });
    }
    doc.setPage(lastPage);
  }

  function build(sheet, f) {
    const doc = newDoc();
    draw(doc, sheet, f);
    return doc.output("blob");
  }

  function buildMany(items) {
    const doc = newDoc();
    items.forEach(([sheet, f], index) => {
      if (index) doc.addPage();
      draw(doc, sheet, f);
    });
    return doc.output("blob");
  }

  window.portalCollectivePdf = Object.freeze({ build, buildMany });
})();
