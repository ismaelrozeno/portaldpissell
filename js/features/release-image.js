// Desenha a folha de liberação (meia A4, 794x559) numa imagem PNG, direto no canvas.
// Não depende da tela: é rápido o bastante para milhares de folhas. Os textos vêm de
// window.portalReleasePreview.sheetFields, os mesmos da tela "Visualizar liberação".
(() => {
  const WIDTH = 794;
  const HEIGHT = 559;
  const SCALE = 2; // 1588x1118 px: nítida para imprimir/arquivar
  const SANS = "Arial, Helvetica, sans-serif";
  const SCRIPT = '"Segoe Script", "Bradley Hand", "Comic Sans MS", cursive';
  const TONES = { approved: "#16803c", denied: "#c62835", pending: "#8b5515" };

  function line(ctx, x1, x2, y, style) {
    ctx.save();
    ctx.strokeStyle = style === "dashed" ? "#777" : "#222";
    ctx.lineWidth = 1;
    ctx.setLineDash(style === "dashed" ? [5, 3] : [1, 2]);
    ctx.beginPath();
    ctx.moveTo(x1, y + 0.5);
    ctx.lineTo(x2, y + 0.5);
    ctx.stroke();
    ctx.restore();
  }

  function text(ctx, value, x, y, { font = `13px ${SANS}`, color = "#111", align = "left" } = {}) {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(String(value ?? ""), x, y);
  }

  // Quebra o texto em até "maxLines" linhas que caibam em "maxWidth"; corta com reticências se passar.
  function wrap(ctx, value, maxWidth, maxLines) {
    const words = String(value || "").split(/\s+/);
    const lines = [];
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width <= maxWidth || !current) current = test;
      else { lines.push(current); current = word; }
    }
    if (current) lines.push(current);
    if (lines.length > maxLines) {
      const kept = lines.slice(0, maxLines);
      let last = kept[maxLines - 1];
      while (last.length && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
      kept[maxLines - 1] = `${last}…`;
      return kept;
    }
    return lines;
  }

  // Um valor sublinhado (como o campo preenchido no papel), cortado se não couber.
  function field(ctx, value, x, y, width, options) {
    ctx.font = options?.font || `13px ${SANS}`;
    let shown = String(value ?? "");
    while (shown.length > 1 && ctx.measureText(shown).width > width - 4) shown = shown.slice(0, -1);
    if (shown !== String(value ?? "")) shown = `${shown.slice(0, -1)}…`;
    text(ctx, shown, x + 2, y, options);
    line(ctx, x, x + width, y + 4);
  }

  function draw(fields, scale = SCALE) {
    const canvas = document.createElement("canvas");
    canvas.width = WIDTH * scale;
    canvas.height = HEIGHT * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    ctx.textBaseline = "alphabetic";

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.strokeStyle = "#b8b8b8";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, WIDTH - 1, HEIGHT - 1);

    const left = 32;
    const right = WIDTH - 32;
    const bold = (size) => `700 ${size}px ${SANS}`;

    // Cabeçalho
    ctx.save();
    ctx.font = bold(22);
    ctx.fillStyle = "#1262a0";
    if ("letterSpacing" in ctx) ctx.letterSpacing = "1px";
    ctx.textAlign = "left";
    ctx.fillText("DIRECIONAL", left, 58);
    ctx.restore();
    text(ctx, "AUTORIZAÇÃO DE SAÍDA DE COLABORADORES", 470, 50, { font: `16px ${SANS}`, align: "center" });
    text(ctx, "DA FRENTE DE SERVIÇO", 470, 70, { font: bold(12), align: "center" });
    line(ctx, left, right, 84);

    // Obra e data
    text(ctx, "OBRA:", left, 110, { font: bold(14) });
    text(ctx, "369", left + 48, 110, { font: `14px ${SANS}` });
    text(ctx, fields.date, right, 110, { font: `italic 14px ${SANS}`, align: "right" });
    ctx.font = `italic 14px ${SANS}`;
    text(ctx, "DATA:", right - ctx.measureText(fields.date).width - 8, 110, { font: bold(14), align: "right" });
    line(ctx, left, right, 124);

    // Colaborador e função
    text(ctx, "O Sr.:", left, 150, { font: bold(14) });
    field(ctx, fields.name, left + 50, 150, 320, { font: `14px ${SANS}` });
    text(ctx, "Função:", 430, 150, { font: bold(14) });
    field(ctx, fields.role, 490, 150, right - 490, { font: `14px ${SANS}` });
    line(ctx, left, right, 168);

    // Horário
    text(ctx, "Está autorizado no dia de hoje a partir das:", left, 194, { font: bold(14) });
    field(ctx, fields.time, 370, 194, 130, { font: `14px ${SANS}` });
    text(ctx, "hs", right, 194, { font: `14px ${SANS}`, align: "right" });
    line(ctx, left, right, 210);

    // Movimentação e motivo
    text(ctx, "Movimentação:", left, 236, { font: bold(13) });
    text(ctx, fields.movement, left + 104, 236, { font: `13px ${SANS}` });
    text(ctx, "Motivo da saída:", 290, 236, { font: bold(13) });
    text(ctx, fields.reason, 400, 236, { font: `13px ${SANS}` });
    // Pedido do encarregado (o que ele marcou no formulário) fica na mesma linha do motivo da saída —
    // ali onde antes aparecia "release.hours" cru, que duplicava (e às vezes contradizia) o resultado
    // já mostrado embaixo em "Tratamento das horas".
    if (fields.bonusRequest) {
      ctx.font = `13px ${SANS}`;
      const valueWidth = ctx.measureText(fields.bonusRequest).width;
      text(ctx, fields.bonusRequest, right, 236, { font: `13px ${SANS}`, align: "right" });
      text(ctx, "Pedido:", right - valueWidth - 4, 236, { font: bold(13), align: "right" });
    }

    // Observação
    text(ctx, "Motivo / observação:", left, 266, { font: bold(13) });
    ctx.font = `13px ${SANS}`;
    const obs = wrap(ctx, fields.observation, right - left, 2);
    obs.forEach((row, index) => text(ctx, row, left, 288 + index * 17, { font: `13px ${SANS}` }));
    line(ctx, left, right, 318, "dashed");
    line(ctx, left, right, 326);

    // Tratamento das horas
    text(ctx, "Tratamento das horas:", left, 348, { font: bold(13) });
    text(ctx, fields.bonus, left, 372, { font: bold(17), color: TONES[fields.bonusTone] || TONES.pending });
    line(ctx, left, right, 386);

    // Assinatura do colaborador
    text(ctx, "Assinatura do colaborador:", left, 412, { font: `13px ${SANS}` });
    if (fields.employeeBio && window.portalFingerprint) {
      const bio = fields.employeeBio;
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 0.9;
      ctx.lineCap = "round";
      window.portalFingerprint.strokes(bio.seed).forEach((run) => {
        ctx.beginPath();
        run.forEach(([x, y], index) => (index ? ctx.lineTo(214 + x * 32, 389 + y * 32) : ctx.moveTo(214 + x * 32, 389 + y * 32)));
        ctx.stroke();
      });
      ["Assinado biometricamente por digital", bio.name.toUpperCase(), bio.when].forEach((row, i) => text(ctx, row, 252, 398 + i * 11, { font: `8.5px ${SANS}` }));
      text(ctx, bio.name, 440, 416, { font: `15px ${SCRIPT}` });
    } else if (fields.employeeSignature) text(ctx, fields.employeeSignature, 200, 411, { font: bold(12), color: "#17613b" });
    else line(ctx, 200, 560, 414);
    line(ctx, left, right, 428);

    // Assinaturas
    const columns = [
      ["SOLICITANTE (ENCARREGADO)", fields.requester, fields.requesterTime],
      ["ENGENHEIRO", fields.engineer, fields.engineerTime],
      ["DEPARTAMENTO PESSOAL", fields.dp, fields.dpTime],
      ["PORTARIA", fields.gate, fields.gateTime]
    ];
    const columnWidth = (right - left) / 4;
    columns.forEach(([title, name, when], index) => {
      const center = left + columnWidth * index + columnWidth / 2;
      text(ctx, title, center, 448, { font: bold(8.5), align: "center" });
      ctx.font = `14px ${SCRIPT}`;
      const rows = wrap(ctx, name, columnWidth - 12, 2);
      rows.forEach((row, i) => text(ctx, row, center, 472 + i * 16, { font: `14px ${SCRIPT}`, align: "center" }));
      if (when) text(ctx, when, center, 472 + rows.length * 16 + 4, { font: `9px ${SANS}`, color: "#444", align: "center" });
    });

    // Carimbo "lançado no RM"
    if (fields.launched) {
      ctx.save();
      ctx.translate(640, 358);
      ctx.rotate((-14 * Math.PI) / 180);
      ctx.strokeStyle = "#c62835";
      ctx.fillStyle = "#c62835";
      ctx.globalAlpha = 0.88;
      ctx.lineWidth = 3;
      ctx.strokeRect(-92, -38, 184, 76);
      ctx.lineWidth = 1;
      ctx.strokeRect(-88, -34, 176, 68);
      ctx.textAlign = "center";
      ctx.font = "34px Impact, 'Arial Black', Arial, sans-serif";
      ctx.fillText("LANÇADO", 0, 0);
      ctx.font = "20px Impact, 'Arial Black', Arial, sans-serif";
      ctx.fillText("NO RM", 0, 20);
      ctx.font = `700 9px ${SANS}`;
      ctx.fillText(String(fields.stampDetail || "").toUpperCase(), 0, 31);
      ctx.restore();
    }
    return canvas;
  }

  const toBlob = (canvas) => new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Falha ao gerar a imagem."))), "image/png");
  });

  window.portalReleaseImage = Object.freeze({
    WIDTH,
    HEIGHT,
    draw,
    // Devolve o PNG da folha da liberação.
    async toPng(release, role) {
      const canvas = draw(window.portalReleasePreview.sheetFields(release, role));
      const blob = await toBlob(canvas);
      canvas.width = 0; // libera a memória do canvas
      return blob;
    }
  });
})();
