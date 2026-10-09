// "Apresentação do mês" (PowerPoint .pptx) da página Backup e exportação: os indicadores e gráficos do mês num deck
// pronto para apresentar, gerado no próprio navegador (pptxgenjs, carregado só no clique). Visual inspirado no modelo
// da obra (azul e vermelho, linhas diagonais finas), sem marca de terceiros: no lugar do logo, "OBRA 369".
// Os gráficos saem como gráficos nativos do PowerPoint (dá para editar depois).
// Uso: botão #export-pptx + seletor #pptx-month em Backup.html. Também: window.portalReportPptx.build(mes, releases, sheets)
(() => {
  const PPTX_CDN = "https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js";

  // Cores do modelo (fundos e títulos) e paleta dos gráficos (validada para daltonismo; os gráficos levam os números escritos).
  const NAVY = "06428E";
  const NAVY_DARK = "04316A";
  const RED = "CC0835";
  const INK = "1B2A3A";
  const MUTED = "5B6B7F";
  const LINE = "E3E8EF";
  const SERIES = ["1F5FBF", "CC0835", "74AEF9", "E9A100", "1E9E5A", "8E5BD8"];
  const FONT = "Arial";

  // ---------- Datas e textos ----------
  const pad = (n) => String(n).padStart(2, "0");
  const dayOf = (value) => {
    const date = value ? new Date(value) : null;
    return !date || Number.isNaN(date.getTime()) ? "" : `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };
  const monthLabel = (key) => {
    const [y, m] = key.split("-").map(Number);
    const text = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return text.charAt(0).toUpperCase() + text.slice(1);
  };
  const plural = (n, one, many) => `${n.toLocaleString("pt-BR")} ${n === 1 ? one : many}`;
  const title = (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  const PARTICLES = ["da", "de", "do", "das", "dos", "e"];
  const personName = (name) => {
    const words = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!words.length) return "Sem nome";
    const second = words.slice(1).find((word) => !PARTICLES.includes(word.toLowerCase()));
    return [words[0], second].filter(Boolean).map(title).join(" ");
  };
  const shortNames = (names) => (name) => {
    const first = (value) => value.split(" ")[0].toLowerCase();
    const clash = names.some((other) => other.toLowerCase() !== name.toLowerCase() && first(other) === first(name));
    return name.split(" ").slice(0, clash ? 2 : 1).map(title).join(" ");
  };
  const duration = (minutes) => {
    if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min`;
    if (minutes < 1440) return `${(minutes / 60).toFixed(1).replace(".", ",").replace(",0", "")} h`;
    return `${(minutes / 1440).toFixed(1).replace(".", ",").replace(",0", "")} ${minutes < 2880 ? "dia" : "dias"}`;
  };
  const clean = (value) => String(value || "").trim().replace(/\s+/g, " ");

  // ---------- Números do mês ----------
  function compute(month, releases, sheets) {
    const flow = window.portalReleaseFlow;
    const col = window.portalCollectiveSheet;
    const stageInd = (r) => flow.stageOf(r);
    const stageCol = (s) => col?.stageOf(s) || s.stage || "engineer";
    const recordDay = (r) => String(r.date || "").slice(0, 10) || dayOf(r.createdAt);
    const createdDay = (r) => dayOf(r.createdAt) || recordDay(r);
    const inMonth = (r) => recordDay(r).startsWith(month);
    const createdIn = (r) => createdDay(r).startsWith(month);
    const live = (stage) => !["foreman", "closed"].includes(stage);
    const people = (s) => (s.participants || []).length;

    const ind = releases.filter(inMonth);
    const cols = sheets.filter(inMonth);
    const indLive = ind.filter((r) => live(stageInd(r)));
    const colLive = cols.filter((s) => live(stageCol(s)));
    const all = [...ind.map((r) => ({ r, kind: "ind", stage: stageInd(r) })), ...cols.map((s) => ({ r: s, kind: "col", stage: stageCol(s) }))];

    // Resumo
    const exits = indLive.length + colLive.reduce((a, s) => a + people(s), 0);
    const decided = all.filter((x) => x.r.bonusStatus);
    const approved = decided.filter((x) => x.r.bonusStatus === "approved");
    const launched = approved.filter((x) => x.r.abonoLaunchedAt);
    const retro = ind.filter((r) => flow.isRetroactive(r)).length + cols.filter((s) => col?.isRetroactive(s)).length;
    const pendingBio = indLive.filter((r) => r.employeeSignature?.method !== "biometria");
    const pendingBioPeople = pendingBio.length + colLive.reduce((a, s) => a + Math.max(0, people(s) - (col?.signedCount(s) || 0)), 0);

    // Liberações criadas por dia
    const [y, m] = month.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const today = new Date();
    const days = (today.getFullYear() === y && today.getMonth() + 1 === m) ? today.getDate() : lastDay;
    const perDayInd = Array(days).fill(0);
    const perDayCol = Array(days).fill(0);
    releases.filter(createdIn).forEach((r) => { const d = Number(createdDay(r).slice(8, 10)); if (d >= 1 && d <= days) perDayInd[d - 1] += 1; });
    sheets.filter(createdIn).forEach((s) => { const d = Number(createdDay(s).slice(8, 10)); if (d >= 1 && d <= days) perDayCol[d - 1] += 1; });

    // Situação
    const stageGroups = [
      ["Aguardando engenheiro", ["engineer"]], ["Aguardando DP", ["dp"]], ["Aguardando saída", ["gate"]],
      ["Saída confirmada", ["exited"]], ["Retroativa registrada", ["registered"]], ["Recusada ou negada", ["foreman", "closed"]]
    ].map(([label, keys]) => ({ label, value: all.filter((x) => keys.includes(x.stage)).length }));

    // Rankings
    const rank = (map, n) => [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n);
    const creatorsMap = new Map();
    releases.filter(createdIn).forEach((r) => creatorsMap.set(clean(r.requester) || "Sem solicitante", (creatorsMap.get(clean(r.requester) || "Sem solicitante") || 0) + 1));
    sheets.filter(createdIn).forEach((s) => creatorsMap.set(clean(s.requester) || "Sem solicitante", (creatorsMap.get(clean(s.requester) || "Sem solicitante") || 0) + 1));
    const creatorShort = shortNames([...creatorsMap.keys()]);
    const creators = rank(creatorsMap, 8).map(([name, v]) => [creatorShort(name), v]);
    const peopleMap = new Map();
    indLive.forEach((r) => peopleMap.set(personName(r.name), (peopleMap.get(personName(r.name)) || 0) + 1));
    colLive.forEach((s) => (s.participants || []).forEach((p) => peopleMap.set(personName(p.nome), (peopleMap.get(personName(p.nome)) || 0) + 1)));
    const frequent = rank(peopleMap, 8);

    // Tarefa x Particular (pessoas; coletiva é sempre tarefa)
    let tarefa = colLive.reduce((a, s) => a + people(s), 0);
    let particular = 0;
    indLive.forEach((r) => {
      const type = r.reasonType || (/^particular/i.test(r.reason || "") ? "particular" : /^tarefa/i.test(r.reason || "") ? "tarefa" : "");
      if (type === "particular") particular += 1; else if (type === "tarefa") tarefa += 1;
    });

    // Horário das saídas (pessoas)
    const hourMap = new Map();
    const addHour = (time, n) => { const h = parseInt(String(time || "").slice(0, 2), 10); if (!Number.isNaN(h)) hourMap.set(h, (hourMap.get(h) || 0) + n); };
    indLive.forEach((r) => addHour(r.time, 1));
    colLive.forEach((s) => addHour(s.time, people(s)));
    const seen = [...hourMap.keys()];
    const fromH = Math.min(7, ...seen);
    const toH = Math.max(17, ...seen);
    const hours = Array.from({ length: toH - fromH + 1 }, (_, i) => [`${fromH + i}h`, hourMap.get(fromH + i) || 0]);

    // Abono: tempo de resposta por engenheiro (decididas no mês) e pendências por destino (situação de agora)
    const resp = new Map();
    [...releases, ...sheets].forEach((r) => {
      if (!r.engineerDecisionAt || !r.engineer || !dayOf(r.engineerDecisionAt).startsWith(month)) return;
      const minutes = (new Date(r.engineerDecisionAt) - new Date(r.requestedAt || r.createdAt)) / 60000;
      if (!(minutes >= 0)) return;
      const key = clean(r.engineer);
      const item = resp.get(key) || { sum: 0, n: 0 };
      item.sum += minutes; item.n += 1; resp.set(key, item);
    });
    const engShort = shortNames([...resp.keys()]);
    const response = [...resp.entries()].map(([name, v]) => ({ name: engShort(name), hours: +(v.sum / v.n / 60).toFixed(1), n: v.n, label: duration(v.sum / v.n) }))
      .sort((a, b) => a.hours - b.hours);
    const respAll = [...resp.values()].reduce((acc, v) => ({ sum: acc.sum + v.sum, n: acc.n + v.n }), { sum: 0, n: 0 });
    const waiting = [...releases.map((r) => ({ r, stage: stageInd(r) })), ...sheets.map((s) => ({ r: s, stage: stageCol(s) }))]
      .filter((x) => !x.r.bonusStatus && live(x.stage));
    const waitMap = new Map();
    waiting.forEach((x) => { const key = clean(x.r.targetEngineer) || "Todos os engenheiros"; waitMap.set(key, (waitMap.get(key) || 0) + 1); });
    const waitShort = shortNames([...waitMap.keys()].filter((k) => k !== "Todos os engenheiros"));
    const waitingBy = rank(waitMap, 8).map(([name, v]) => [name === "Todos os engenheiros" ? "Todos" : waitShort(name), v]);

    // Recusas do mês (motivos)
    const refusalMap = new Map();
    all.forEach((x) => (x.r.refusalReasons || (x.r.refusalReason ? [x.r.refusalReason] : [])).forEach((reason) => refusalMap.set(clean(reason), (refusalMap.get(clean(reason)) || 0) + 1)));
    const refusals = rank(refusalMap, 6);

    // Listas de pendências (as mais antigas primeiro)
    const fmt = (value) => String(value || "").slice(0, 10).split("-").reverse().join("/");
    const bioList = [
      ...pendingBio.map((r) => [personName(r.name), fmt(recordDay(r)), "Individual", creatorShort(clean(r.requester) || "Sem solicitante")]),
      ...colLive.filter((s) => people(s) > (col?.signedCount(s) || 0)).map((s) => [`${people(s) - (col?.signedCount(s) || 0)} na coletiva "${clean(s.motive).slice(0, 26)}"`, fmt(recordDay(s)), "Coletiva", creatorShort(clean(s.requester) || "Sem solicitante")])
    ].sort((a, b) => a[1].split("/").reverse().join("").localeCompare(b[1].split("/").reverse().join("")));
    const launchList = approved.filter((x) => !x.r.abonoLaunchedAt)
      .map((x) => [x.kind === "ind" ? personName(x.r.name) : `Coletiva "${clean(x.r.motive).slice(0, 26)}"`, fmt(recordDay(x.r)), x.kind === "ind" ? "Individual" : `Coletiva · ${people(x.r)} pessoas`])
      .sort((a, b) => a[1].split("/").reverse().join("").localeCompare(b[1].split("/").reverse().join("")));

    return {
      month, label: monthLabel(month),
      kpis: {
        total: ind.length + cols.length, ind: ind.length, cols: cols.length, exits,
        approvedPct: decided.length ? Math.round((approved.length / decided.length) * 100) : null, approved: approved.length, decided: decided.length,
        launched: launched.length, launchPct: approved.length ? Math.round((launched.length / approved.length) * 100) : null,
        retro, retroPct: all.length ? Math.round((retro / all.length) * 100) : 0, pendingBioPeople,
        response: respAll.n ? duration(respAll.sum / respAll.n) : "—", refused: stageGroups[5].value
      },
      perDay: { labels: Array.from({ length: days }, (_, i) => String(i + 1)), ind: perDayInd, col: perDayCol },
      stageGroups, creators, frequent, tarefa, particular, hours, response, waitingBy, refusals, bioList, launchList
    };
  }

  // ---------- Desenho ----------
  // Linhas diagonais finas (o "motivo" do modelo), desenhadas como formas: n linhas paralelas a 45° num canto.
  // Canto de cima à esquerda: cada linha vai da borda de cima à borda da esquerda; flip = canto de baixo à direita.
  function diagonals(slide, pres, { x, y, size, n = 12, gap = 0.12, color, transparency = 0, flip = false }) {
    for (let i = 0; i < n; i += 1) {
      const d = size - i * gap;
      if (d <= 0.05) break;
      slide.addShape(pres.ShapeType.line, {
        x: flip ? x + size - d : x, y: flip ? y + size - d : y, w: d, h: d,
        flipH: true, line: { color, width: 0.75, transparency }
      });
    }
  }
  // Setas de linhas na capa (chevrons encaixados, vermelho e azul-claro alternados).
  function chevrons(slide, pres, { x, y, h, n = 14, gap = 0.13 }) {
    for (let i = 0; i < n; i += 1) {
      const color = i % 3 === 1 ? "74AEF9" : RED;
      const cx = x + i * gap;
      const half = h / 2 - i * 0.02;
      const top = y + (h / 2 - half);
      const depth = half * 0.95;
      slide.addShape(pres.ShapeType.line, { x: cx, y: top, w: depth, h: half, line: { color, width: 0.75, transparency: 15 } });
      slide.addShape(pres.ShapeType.line, { x: cx, y: top + half, w: depth, h: half, flipV: true, line: { color, width: 0.75, transparency: 15 } });
    }
  }
  const brand = (slide, color) => slide.addText([{ text: "OBRA ", options: { bold: true } }, { text: "369", options: { bold: true, color: RED } }],
    { x: 10.6, y: 0.32, w: 2.3, h: 0.45, fontFace: FONT, fontSize: 20, color, align: "right", margin: 0, isTextBox: true, objectName: "Marca Obra 369" });

  function contentSlide(pres, data, heading, sub) {
    const slide = pres.addSlide();
    slide.background = { color: "FFFFFF" };
    diagonals(slide, pres, { x: -0.2, y: -0.2, size: 2.9, n: 13, gap: 0.2, color: "F2B8C6" });
    brand(slide, NAVY);
    slide.addText(heading, { x: 0.6, y: 0.62, w: 9.6, h: 0.65, fontFace: FONT, fontSize: 28, bold: true, color: NAVY, margin: 0, isTextBox: true, objectName: "Título" });
    if (sub) slide.addText(sub, { x: 0.6, y: 1.25, w: 11.5, h: 0.4, fontFace: FONT, fontSize: 14, color: MUTED, margin: 0, isTextBox: true, objectName: "Subtítulo" });
    slide.addText(`Portal DP · Obra 369 · ${data.label}`, { x: 0.6, y: 7.0, w: 8, h: 0.3, fontFace: FONT, fontSize: 10, color: MUTED, margin: 0, isTextBox: true });
    slide.slideNumber = { x: 12.2, y: 7.0, w: 0.6, h: 0.3, fontFace: FONT, fontSize: 10, color: MUTED, align: "right" };
    return slide;
  }

  function dividerSlide(pres, color, eyebrow, heading, text) {
    const slide = pres.addSlide();
    slide.background = { color };
    diagonals(slide, pres, { x: -0.3, y: -0.3, size: 3.6, n: 14, gap: 0.16, color: "FFFFFF", transparency: 55 });
    diagonals(slide, pres, { x: 10.0, y: 4.2, size: 3.6, n: 14, gap: 0.16, color: "FFFFFF", transparency: 55, flip: true });
    slide.addText(eyebrow, { x: 1.2, y: 2.55, w: 10, h: 0.4, fontFace: FONT, fontSize: 14, bold: true, color: "FFFFFF", charSpacing: 3, margin: 0, isTextBox: true, transparency: 15 });
    slide.addText(heading, { x: 1.2, y: 2.95, w: 10.5, h: 1.1, fontFace: FONT, fontSize: 44, bold: true, color: "FFFFFF", margin: 0, isTextBox: true, objectName: "Título" });
    if (text) slide.addText(text, { x: 1.2, y: 4.1, w: 9.5, h: 0.6, fontFace: FONT, fontSize: 16, color: "FFFFFF", margin: 0, isTextBox: true, transparency: 10 });
    slide.addText([{ text: "OBRA ", options: { bold: true } }, { text: "369", options: { bold: true } }], { x: 5.4, y: 6.65, w: 2.5, h: 0.4, fontFace: FONT, fontSize: 16, color: "FFFFFF", align: "center", margin: 0, isTextBox: true });
    return slide;
  }

  // Opções comuns dos gráficos (mesmo visual em todos).
  const axis = () => ({
    catAxisLabelColor: MUTED, valAxisLabelColor: MUTED, catAxisLabelFontFace: FONT, valAxisLabelFontFace: FONT,
    catAxisLabelFontSize: 10, valAxisLabelFontSize: 10, valGridLine: { color: LINE, size: 0.5 }, catGridLine: { style: "none" },
    catAxisLineShow: true, catAxisLineColor: "C3C9D2", valAxisLineShow: false,
    dataLabelFontFace: FONT, dataLabelFontSize: 10, dataLabelColor: INK, legendFontFace: FONT, legendFontSize: 11, legendColor: INK
  });
  const empty = (slide, x, y, w, h, text = "Sem dados neste mês.") => slide.addText(text, { x, y, w, h, fontFace: FONT, fontSize: 14, color: MUTED, align: "center", valign: "middle", isTextBox: true });
  // Espaço entre as barras: com poucos itens, barras mais finas (não viram blocos grossos).
  const gapFor = (n) => (n <= 2 ? 320 : n <= 4 ? 170 : n <= 6 ? 90 : 55);
  // Barras horizontais de um ranking: a mais alta no topo (o PowerPoint desenha de baixo para cima).
  function rankBars(slide, pres, rows, { x, y, w, h, color, label }) {
    if (!rows.length) return empty(slide, x, y, w, h);
    const list = [...rows].reverse();
    slide.addChart(pres.ChartType.bar, [{ name: label, labels: list.map((r) => r[0]), values: list.map((r) => r[1]) }], {
      x, y, w, h, barDir: "bar", chartColors: [color], barGapWidthPct: gapFor(rows.length), showValue: true, dataLabelPosition: "outEnd",
      showLegend: false, valAxisHidden: true, ...axis(), valGridLine: { style: "none" }, catAxisLabelFontSize: 11, catAxisLabelColor: INK
    });
  }
  // Cartão de número (stat callout): número grande em azul, rótulo embaixo, bolinha vermelha de enfeite.
  function stat(slide, pres, { x, y, w, value, label, note, icon = "•" }) {
    slide.addShape(pres.ShapeType.ellipse, { x, y: y + 0.12, w: 0.5, h: 0.5, fill: { color: "FDE8EC" }, line: { color: RED, width: 1.25 } });
    // Símbolo simples (fonte de símbolos do Windows) no meio da bolinha.
    slide.addText(icon, { x, y: y + 0.12, w: 0.5, h: 0.5, fontFace: "Segoe UI Symbol", fontSize: 15, bold: true, color: RED, align: "center", valign: "middle", margin: 0, isTextBox: true });
    slide.addText(String(value), { x: x + 0.7, y, w: w - 0.7, h: 0.75, fontFace: FONT, fontSize: 36, bold: true, color: NAVY, margin: 0, valign: "middle", isTextBox: true });
    slide.addText(label, { x: x + 0.7, y: y + 0.75, w: w - 0.7, h: 0.35, fontFace: FONT, fontSize: 14, color: INK, margin: 0, isTextBox: true });
    if (note) slide.addText(note, { x: x + 0.7, y: y + 1.08, w: w - 0.7, h: 0.32, fontFace: FONT, fontSize: 11, color: MUTED, margin: 0, isTextBox: true });
  }
  const divider = (slide, pres, x) => slide.addShape(pres.ShapeType.line, { x, y: 1.9, w: 0, h: 4.9, line: { color: RED, width: 1.5 } });

  function build(month, releases, sheets) {
    const data = compute(month, releases, sheets);
    const k = data.kpis;
    const pres = new window.PptxGenJS();
    pres.layout = "LAYOUT_WIDE";
    pres.author = "Portal DP";
    pres.title = `Relatório de liberações · Obra 369 · ${data.label}`;
    pres.theme = { headFontFace: FONT, bodyFontFace: FONT };

    // 1. Capa
    {
      const slide = pres.addSlide();
      slide.background = { color: NAVY };
      chevrons(slide, pres, { x: 7.2, y: -0.4, h: 8.3 });
      slide.addText("RELATÓRIO DE LIBERAÇÕES", { x: 0.9, y: 2.35, w: 6.4, h: 0.45, fontFace: FONT, fontSize: 16, bold: true, color: "B9D6FC", charSpacing: 3, margin: 0, isTextBox: true });
      slide.addText([{ text: "OBRA ", options: { color: "FFFFFF" } }, { text: "369", options: { color: RED } }], { x: 0.9, y: 2.8, w: 6.4, h: 1.3, fontFace: FONT, fontSize: 72, bold: true, margin: 0, isTextBox: true, objectName: "Título" });
      slide.addText(data.label, { x: 0.9, y: 4.1, w: 6.4, h: 0.6, fontFace: FONT, fontSize: 26, color: "FFFFFF", margin: 0, isTextBox: true });
      slide.addText(`Gerado pelo Portal DP em ${new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}`,
        { x: 0.9, y: 6.6, w: 6.4, h: 0.35, fontFace: FONT, fontSize: 12, color: "B9D6FC", margin: 0, isTextBox: true });
    }

    // 2. Resumo do mês (números em destaque, como o slide de números do modelo)
    {
      const slide = contentSlide(pres, data, "Resumo do mês", `${plural(k.total, "liberação", "liberações")} com data em ${data.label.toLowerCase()} · ${plural(k.ind, "individual", "individuais")} e ${plural(k.cols, "coletiva", "coletivas")}`);
      const cells = [
        { icon: "≡", value: k.total.toLocaleString("pt-BR"), label: "liberações no mês", note: `${k.ind} individuais · ${k.cols} coletivas` },
        { icon: "→", value: k.exits.toLocaleString("pt-BR"), label: "pessoas liberadas", note: "cada colaborador da coletiva conta" },
        { icon: "✔", value: k.approvedPct == null ? "—" : `${k.approvedPct}%`, label: "abonadas pelo engenheiro", note: `${k.approved} de ${k.decided} decididas` },
        { icon: "✎", value: k.launchPct == null ? "—" : `${k.launchPct}%`, label: "abonos lançados no RM", note: `${k.launched} de ${k.approved} abonadas` },
        { icon: "↺", value: k.retro.toLocaleString("pt-BR"), label: "retroativas", note: `${k.retroPct}% das liberações do mês` },
        { icon: "◉", value: k.pendingBioPeople.toLocaleString("pt-BR"), label: "digitais pendentes", note: "colaboradores sem assinar com a digital" }
      ];
      cells.forEach((cell, i) => stat(slide, pres, { x: 0.9 + (i % 3) * 4.1, y: 2.15 + Math.floor(i / 3) * 2.2, w: 3.9, ...cell }));
      slide.addNotes("Números do mês escolhido. Retroativa: data anterior ao dia do registro, ou entrada e saída marcadas juntas (não bateu o ponto).");
    }

    // 3. Divisória
    dividerSlide(pres, NAVY, "PARTE 1", "Movimento do mês", "Liberações criadas, situação, quem mais pediu e os horários de saída");

    // 4. Liberações criadas por dia
    {
      const slide = contentSlide(pres, data, "Liberações criadas por dia", `${plural(data.perDay.ind.reduce((a, b) => a + b, 0) + data.perDay.col.reduce((a, b) => a + b, 0), "liberação criada", "liberações criadas")} no mês`);
      slide.addChart(pres.ChartType.bar, [
        { name: "Individuais", labels: data.perDay.labels, values: data.perDay.ind },
        { name: "Coletivas", labels: data.perDay.labels, values: data.perDay.col }
      ], { x: 0.6, y: 1.8, w: 12.1, h: 5.0, barDir: "col", barGrouping: "stacked", chartColors: [SERIES[0], SERIES[1]], barGapWidthPct: 45,
        showLegend: true, legendPos: "t", ...axis(), catAxisTitle: "Dia do mês", showCatAxisTitle: true, catAxisTitleColor: MUTED, catAxisTitleFontSize: 10, catAxisTitleFontFace: FONT });
    }

    // 5. Situação das liberações (rosca) + leitura ao lado
    {
      const slide = contentSlide(pres, data, "Situação das liberações do mês", "Onde cada liberação do mês está agora");
      const groups = data.stageGroups;
      const total = groups.reduce((a, g) => a + g.value, 0);
      if (total) {
        slide.addChart(pres.ChartType.doughnut, [{ name: "Situação", labels: groups.map((g) => g.label), values: groups.map((g) => g.value) }], {
          x: 0.6, y: 1.85, w: 6.0, h: 4.9, holeSize: 58, chartColors: SERIES, showLegend: false, showPercent: true, showValue: false,
          dataLabelColor: "FFFFFF", dataLabelFontFace: FONT, dataLabelFontSize: 11, dataLabelFontBold: true
        });
        slide.addText([{ text: total.toLocaleString("pt-BR"), options: { fontSize: 34, bold: true, color: NAVY, breakLine: true } }, { text: "liberações", options: { fontSize: 13, color: MUTED } }],
          { x: 2.35, y: 3.75, w: 2.5, h: 1.1, fontFace: FONT, align: "center", valign: "middle", margin: 0, isTextBox: true });
        divider(slide, pres, 6.95);
        groups.forEach((g, i) => {
          const yy = 2.05 + i * 0.75;
          slide.addShape(pres.ShapeType.roundRect, { x: 7.45, y: yy + 0.12, w: 0.32, h: 0.32, rectRadius: 0.06, fill: { color: SERIES[i] }, line: { color: SERIES[i] } });
          slide.addText(g.label, { x: 7.95, y: yy, w: 3.4, h: 0.55, fontFace: FONT, fontSize: 15, color: INK, margin: 0, valign: "middle", isTextBox: true });
          slide.addText([{ text: g.value.toLocaleString("pt-BR"), options: { bold: true, color: INK } }, { text: `  ${total ? Math.round((g.value / total) * 100) : 0}%`, options: { color: MUTED, fontSize: 12 } }],
            { x: 11.0, y: yy, w: 1.75, h: 0.55, fontFace: FONT, fontSize: 15, align: "right", margin: 0, valign: "middle", isTextBox: true });
        });
      } else empty(slide, 0.6, 2, 12, 4.5);
    }

    // 6. Quem mais criou x quem mais saiu (duas colunas com a linha vermelha do modelo)
    {
      const slide = contentSlide(pres, data, "Quem mais pediu e quem mais saiu", "Solicitantes com mais liberações criadas · colaboradores com mais saídas no mês");
      slide.addText("Quem mais criou liberações", { x: 0.6, y: 1.85, w: 5.9, h: 0.4, fontFace: FONT, fontSize: 16, bold: true, color: INK, margin: 0, isTextBox: true });
      rankBars(slide, pres, data.creators, { x: 0.5, y: 2.3, w: 6.1, h: 4.5, color: SERIES[0], label: "Liberações" });
      divider(slide, pres, 6.67);
      slide.addText("Quem mais saiu", { x: 7.0, y: 1.85, w: 5.9, h: 0.4, fontFace: FONT, fontSize: 16, bold: true, color: INK, margin: 0, isTextBox: true });
      rankBars(slide, pres, data.frequent, { x: 6.9, y: 2.3, w: 6.0, h: 4.5, color: SERIES[1], label: "Saídas" });
    }

    // 7. Tarefa x Particular + horário das saídas
    {
      const slide = contentSlide(pres, data, "Motivo e horário das saídas", "Pessoas liberadas no mês (cada colaborador da coletiva conta)");
      const total = data.tarefa + data.particular;
      slide.addText("Tarefa x Particular", { x: 0.6, y: 1.85, w: 4.6, h: 0.4, fontFace: FONT, fontSize: 16, bold: true, color: INK, margin: 0, isTextBox: true });
      if (total) {
        slide.addChart(pres.ChartType.doughnut, [{ name: "Motivo", labels: ["Tarefa", "Particular"], values: [data.tarefa, data.particular] }], {
          x: 0.5, y: 2.3, w: 4.6, h: 3.6, holeSize: 60, chartColors: [SERIES[0], SERIES[1]], showLegend: false, showPercent: true, showValue: false,
          dataLabelColor: "FFFFFF", dataLabelFontFace: FONT, dataLabelFontSize: 12, dataLabelFontBold: true
        });
        slide.addText([
          { text: "■ ", options: { color: SERIES[0] } }, { text: `Tarefa  ${data.tarefa.toLocaleString("pt-BR")}`, options: { color: INK, breakLine: true } },
          { text: "■ ", options: { color: SERIES[1] } }, { text: `Particular  ${data.particular.toLocaleString("pt-BR")}`, options: { color: INK } }
        ], { x: 0.8, y: 6.0, w: 4.2, h: 0.8, fontFace: FONT, fontSize: 14, margin: 0, isTextBox: true });
      } else empty(slide, 0.6, 2.3, 4.6, 4);
      divider(slide, pres, 5.45);
      slide.addText("Horário das saídas", { x: 5.8, y: 1.85, w: 6.9, h: 0.4, fontFace: FONT, fontSize: 16, bold: true, color: INK, margin: 0, isTextBox: true });
      if (data.hours.some((h) => h[1])) {
        slide.addChart(pres.ChartType.bar, [{ name: "Pessoas", labels: data.hours.map((h) => h[0]), values: data.hours.map((h) => h[1]) }], {
          x: 5.7, y: 2.3, w: 7.1, h: 4.5, barDir: "col", chartColors: [SERIES[0]], barGapWidthPct: 40, showValue: true, dataLabelPosition: "outEnd", showLegend: false, ...axis(), dataLabelFormatCode: "#,##0;;;"
        });
      } else empty(slide, 5.8, 2.3, 6.9, 4);
    }

    // 8. Divisória
    dividerSlide(pres, RED, "PARTE 2", "Abono e DP", "Tempo de resposta, pendências, lançamento no RM e recusas");

    // 9. Abono: tempo de resposta x pendências por engenheiro
    {
      const slide = contentSlide(pres, data, "Abono pelo engenheiro", `Tempo médio de resposta no mês: ${k.response} · pendências contam a situação de agora`);
      slide.addText("Tempo médio de resposta (horas)", { x: 0.6, y: 1.85, w: 5.9, h: 0.4, fontFace: FONT, fontSize: 16, bold: true, color: INK, margin: 0, isTextBox: true });
      if (data.response.length) {
        const list = [...data.response].reverse();
        slide.addChart(pres.ChartType.bar, [{ name: "Horas", labels: list.map((r) => `${r.name} (${r.n})`), values: list.map((r) => r.hours) }], {
          x: 0.5, y: 2.3, w: 6.1, h: 4.5, barDir: "bar", chartColors: [SERIES[0]], barGapWidthPct: gapFor(list.length), showValue: true, dataLabelPosition: "outEnd",
          dataLabelFormatCode: "0.0", showLegend: false, valAxisHidden: true, ...axis(), valGridLine: { style: "none" }, catAxisLabelFontSize: 11, catAxisLabelColor: INK
        });
      } else empty(slide, 0.6, 2.3, 5.9, 4.4, "Nenhum abono decidido neste mês.");
      divider(slide, pres, 6.67);
      slide.addText("Aguardando o abono, por engenheiro", { x: 7.0, y: 1.85, w: 5.9, h: 0.4, fontFace: FONT, fontSize: 16, bold: true, color: INK, margin: 0, isTextBox: true });
      rankBars(slide, pres, data.waitingBy, { x: 6.9, y: 2.3, w: 6.0, h: 4.5, color: SERIES[3], label: "Pendências" });
      slide.addNotes("O número entre parênteses é a quantidade de decisões do engenheiro no mês. \"Todos\" = liberações enviadas a todos os engenheiros.");
    }

    // 10. Lançamento no RM + motivos de recusa
    {
      const slide = contentSlide(pres, data, "Lançamento no RM e recusas", "Abonos já carimbados pelo DP e por que as liberações voltaram ao solicitante");
      stat(slide, pres, { x: 0.8, y: 2.1, w: 5.3, icon: "✎", value: k.launchPct == null ? "—" : `${k.launchPct}%`, label: "dos abonos já lançados no RM", note: `${k.launched} lançados · ${Math.max(0, k.approved - k.launched)} por lançar` });
      // Barra de progresso (mesma rampa: trilho claro, preenchimento azul).
      slide.addShape(pres.ShapeType.roundRect, { x: 1.5, y: 3.75, w: 4.6, h: 0.28, rectRadius: 0.14, fill: { color: "DCE7F7" }, line: { color: "DCE7F7" } });
      if (k.launchPct) slide.addShape(pres.ShapeType.roundRect, { x: 1.5, y: 3.75, w: Math.max(0.28, 4.6 * k.launchPct / 100), h: 0.28, rectRadius: 0.14, fill: { color: SERIES[0] }, line: { color: SERIES[0] } });
      stat(slide, pres, { x: 0.8, y: 4.5, w: 5.3, icon: "↩", value: k.refused.toLocaleString("pt-BR"), label: "recusadas ou negadas no mês", note: "voltam ao solicitante para ajustar e reenviar" });
      divider(slide, pres, 6.67);
      slide.addText("Motivos mais comuns das recusas", { x: 7.0, y: 1.85, w: 5.9, h: 0.4, fontFace: FONT, fontSize: 16, bold: true, color: INK, margin: 0, isTextBox: true });
      rankBars(slide, pres, data.refusals, { x: 6.9, y: 2.3, w: 6.0, h: 4.5, color: SERIES[1], label: "Recusas" });
    }

    // 11. Pendências (tabelas)
    {
      const slide = contentSlide(pres, data, "Pendências para resolver", "As mais antigas primeiro · a lista completa está no portal");
      const table = (rows, head, x, w, colW, heading, emptyText) => {
        slide.addText(heading, { x, y: 1.85, w, h: 0.4, fontFace: FONT, fontSize: 16, bold: true, color: INK, margin: 0, isTextBox: true });
        if (!rows.length) return empty(slide, x, 2.4, w, 3.5, emptyText);
        const shown = rows.slice(0, 10);
        const headRow = head.map((text) => ({ text, options: { bold: true, color: "FFFFFF", fill: { color: NAVY } } }));
        const body = shown.map((row, i) => row.map((text) => ({ text: String(text), options: { color: INK, fill: { color: i % 2 ? "F4F7FB" : "FFFFFF" } } })));
        slide.addTable([headRow, ...body], { x, y: 2.35, w, colW, fontFace: FONT, fontSize: 10.5, border: { type: "solid", pt: 0.5, color: LINE }, rowH: 0.36, valign: "middle", margin: 0.06 });
        if (rows.length > shown.length) slide.addText(`+ ${rows.length - shown.length} no portal`, { x, y: 6.45, w, h: 0.3, fontFace: FONT, fontSize: 11, color: MUTED, margin: 0, isTextBox: true });
      };
      table(data.bioList, ["Colaborador", "Data", "Tipo", "Solicitante"], 0.6, 6.0, [2.5, 1.0, 1.1, 1.4], `Digitais pendentes (${data.bioList.length})`, "Nenhuma digital pendente.");
      divider(slide, pres, 6.82);
      table(data.launchList, ["Liberação", "Data", "Tipo"], 7.15, 5.6, [2.6, 1.0, 2.0], `Abonos por lançar no RM (${data.launchList.length})`, "Nenhum abono por lançar.");
    }

    // 12. Encerramento
    {
      const slide = pres.addSlide();
      slide.background = { color: NAVY_DARK };
      diagonals(slide, pres, { x: -0.3, y: -0.3, size: 3.6, n: 14, gap: 0.16, color: "FFFFFF", transparency: 60 });
      diagonals(slide, pres, { x: 10.0, y: 4.2, size: 3.6, n: 14, gap: 0.16, color: "FFFFFF", transparency: 60, flip: true });
      slide.addText([{ text: "OBRA ", options: { color: "FFFFFF" } }, { text: "369", options: { color: RED } }], { x: 1, y: 2.75, w: 11.33, h: 1.2, fontFace: FONT, fontSize: 64, bold: true, align: "center", margin: 0, isTextBox: true });
      slide.addText(`Relatório de liberações · ${data.label}`, { x: 1, y: 3.95, w: 11.33, h: 0.5, fontFace: FONT, fontSize: 20, color: "FFFFFF", align: "center", margin: 0, isTextBox: true });
      slide.addText("Portal DP", { x: 1, y: 6.55, w: 11.33, h: 0.35, fontFace: FONT, fontSize: 12, color: "B9D6FC", align: "center", margin: 0, isTextBox: true });
    }
    return { pres, data };
  }

  // ---------- Botão na página Backup ----------
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const tag = document.createElement("script");
      tag.src = src;
      tag.onload = resolve;
      tag.onerror = () => reject(new Error(`Não foi possível carregar ${src}`));
      document.head.append(tag);
    });
  }

  function setup() {
    const button = document.querySelector("#export-pptx");
    const select = document.querySelector("#pptx-month");
    const result = document.querySelector("#pptx-result");
    if (!button || !select) return;
    const now = new Date();
    select.innerHTML = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
      return `<option value="${key}">${monthLabel(key)}${i === 0 ? " (mês atual)" : ""}</option>`;
    }).join("");
    const show = (text, isError) => {
      result.textContent = text;
      result.classList.toggle("is-error", !!isError);
      result.hidden = false;
    };
    button.addEventListener("click", async () => {
      button.disabled = true;
      const original = button.textContent;
      button.textContent = "Gerando apresentação…";
      try {
        if (!window.PptxGenJS) await loadScript(PPTX_CDN);
        const releases = await window.portalDemoStore.getReleases();
        const sheets = window.portalCollectiveStore ? await window.portalCollectiveStore.getEverything() : [];
        const { pres, data } = build(select.value, releases, sheets);
        await pres.writeFile({ fileName: `apresentacao-obra-369_${select.value}.pptx` });
        show(`Apresentação de ${data.label} gerada: ${plural(data.kpis.total, "liberação", "liberações")} no mês, 12 slides.`);
      } catch (error) {
        console.error("Falha ao gerar a apresentação.", error);
        show("Não foi possível gerar a apresentação. Verifique a internet e tente de novo.", true);
      } finally {
        button.disabled = false;
        button.textContent = original;
      }
    });
  }

  window.portalReportPptx = Object.freeze({ build, compute });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup);
  else setup();
})();
