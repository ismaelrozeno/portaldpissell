// Desenha a folha de liberação como VETOR (texto de verdade) num documento jsPDF.
// Fica minúscula (alguns KB por folha), nítida em qualquer zoom e com texto pesquisável, ao contrário da imagem.
// Mesma disposição de release-image.js: coordenadas em "px de projeto" (794x559) convertidas para mm.
(() => {
  const WIDTH = 794;
  const HEIGHT = 559;
  const TONES = { approved: [22, 128, 60], denied: [198, 40, 53], pending: [139, 85, 21] };

  function drawSheet(doc, fields, x0, y0, widthMm) {
    const k = widthMm / WIDTH; // mm por px de projeto
    const pt = (px) => px * k * (72 / 25.4); // px de projeto -> pontos
    const X = (x) => x0 + x * k;
    const Y = (y) => y0 + y * k;
    const left = 32;
    const right = WIDTH - 32;

    const font = (style, size, color = [17, 17, 17], family = "helvetica") => {
      doc.setFont(family, style);
      doc.setFontSize(pt(size));
      doc.setTextColor(...color);
    };
    const text = (value, x, y, options) => doc.text(String(value ?? ""), X(x), Y(y), options);
    const width = (value) => doc.getTextWidth(String(value ?? "")) / k; // largura em px de projeto
    const rule = (x1, x2, y, dashed) => {
      doc.setDrawColor(dashed ? 119 : 34);
      doc.setLineWidth(0.15);
      doc.setLineDashPattern(dashed ? [1.4, 0.9] : [0.25, 0.55], 0);
      doc.line(X(x1), Y(y), X(x2), Y(y));
      doc.setLineDashPattern([], 0);
    };
    // Corta o texto (com reticências) para caber na largura.
    const fit = (value, maxWidth) => {
      let shown = String(value ?? "");
      if (width(shown) <= maxWidth) return shown;
      while (shown.length > 1 && width(`${shown}…`) > maxWidth) shown = shown.slice(0, -1);
      return `${shown}…`;
    };
    // Quebra em até maxLines linhas.
    const wrap = (value, maxWidth, maxLines) => {
      const lines = [];
      let current = "";
      for (const word of String(value || "").split(/\s+/)) {
        const test = current ? `${current} ${word}` : word;
        if (width(test) <= maxWidth || !current) current = test;
        else { lines.push(current); current = word; }
      }
      if (current) lines.push(current);
      if (lines.length > maxLines) {
        const kept = lines.slice(0, maxLines);
        kept[maxLines - 1] = fit(`${kept[maxLines - 1]} ${lines.slice(maxLines).join(" ")}`, maxWidth);
        return kept;
      }
      return lines;
    };
    const filled = (value, x, y, w, size) => {
      font("normal", size);
      text(fit(value, w - 4), x + 2, y);
      rule(x, x + w, y + 4);
    };

    // Moldura
    doc.setDrawColor(184);
    doc.setLineWidth(0.2);
    doc.rect(x0, y0, widthMm, HEIGHT * k);

    // Cabeçalho
    font("bold", 22, [18, 98, 160]);
    text("DIRECIONAL", left, 58);
    font("normal", 16);
    text("AUTORIZAÇÃO DE SAÍDA DE COLABORADORES", 470, 50, { align: "center" });
    font("bold", 12);
    text("DA FRENTE DE SERVIÇO", 470, 70, { align: "center" });
    rule(left, right, 84);

    // Obra e data
    font("bold", 14);
    text("OBRA:", left, 110);
    font("normal", 14);
    text("369", left + 48, 110);
    font("italic", 14);
    text(fields.date, right, 110, { align: "right" });
    const dateWidth = width(fields.date);
    font("bold", 14);
    text("DATA:", right - dateWidth - 8, 110, { align: "right" });
    rule(left, right, 124);

    // Colaborador e função
    font("bold", 14);
    text("O Sr.:", left, 150);
    filled(fields.name, left + 50, 150, 320, 14);
    font("bold", 14);
    text("Função:", 430, 150);
    filled(fields.role, 490, 150, right - 490, 14);
    rule(left, right, 168);

    // Horário
    font("bold", 14);
    text("Está autorizado no dia de hoje a partir das:", left, 194);
    filled(fields.time, 370, 194, 130, 14);
    font("normal", 14);
    text("hs", right, 194, { align: "right" });
    rule(left, right, 210);

    // Movimentação e motivo (☒ / ☐ desenhados como caixas: a fonte padrão do PDF não tem esses símbolos)
    font("bold", 13);
    text("Movimentação:", left, 236);
    font("normal", 13);
    text(fields.movement, left + 104, 236);
    font("bold", 13);
    text("Motivo da saída:", 290, 236);
    let cursor = 400;
    for (const part of String(fields.reason).split(/(☒|☐)/)) {
      if (part === "☒" || part === "☐") {
        const size = 10;
        doc.setDrawColor(34);
        doc.setLineWidth(0.2);
        doc.setLineDashPattern([], 0);
        doc.rect(X(cursor), Y(236 - size + 1), size * k, size * k);
        if (part === "☒") {
          doc.line(X(cursor), Y(236 - size + 1), X(cursor + size), Y(237));
          doc.line(X(cursor + size), Y(236 - size + 1), X(cursor), Y(237));
        }
        cursor += size + 4;
      } else if (part) {
        font("normal", 13);
        text(part.trim() ? part.replace(/^\s+/, "") : "", cursor, 236);
        cursor += width(part.replace(/^\s+/, "")) + (part.trim() ? 6 : 8);
      }
    }
    // Pedido do encarregado (o que ele marcou no formulário) fica na mesma linha do motivo da saída —
    // ali onde antes aparecia "release.hours" cru, que duplicava (e às vezes contradizia) o resultado
    // já mostrado embaixo em "Tratamento das horas".
    if (fields.bonusRequest) {
      font("normal", 13);
      const valueWidth = width(fields.bonusRequest);
      text(fields.bonusRequest, right, 236, { align: "right" });
      font("bold", 13);
      text("Pedido:", right - valueWidth - 4, 236, { align: "right" });
    }

    // Observação
    font("bold", 13);
    text("Motivo / observação:", left, 266);
    font("normal", 13);
    wrap(fields.observation, right - left, 2).forEach((row, index) => text(row, left, 288 + index * 17));
    rule(left, right, 318, true);
    rule(left, right, 326);

    // Tratamento das horas
    font("bold", 13);
    text("Tratamento das horas:", left, 348);
    font("bold", 17, TONES[fields.bonusTone] || TONES.pending);
    text(fields.bonus, left, 372);
    rule(left, right, 386);

    // Assinatura do colaborador
    font("normal", 13);
    text("Assinatura do colaborador:", left, 412);
    if (fields.employeeBio && window.portalFingerprint) {
      const bio = fields.employeeBio;
      doc.setDrawColor(17);
      doc.setLineWidth(0.12);
      window.portalFingerprint.strokes(bio.seed).forEach((run) => {
        for (let i = 1; i < run.length; i += 1) doc.line(X(214 + run[i - 1][0] * 32), Y(389 + run[i - 1][1] * 32), X(214 + run[i][0] * 32), Y(389 + run[i][1] * 32));
      });
      font("normal", 8, [17, 17, 17]);
      ["Assinado biometricamente por digital", bio.name.toUpperCase(), bio.when].forEach((row, i) => text(row, 252, 398 + i * 11));
      font("italic", 14, [17, 17, 17]);
      text(bio.name, 440, 416);
    } else if (fields.employeeSignature) {
      font("bold", 12, [23, 97, 59]);
      text(fields.employeeSignature, 200, 411);
    } else {
      rule(200, 560, 414);
    }
    rule(left, right, 428);

    // Assinaturas: nome em itálico (a fonte cursiva da imagem não existe no PDF)
    const columns = [
      ["SOLICITANTE (ENCARREGADO)", fields.requester, fields.requesterTime],
      ["ENGENHEIRO", fields.engineer, fields.engineerTime],
      ["DEPARTAMENTO PESSOAL", fields.dp, fields.dpTime],
      ["PORTARIA", fields.gate, fields.gateTime]
    ];
    const columnWidth = (right - left) / 4;
    columns.forEach(([title, name, when], index) => {
      const center = left + columnWidth * index + columnWidth / 2;
      font("bold", 8.5);
      text(title, center, 448, { align: "center" });
      font("italic", 14, [17, 17, 17], "times");
      const rows = wrap(name, columnWidth - 12, 2);
      rows.forEach((row, i) => text(row, center, 472 + i * 16, { align: "center" }));
      if (when) {
        font("normal", 9, [68, 68, 68]);
        text(when, center, 472 + rows.length * 16 + 4, { align: "center" });
      }
    });

    // Carimbo "lançado no RM", inclinado 14° como na tela
    if (fields.launched) {
      const angle = (-14 * Math.PI) / 180;
      const cx = 640;
      const cy = 358;
      const at = (dx, dy) => [X(cx + dx * Math.cos(angle) - dy * Math.sin(angle)), Y(cy + dx * Math.sin(angle) + dy * Math.cos(angle))];
      const red = [198, 40, 53];
      doc.setDrawColor(...red);
      doc.setLineDashPattern([], 0);
      const box = (hx, hy, lineWidth) => {
        doc.setLineWidth(lineWidth);
        const corners = [at(-hx, -hy), at(hx, -hy), at(hx, hy), at(-hx, hy)];
        corners.forEach((point, i) => { const next = corners[(i + 1) % 4]; doc.line(point[0], point[1], next[0], next[1]); });
      };
      box(92, 38, 0.5);
      box(88, 34, 0.15);
      const centered = (value, dy, style, size, family) => {
        font(style, size, red, family);
        const half = width(value) / 2;
        const [px, py] = at(-half, dy);
        doc.text(String(value), px, py, { angle: 14 });
      };
      centered("LANÇADO", 0, "bold", 32, "helvetica");
      centered("NO RM", 20, "bold", 19, "helvetica");
      centered(String(fields.stampDetail || "").toUpperCase(), 31, "bold", 9, "helvetica");
    }
  }

  // Monta um PDF A4 com duas folhas por página (a de baixo fica vazia se a última for ímpar).
  // Usado pela exportação em lote e pelo botão "Imprimir / salvar PDF" da folha, para saírem iguais.
  function build(releases, roleOf, meta = {}) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
    const marginX = 10;
    const width = 190;
    const height = width * (HEIGHT / WIDTH); // ~133,8 mm
    const gap = 9;
    const top = (297 - (height * 2 + gap)) / 2;
    const pages = Math.ceil(releases.length / 2);
    const label = meta.label || "Obra 369 · Autorizações de saída";
    for (let page = 0; page < pages; page += 1) {
      if (page) doc.addPage();
      for (let slot = 0; slot < 2; slot += 1) {
        const release = releases[page * 2 + slot];
        if (!release) break;
        drawSheet(doc, window.portalReleasePreview.sheetFields(release, roleOf(release)), marginX, top + slot * (height + gap), width);
      }
      if (releases.length > page * 2 + 1) {
        doc.setDrawColor(150);
        doc.setLineDashPattern([1.5, 1.5], 0);
        doc.line(marginX, top + height + gap / 2, marginX + width, top + height + gap / 2);
        doc.setLineDashPattern([], 0);
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(120);
      doc.text(label, marginX, 292);
      if (pages > 1) doc.text(`Página ${page + 1} de ${pages}`, marginX + width, 292, { align: "right" });
    }
    return doc.output("blob");
  }

  window.portalReleasePdf = Object.freeze({ WIDTH, HEIGHT, drawSheet, build });
})();
