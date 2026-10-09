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

    // ===== Folha v2 (quadros): MESMAS medidas da tela (css/components/release-preview.css, .release-sheet-v2) =====
    const INK = [20, 33, 47];
    const MUTED = [91, 104, 120];
    const box = (x, y, w, h, fill) => {
      doc.setDrawColor(154, 166, 180);
      doc.setLineWidth(1 * k);
      doc.setLineDashPattern([], 0);
      if (fill) { doc.setFillColor(...fill); doc.rect(X(x), Y(y), w * k, h * k, "FD"); } else doc.rect(X(x), Y(y), w * k, h * k);
    };
    const label = (value, x, y, align) => { font("bold", 10.5, MUTED); text(value, x, y, align ? { align } : undefined); };
    const value = (val, x, y, maxWidth, size = 15) => { font("bold", size, INK); text(fit(val, maxWidth), x, y); };

    // Moldura clara da folha
    doc.setDrawColor(200);
    doc.setLineWidth(0.2);
    doc.rect(x0, y0, widthMm, HEIGHT * k);

    // Cabeçalho: marca, título e quadros de obra/data; linha azul forte embaixo
    font("bold", 24, [18, 98, 160]);
    text("DIRECIONAL", 24, 61);
    font("bold", 16, [18, 53, 95]);
    text("Autorização de saída de colaboradores", 415, 50, { align: "center" });
    font("bold", 11, MUTED);
    text("da frente de serviço", 415, 66, { align: "center" });
    box(600, 26, 70, 54);
    box(670, 26, 100, 54);
    label("Obra", 610, 43);
    value("369", 610, 64, 52);
    label("Data", 680, 43);
    value(fields.date, 680, 64, 82);
    doc.setDrawColor(18, 53, 95);
    doc.setLineWidth(2 * k);
    doc.line(X(24), Y(86), X(770), Y(86));

    // Colaborador e função
    box(24, 96, 496, 52);
    box(520, 96, 250, 52);
    label("Colaborador", 34, 113);
    value(fields.name, 34, 135, 476, 16);
    label("Função", 530, 113);
    value(fields.role, 530, 135, 230, 16);

    // Horário, movimentação, motivo e pedido
    [[24, 162], [186, 162], [348, 252], [600, 170]].forEach(([x, w]) => box(x, 148, w, 52));
    label("Saída a partir das", 34, 165);
    value(`${fields.time} h`, 34, 186, 142);
    label("Movimentação", 196, 165);
    value(fields.movement, 196, 186, 142);
    label("Motivo da saída", 358, 165);
    // ☒ / ☐ desenhados como caixas (a fonte padrão do PDF não tem esses símbolos)
    let cursor = 358;
    for (const part of String(fields.reason).split(/(☒|☐)/)) {
      if (part === "☒" || part === "☐") {
        const size = 11;
        doc.setDrawColor(...INK);
        doc.setLineWidth(1 * k);
        doc.rect(X(cursor), Y(186 - size + 1), size * k, size * k);
        if (part === "☒") {
          doc.line(X(cursor), Y(186 - size + 1), X(cursor + size), Y(187));
          doc.line(X(cursor + size), Y(186 - size + 1), X(cursor), Y(187));
        }
        cursor += size + 5;
      } else if (part.trim()) {
        font("bold", 15, INK);
        const piece = part.trim();
        text(piece, cursor, 186);
        cursor += width(piece) + 12;
      }
    }
    label("Pedido do encarregado", 610, 165);
    value(fields.bonusRequest || "—", 610, 186, 150);

    // Observação e tratamento das horas (quadro colorido)
    const HOURS_FILL = { approved: [233, 247, 239], denied: [253, 236, 237], pending: [255, 247, 232] };
    box(24, 200, 536, 78);
    box(560, 200, 210, 78, HOURS_FILL[fields.bonusTone] || HOURS_FILL.pending);
    label("Motivo / observação", 34, 217);
    font("normal", 13.5, INK);
    wrap(fields.observation, 516, 2).forEach((row, index) => text(row, 34, 238 + index * 18));
    label("Tratamento das horas", 570, 217);
    font("bold", fields.bonusTone === "pending" ? 18 : 22, TONES[fields.bonusTone] || TONES.pending);
    text(fit(fields.bonus, 190), 570, 249);

    // Assinatura do colaborador
    box(24, 278, 746, 74);
    label("Assinatura do colaborador", 34, 295);
    if (fields.employeeBio && window.portalFingerprint) {
      const bio = fields.employeeBio;
      doc.setDrawColor(...INK);
      doc.setLineWidth(0.12);
      window.portalFingerprint.strokes(bio.seed).forEach((run) => {
        for (let i = 1; i < run.length; i += 1) doc.line(X(34 + run[i - 1][0] * 38), Y(300 + run[i - 1][1] * 38), X(34 + run[i][0] * 38), Y(300 + run[i][1] * 38));
      });
      font("normal", 9, [59, 74, 92]);
      ["ASSINADO BIOMETRICAMENTE POR DIGITAL", String(bio.name).toUpperCase(), bio.when].forEach((row, i) => text(row, 90, 314 + i * 11));
      font("italic", 18, INK, "times");
      text(fit(bio.name, 330), 730, 330, { align: "right" });
    } else if (fields.employeeSignature) {
      font("bold", 12, [23, 97, 59]);
      text(fields.employeeSignature, 34, 330);
    } else {
      doc.setDrawColor(...INK);
      doc.setLineWidth(1 * k);
      doc.line(X(200), Y(340), X(560), Y(340));
    }

    // Assinaturas: solicitante, engenheiro, DP e portaria
    const columns = [
      ["Solicitante (encarregado)", fields.requester, fields.requesterTime],
      ["Engenheiro", fields.engineer, fields.engineerTime],
      ["Departamento Pessoal", fields.dp, fields.dpTime],
      ["Portaria", fields.gate, fields.gateTime]
    ];
    const columnWidth = 746 / 4;
    columns.forEach(([title, name, when], index) => {
      const x = 24 + columnWidth * index;
      const center = x + columnWidth / 2;
      box(x, 352, columnWidth, 118);
      font("bold", 10, MUTED);
      text(title, center, 369, { align: "center" });
      font("italic", 16, INK, "times");
      wrap(name, columnWidth - 20, 2).forEach((row, i) => text(row, center, 399 + i * 20, { align: "center" }));
      doc.setDrawColor(154, 166, 180);
      doc.setLineWidth(1 * k);
      doc.line(X(center - columnWidth * 0.4), Y(427), X(center + columnWidth * 0.4), Y(427));
      if (when) {
        font("normal", 10, MUTED);
        text(when, center, 443, { align: "center" });
      }
    });
    font("normal", 10, [138, 149, 163]);
    text("Liberação registrada no Portal DP · Obra 369", 24, 492);

    // Carimbo "lançado no RM", inclinado 14° como na tela
    if (fields.launched) {
      const angle = (-14 * Math.PI) / 180;
      // Sobre o quadro do tratamento das horas (mesmo lugar da tela)
      const cx = 668;
      const cy = 236;
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
