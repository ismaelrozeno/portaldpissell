// Gráficos dos "Indicadores do mês" (abaixo dos cartões de js/features/portal-insights.js), em SVG/HTML puro.
// Regras de visual (guia de dataviz): colunas de até 24px com ponta arredondada de 4px e base reta, 2px de folga
// entre segmentos empilhados, grade fininha e discreta, uma cor por série sempre na mesma ordem, legenda com os
// números escritos (a cor nunca é o único jeito de ler), dica ao passar o mouse/tocar e tabela para leitor de tela.
// Uso: window.portalInsightCharts.render(container, { profileKey, releases, sheets })
(() => {
  // Paleta categórica validada (ordem fixa, nunca reciclada).
  const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"];
  const INK = { primary: "#0b0b0b", secondary: "#52514e", muted: "#898781", grid: "#e9e8e2", axis: "#c3c2b7" };

  const CHIEFS = ["encarregado", "analista", "estagiario_engenharia", "seguranca_trabalho"];
  const CHARTS_BY_PROFILE = {
    dp: ["perDay", "creators", "stages", "flowTime", "engineerBonus", "hours", "weekday"],
    engenheiro: ["perDay", "creators", "stages", "flowTime", "engineerBonus"],
    portaria: ["hours", "weekday"],
    ...Object.fromEntries(CHIEFS.map((role) => [role, ["perDay", "stages", "hours", "weekday"]]))
  };

  // ---------- Ajudantes ----------
  const pad = (n) => String(n).padStart(2, "0");
  const dayOf = (value) => {
    const date = value ? new Date(value) : null;
    return !date || Number.isNaN(date.getTime()) ? "" : `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };
  const createdDay = (record) => dayOf(record.createdAt) || String(record.date || "").slice(0, 10);
  const recordDay = (record) => String(record.date || "").slice(0, 10) || dayOf(record.createdAt);
  // Período escolhido no topo da BI Dados (js/features/portal-insights.js): um mês ou todo o período.
  const P = () => window.portalInsightsPeriod;
  // Folha fecha no dia 20: o mês "AAAA-MM" vai do dia 21 do mês anterior ao dia 20 dele.
  const payrollKey = (day) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(day || "");
    if (!match) return "";
    const [y, m, d] = match.slice(1).map(Number);
    return d >= 21 ? (m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`) : `${y}-${pad(m)}`;
  };
  const monthKey = () => { const key = P()?.get(); return key && key !== "all" ? key : payrollKey(dayOf(new Date())); };
  const isAll = () => P()?.isAll() || false;
  const createdInMonth = (record) => (P() ? P().createdInPeriod(record) : payrollKey(createdDay(record)) === monthKey());
  const inMonth = (record) => (P() ? P().inPeriod(record) : payrollKey(recordDay(record)) === monthKey());
  const periodPhrase = () => P()?.inPhrase() || "no mês";
  const counted = (stage) => !["foreman", "closed"].includes(stage);
  const duration = (minutes) => {
    if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min`;
    if (minutes < 1440) return `${(minutes / 60).toFixed(minutes < 600 ? 1 : 0).replace(".", ",").replace(",0", "")} h`;
    return `${(minutes / 1440).toFixed(1).replace(".", ",").replace(",0", "")} ${minutes < 2880 ? "dia" : "dias"}`;
  };
  // Barras horizontais simples (rótulo, barra, valor escrito) com dica ao tocar.
  function hbars(body, items, { color = SERIES[0], caption, head, wide = false }) {
    const max = Math.max(1, ...items.map((item) => item.value));
    const list = html("ol", wide ? "chart-hbars chart-hbars-wide" : "chart-hbars");
    items.forEach((item) => {
      const li = html("li");
      const track = html("span", "chart-hbar-track");
      const bar = html("i", "chart-hbar");
      bar.style.width = `${Math.max(2, (item.value / max) * 100)}%`;
      bar.style.background = item.color || color;
      track.append(bar, html("b", "chart-hbar-value", item.text ?? String(item.value)));
      li.append(html("span", "chart-hbar-label", item.label), track);
      bindTip(li, item.label, item.tip || [{ value: item.text ?? item.value, label: "", color: item.color || color }]);
      list.append(li);
    });
    body.append(list, srTable(caption, head, items.map((item) => [item.label, item.text ?? item.value])));
  }
  const stageInd = (record) => window.portalReleaseFlow.stageOf(record);
  const stageCol = (sheet) => window.portalCollectiveSheet?.stageOf(sheet) || sheet.stage || "engineer";
  const title = (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  const shortName = (name, all) => {
    const first = (value) => value.split(" ")[0].toLowerCase();
    const clash = all.some((other) => other.toLowerCase() !== name.toLowerCase() && first(other) === first(name));
    return name.split(" ").slice(0, clash ? 2 : 1).map(title).join(" ");
  };
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  // Escala "redonda" do eixo (0, 5, 10, 15...) com uns 4 traços.
  function niceScale(max) {
    if (max <= 0) return { top: 4, step: 1 };
    const raw = max / 4;
    const mag = 10 ** Math.floor(Math.log10(raw));
    // Contagem de pessoas/liberações: o passo nunca é menor que 1 (sem "0,5" no eixo).
    const step = Math.max(1, [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw));
    return { top: Math.ceil(max / step) * step, step };
  }
  // Retângulo com o topo arredondado (ponta do dado) e a base reta.
  function topRounded(x, y, w, h, r = 4) {
    const rr = Math.min(r, h, w / 2);
    return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
  }
  const svgEl = (tag, attrs) => {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
    return el;
  };
  const html = (tag, cls, text) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
  };

  // ---------- Dica (tooltip) única da seção ----------
  let tip = null;
  function tooltip() {
    if (tip) return tip;
    tip = html("div", "chart-tip");
    tip.setAttribute("role", "status");
    tip.hidden = true;
    document.body.append(tip);
    return tip;
  }
  // rows: [{ value, label, color }]; o valor vem primeiro e forte, o nome depois (como o guia pede).
  function showTip(target, heading, rows) {
    const el = tooltip();
    el.replaceChildren(html("strong", "chart-tip-title", heading));
    rows.forEach((row) => {
      const line = html("div", "chart-tip-row");
      const key = html("i", "chart-tip-key");
      key.style.background = row.color || INK.muted;
      line.append(key, html("b", "", String(row.value)), html("span", "", row.label));
      el.append(line);
    });
    el.hidden = false;
    const box = target.getBoundingClientRect();
    const tipBox = el.getBoundingClientRect();
    const left = Math.min(window.innerWidth - tipBox.width - 8, Math.max(8, box.left + box.width / 2 - tipBox.width / 2));
    const top = box.top - tipBox.height - 8 < 8 ? box.bottom + 8 : box.top - tipBox.height - 8;
    el.style.left = `${left + window.scrollX}px`;
    el.style.top = `${top + window.scrollY}px`;
  }
  const hideTip = () => { if (tip) tip.hidden = true; };
  function bindTip(el, heading, rows) {
    el.setAttribute("tabindex", "0");
    const show = () => { el.classList.add("is-hover"); showTip(el, heading, rows); };
    const hide = () => { el.classList.remove("is-hover"); hideTip(); };
    el.addEventListener("pointerenter", show);
    el.addEventListener("pointerleave", hide);
    el.addEventListener("focus", show);
    el.addEventListener("blur", hide);
    // Toque: mostra a dica sem precisar segurar.
    el.addEventListener("click", (event) => { event.stopPropagation(); show(); });
  }
  document.addEventListener("click", hideTip);
  window.addEventListener("scroll", hideTip, { passive: true });

  // Tabela escondida (leitor de tela) com os mesmos números do gráfico. Fica dentro de uma caixa escondida:
  // tabela não encolhe abaixo do conteúdo e, sozinha, empurrava a página para o lado no celular.
  function srTable(caption, head, rows) {
    const box = html("div", "visually-hidden");
    const table = html("table");
    table.append(html("caption", "", caption));
    const thead = html("thead");
    const tr = html("tr");
    head.forEach((cell) => tr.append(html("th", "", cell)));
    thead.append(tr);
    const tbody = html("tbody");
    rows.forEach((row) => { const line = html("tr"); row.forEach((cell) => line.append(html("td", "", String(cell)))); tbody.append(line); });
    table.append(thead, tbody);
    box.append(table);
    return box;
  }

  function legend(items) {
    const list = html("ul", "chart-legend");
    items.forEach((item) => {
      const li = html("li");
      const sw = html("i", "chart-swatch");
      sw.style.background = item.color;
      li.append(sw, html("span", "", item.label));
      if (item.value != null) li.append(html("b", "", String(item.value)));
      if (item.sub) li.append(html("small", "", item.sub));
      list.append(li);
    });
    return list;
  }

  // ---------- Gráfico de colunas (empilhadas ou não), desenhado na largura real do cartão ----------
  // points: [{ label, tick, values: [n, n] }]; series: [{ name, color }]
  function columnChart(host, { points, series, height = 190, tipHeading, unit }) {
    const width = Math.max(260, Math.floor(host.clientWidth));
    const m = { top: 12, right: 8, bottom: 26, left: 34 };
    const plotW = width - m.left - m.right;
    const plotH = height - m.top - m.bottom;
    const totals = points.map((p) => p.values.reduce((a, b) => a + b, 0));
    const { top, step } = niceScale(Math.max(0, ...totals));
    const y = (v) => m.top + plotH - (v / top) * plotH;
    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height, class: "chart-svg", "aria-hidden": "true" });
    for (let v = 0; v <= top; v += step) {
      svg.append(svgEl("line", { x1: m.left, x2: width - m.right, y1: y(v), y2: y(v), stroke: v === 0 ? INK.axis : INK.grid, "stroke-width": 1 }));
      const label = svgEl("text", { x: m.left - 6, y: y(v) + 3.5, "text-anchor": "end", class: "chart-tick" });
      label.textContent = v.toLocaleString("pt-BR");
      svg.append(label);
    }
    const band = plotW / points.length;
    const barW = Math.max(3, Math.min(24, band * 0.68));
    // Rótulos do eixo de baixo sem encavalar: no celular só cabe um a cada N colunas (ex.: horas de 2 em 2).
    const tickEvery = Math.max(1, Math.ceil(30 / band));
    points.forEach((point, i) => {
      const x = m.left + band * i + (band - barW) / 2;
      let base = 0;
      const group = svgEl("g", { class: "chart-col" });
      const drawn = point.values.map((value, s) => ({ value, s })).filter((item) => item.value > 0);
      drawn.forEach((item, k) => {
        const y0 = y(base);
        const y1 = y(base + item.value);
        base += item.value;
        const isTop = k === drawn.length - 1;
        // 2px de folga (cor da superfície) entre segmentos empilhados.
        const h = Math.max(1, y0 - y1 - (k > 0 ? 2 : 0));
        const yTop = y1;
        group.append(isTop
          ? svgEl("path", { d: topRounded(x, yTop, barW, h), fill: series[item.s].color })
          : svgEl("rect", { x, y: yTop, width: barW, height: h, fill: series[item.s].color }));
      });
      // Área de toque maior que a coluna (a faixa inteira).
      const hit = svgEl("rect", { x: m.left + band * i, y: m.top, width: band, height: plotH, fill: "transparent", class: "chart-hit" });
      group.append(hit);
      svg.append(group);
      if (point.tick && i % tickEvery === 0) {
        const tick = svgEl("text", { x: m.left + band * i + band / 2, y: height - 7, "text-anchor": "middle", class: "chart-tick" });
        tick.textContent = point.tick;
        svg.append(tick);
      }
      const total = totals[i];
      bindTip(hit, `${tipHeading(point)} · ${plural(total, unit[0], unit[1])}`, series.length > 1
        ? series.map((serie, s) => ({ value: point.values[s], label: serie.name, color: serie.color }))
        : [{ value: total, label: unit[1], color: series[0].color }]);
    });
    host.replaceChildren(svg);
  }

  // ---------- Os gráficos ----------
  const CHARTS = {
    // Liberações criadas por dia no mês (individuais x coletivas).
    perDay({ releases, sheets }) {
      if (isAll()) return CHARTS.perMonth({ releases, sheets });
      const [year, month] = monthKey().split("-").map(Number);
      // Folha do dia 21 do mês anterior ao dia 20; a folha atual vai até hoje.
      const today = dayOf(new Date());
      const dates = [];
      for (let d = new Date(year, month - 2, 21); dayOf(d) <= `${monthKey()}-20` && dayOf(d) <= today; d.setDate(d.getDate() + 1)) dates.push(dayOf(d));
      const days = dates.length;
      const ind = new Map();
      const col = new Map();
      releases.filter(createdInMonth).forEach((r) => ind.set(createdDay(r), (ind.get(createdDay(r)) || 0) + 1));
      sheets.filter(createdInMonth).forEach((s) => col.set(createdDay(s), (col.get(createdDay(s)) || 0) + 1));
      const points = Array.from({ length: days }, (_, i) => {
        const key = dates[i];
        const tickEvery = days > 20 ? 5 : days > 10 ? 2 : 1;
        const tick = `${key.slice(8, 10)}/${key.slice(5, 7)}`;
        return { label: key, tick: i === 0 || i === days - 1 || (i % tickEvery === 0 && i < days - 2) ? tick : "", values: [ind.get(key) || 0, col.get(key) || 0] };
      });
      const totalInd = [...ind.values()].reduce((a, b) => a + b, 0);
      const totalCol = [...col.values()].reduce((a, b) => a + b, 0);
      const series = [{ name: "Individuais", color: SERIES[0] }, { name: "Coletivas", color: SERIES[1] }];
      return {
        title: "Liberações criadas por dia",
        subtitle: `${plural(totalInd + totalCol, "liberação criada", "liberações criadas")} ${periodPhrase()}`,
        draw(body) {
          const host = html("div", "chart-host");
          body.append(legend(series.map((s, i) => ({ ...s, label: s.name, value: [totalInd, totalCol][i] }))), host,
            srTable("Liberações criadas por dia", ["Dia", "Individuais", "Coletivas"], points.map((p) => [p.label.split("-").reverse().join("/"), ...p.values])));
          return () => columnChart(host, { points, series, tipHeading: (p) => p.label.split("-").reverse().slice(0, 2).join("/"), unit: ["liberação", "liberações"] });
        }
      };
    },

    // Quem mais criou liberações no mês (cada liberação conta 1, individual ou coletiva).
    creators({ releases, sheets }) {
      const map = new Map();
      const add = (name, kind) => {
        const key = String(name || "Sem solicitante").trim().replace(/\s+/g, " ");
        const item = map.get(key.toLowerCase()) || { name: key, ind: 0, col: 0 };
        item[kind] += 1;
        map.set(key.toLowerCase(), item);
      };
      releases.filter(createdInMonth).forEach((r) => add(r.requester, "ind"));
      sheets.filter(createdInMonth).forEach((s) => add(s.requester, "col"));
      const all = [...map.values()];
      const top = all.sort((a, b) => (b.ind + b.col) - (a.ind + a.col) || a.name.localeCompare(b.name)).slice(0, 8);
      const max = Math.max(1, ...top.map((t) => t.ind + t.col));
      const names = all.map((t) => t.name);
      return {
        title: "Quem mais criou liberações",
        subtitle: `${plural(all.length, "solicitante", "solicitantes")} ${periodPhrase()} · os 8 que mais criaram`,
        draw(body) {
          if (!top.length) { body.append(html("p", "insight-empty", "Nenhuma liberação criada no período.")); return null; }
          const list = html("ol", "chart-hbars");
          top.forEach((item) => {
            const total = item.ind + item.col;
            const li = html("li");
            const label = html("span", "chart-hbar-label", shortName(item.name, names));
            const track = html("span", "chart-hbar-track");
            const bar = html("i", "chart-hbar");
            bar.style.width = `${Math.max(2, (total / max) * 100)}%`;
            bar.style.background = SERIES[0];
            track.append(bar, html("b", "chart-hbar-value", String(total)));
            li.append(label, track);
            bindTip(li, item.name, [{ value: item.ind, label: "individuais", color: SERIES[0] }, { value: item.col, label: "coletivas", color: SERIES[0] }]);
            list.append(li);
          });
          body.append(list, srTable("Quem mais criou liberações", ["Solicitante", "Individuais", "Coletivas", "Total"], top.map((t) => [t.name, t.ind, t.col, t.ind + t.col])));
          return null;
        }
      };
    },

    // Situação das liberações do mês (parte do todo, uma barra dividida).
    stages({ releases, sheets }) {
      const groups = [
        { key: ["engineer"], label: "Aguardando engenheiro" },
        { key: ["dp"], label: "Aguardando DP" },
        { key: ["gate"], label: "Aguardando saída" },
        { key: ["exited"], label: "Saída confirmada" },
        { key: ["registered"], label: "Retroativa registrada" },
        { key: ["foreman", "closed"], label: "Recusada ou negada" }
      ].map((group, i) => ({ ...group, color: SERIES[i], value: 0 }));
      const put = (stage) => { const group = groups.find((g) => g.key.includes(stage)); if (group) group.value += 1; };
      releases.filter(inMonth).forEach((r) => put(stageInd(r)));
      sheets.filter(inMonth).forEach((s) => put(stageCol(s)));
      const total = groups.reduce((a, g) => a + g.value, 0);
      const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
      return {
        title: "Situação das liberações",
        subtitle: `${plural(total, "liberação", "liberações")} ${periodPhrase()}`,
        draw(body) {
          if (!total) { body.append(html("p", "insight-empty", "Nenhuma liberação no período.")); return null; }
          const bar = html("div", "chart-stack");
          groups.filter((g) => g.value).forEach((g) => {
            const seg = html("i", "chart-stack-seg");
            seg.style.flexGrow = String(g.value);
            seg.style.background = g.color;
            bindTip(seg, g.label, [{ value: `${g.value} · ${pct(g.value)}%`, label: "das liberações", color: g.color }]);
            bar.append(seg);
          });
          body.append(bar, legend(groups.map((g) => ({ color: g.color, label: g.label, value: g.value, sub: `${pct(g.value)}%` }))),
            srTable("Situação das liberações", ["Situação", "Liberações", "%"], groups.map((g) => [g.label, g.value, `${pct(g.value)}%`])));
          return null;
        }
      };
    },

    // Horário das saídas (pessoas: cada participante da coletiva conta).
    hours({ releases, sheets }) {
      const count = new Map();
      const add = (time, n) => {
        const hour = parseInt(String(time || "").slice(0, 2), 10);
        if (Number.isNaN(hour)) return;
        count.set(hour, (count.get(hour) || 0) + n);
      };
      releases.filter((r) => inMonth(r) && !["foreman", "closed"].includes(stageInd(r))).forEach((r) => add(r.time, 1));
      sheets.filter((s) => inMonth(s) && !["foreman", "closed"].includes(stageCol(s))).forEach((s) => add(s.time, (s.participants || []).length));
      const hoursSeen = [...count.keys()];
      const from = Math.min(7, ...hoursSeen);
      const to = Math.max(17, ...hoursSeen);
      const points = Array.from({ length: to - from + 1 }, (_, i) => ({ label: `${pad(from + i)}h`, tick: `${from + i}h`, values: [count.get(from + i) || 0] }));
      const total = [...count.values()].reduce((a, b) => a + b, 0);
      const peak = points.reduce((best, p) => (p.values[0] > best.values[0] ? p : best), points[0]);
      return {
        title: "Horário das saídas",
        subtitle: total ? `${plural(total, "pessoa", "pessoas")} ${periodPhrase()} · pico às ${peak.label}` : "Nenhuma saída no período",
        draw(body) {
          const host = html("div", "chart-host");
          body.append(host, srTable("Horário das saídas", ["Hora", "Pessoas"], points.map((p) => [p.label, p.values[0]])));
          return () => columnChart(host, { points, series: [{ name: "Pessoas", color: SERIES[0] }], tipHeading: (p) => `das ${p.label}`, unit: ["pessoa", "pessoas"] });
        }
      };
    },

    // Evolução mês a mês (no lugar de "por dia" quando o período é "todo o período"): últimos 12 meses com registro.
    perMonth({ releases, sheets }) {
      const ind = new Map();
      const col = new Map();
      const monthOf = (record) => payrollKey(createdDay(record));
      releases.forEach((r) => { const key = monthOf(r); if (key) ind.set(key, (ind.get(key) || 0) + 1); });
      sheets.forEach((s) => { const key = monthOf(s); if (key) col.set(key, (col.get(key) || 0) + 1); });
      const keys = [...new Set([...ind.keys(), ...col.keys()])].sort().slice(-12);
      const label = (key) => { const [y, m] = key.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""); };
      const points = keys.map((key) => ({ label: key, tick: label(key), values: [ind.get(key) || 0, col.get(key) || 0] }));
      const series = [{ name: "Individuais", color: SERIES[0] }, { name: "Coletivas", color: SERIES[1] }];
      const total = points.reduce((sum, p) => sum + p.values[0] + p.values[1], 0);
      return {
        title: "Liberações por mês",
        subtitle: `${plural(total, "liberação criada", "liberações criadas")} · ${plural(keys.length, "mês", "meses")}`,
        draw(body) {
          if (!points.length) { body.append(html("p", "insight-empty", "Nenhuma liberação registrada.")); return null; }
          const host = html("div", "chart-host");
          body.append(legend(series.map((s, i) => ({ ...s, label: s.name, value: points.reduce((sum, p) => sum + p.values[i], 0) }))), host,
            srTable("Liberações por mês", ["Mês", "Individuais", "Coletivas"], points.map((p) => [p.label.split("-").reverse().join("/"), ...p.values])));
          return () => columnChart(host, { points, series, tipHeading: (p) => p.label.split("-").reverse().join("/"), unit: ["liberação", "liberações"] });
        }
      };
    },

    // Saídas por dia da semana (pessoas; a coletiva conta cada participante), pela data da liberação.
    weekday({ releases, sheets }) {
      const names = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      const full = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
      const count = Array(7).fill(0);
      const add = (record, n) => {
        const day = recordDay(record);
        if (!/^\d{4}-\d{2}-\d{2}/.test(day)) return;
        const [y, m, d] = day.split("-").map(Number);
        count[new Date(y, m - 1, d).getDay()] += n;
      };
      releases.filter((r) => inMonth(r) && counted(stageInd(r))).forEach((r) => add(r, 1));
      sheets.filter((s) => inMonth(s) && counted(stageCol(s))).forEach((s) => add(s, (s.participants || []).length));
      // Segunda a domingo.
      const order = [1, 2, 3, 4, 5, 6, 0];
      const points = order.map((i) => ({ label: full[i], tick: names[i], values: [count[i]] }));
      const total = count.reduce((a, b) => a + b, 0);
      const peak = points.reduce((best, p) => (p.values[0] > best.values[0] ? p : best), points[0]);
      return {
        title: "Saídas por dia da semana",
        subtitle: total ? `${plural(total, "pessoa", "pessoas")} ${periodPhrase()} · mais na ${peak.label}` : "Nenhuma saída no período",
        draw(body) {
          const host = html("div", "chart-host");
          body.append(host, srTable("Saídas por dia da semana", ["Dia", "Pessoas"], points.map((p) => [p.label, p.values[0]])));
          return () => columnChart(host, { points, series: [{ name: "Pessoas", color: SERIES[0] }], tipHeading: (p) => p.label, unit: ["pessoa", "pessoas"] });
        }
      };
    },

    // Abonado x não abonado por engenheiro (quem decidiu; o administrador, perfil de teste, fica de fora).
    engineerBonus({ releases, sheets }) {
      const map = new Map();
      [...releases, ...sheets].filter(inMonth).forEach((r) => {
        if (!["approved", "denied"].includes(r.bonusStatus) || !r.engineer || /administrador/i.test(`${r.engineerRole || ""} ${r.engineer}`)) return;
        const key = String(r.engineer).trim().replace(/\s+/g, " ");
        const item = map.get(key.toLowerCase()) || { name: key, yes: 0, no: 0 };
        item[r.bonusStatus === "approved" ? "yes" : "no"] += 1;
        map.set(key.toLowerCase(), item);
      });
      const all = [...map.values()].sort((a, b) => (b.yes + b.no) - (a.yes + a.no));
      const names = all.map((item) => item.name);
      const yes = all.reduce((sum, item) => sum + item.yes, 0);
      const no = all.reduce((sum, item) => sum + item.no, 0);
      const series = [{ name: "Abonado", color: SERIES[2] }, { name: "Não abonado", color: SERIES[1] }];
      return {
        title: "Abonado × não abonado por engenheiro",
        subtitle: yes + no ? `${plural(yes + no, "decisão", "decisões")} ${periodPhrase()} · ${Math.round((yes / (yes + no)) * 100)}% abonadas` : "Nenhum abono decidido no período",
        draw(body) {
          if (!all.length) { body.append(html("p", "insight-empty", "Nenhum abono decidido no período.")); return null; }
          const max = Math.max(1, ...all.map((item) => item.yes + item.no));
          const list = html("ol", "chart-hbars");
          all.forEach((item) => {
            const li = html("li");
            const track = html("span", "chart-hbar-track chart-hbar-stack");
            [["yes", 0], ["no", 1]].forEach(([field, s]) => {
              if (!item[field]) return;
              const bar = html("i", "chart-hbar");
              bar.style.width = `${(item[field] / max) * 100}%`;
              bar.style.background = series[s].color;
              track.append(bar);
            });
            track.append(html("b", "chart-hbar-value", `${item.yes} · ${item.no}`));
            li.append(html("span", "chart-hbar-label", shortName(item.name, names)), track);
            bindTip(li, item.name, [{ value: item.yes, label: "abonadas", color: series[0].color }, { value: item.no, label: "não abonadas", color: series[1].color }]);
            list.append(li);
          });
          body.append(legend(series.map((serie, i) => ({ color: serie.color, label: serie.name, value: i ? no : yes }))), list,
            srTable("Abonado × não abonado por engenheiro", ["Engenheiro", "Abonadas", "Não abonadas"], all.map((item) => [item.name, item.yes, item.no])));
          return null;
        }
      };
    },

    // Tempo médio de cada etapa (só conta quando as duas datas existem e estão em ordem).
    flowTime({ releases, sheets }) {
      const steps = [
        { label: "Pedido → abono do engenheiro", from: (r) => r.requestedAt || r.createdAt, to: (r) => r.engineerDecisionAt },
        { label: "Abono → autorização do DP", from: (r) => r.engineerDecisionAt, to: (r) => r.dpDecisionAt },
        { label: "Autorização → saída na portaria", from: (r) => r.dpDecisionAt, to: (r) => r.exitConfirmedAt },
        { label: "Pedido → saída (total)", from: (r) => r.requestedAt || r.createdAt, to: (r) => r.exitConfirmedAt, total: true }
      ].map((step) => ({ ...step, sum: 0, n: 0 }));
      [...releases, ...sheets].filter(inMonth).forEach((r) => steps.forEach((step) => {
        const a = new Date(step.from(r) || "").getTime();
        const b = new Date(step.to(r) || "").getTime();
        if (!Number.isNaN(a) && !Number.isNaN(b) && b >= a) { step.sum += (b - a) / 60000; step.n += 1; }
      }));
      const items = steps.filter((step) => step.n).map((step) => ({
        label: step.label, value: step.sum / step.n, text: duration(step.sum / step.n),
        color: step.total ? SERIES[3] : SERIES[0],
        tip: [{ value: duration(step.sum / step.n), label: `média em ${plural(step.n, "liberação", "liberações")}`, color: step.total ? SERIES[3] : SERIES[0] }]
      }));
      const slowest = items.filter((item) => !item.label.includes("total")).sort((a, b) => b.value - a.value)[0];
      return {
        title: "Tempo de cada etapa",
        subtitle: items.length ? `média ${periodPhrase()}${slowest ? ` · mais demorada: ${slowest.label.split(" → ")[1]}` : ""}` : "Sem etapas concluídas no período",
        draw(body) {
          if (!items.length) { body.append(html("p", "insight-empty", "Sem etapas concluídas no período.")); return null; }
          hbars(body, items, { caption: "Tempo médio de cada etapa", head: ["Etapa", "Tempo médio"], wide: true });
          return null;
        }
      };
    }
  };

  // ---------- Montagem ----------
  let redraws = [];
  function drawAll() { hideTip(); redraws.forEach((fn) => { try { fn(); } catch (error) { console.warn("Gráfico indisponível.", error); } }); }
  let resizeTimer = null;
  window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(drawAll, 150); });

  function render(container, { profileKey, releases = [], sheets = [] }) {
    const keys = CHARTS_BY_PROFILE[profileKey] || [];
    container.hidden = !keys.length;
    redraws = [];
    container.replaceChildren();
    keys.forEach((key) => {
      try {
        const chart = CHARTS[key]({ releases, sheets });
        const card = html("article", "chart-card");
        const head = html("header", "chart-head");
        head.append(html("h3", "", chart.title), html("p", "", chart.subtitle));
        const body = html("div", "chart-body");
        card.append(head, body);
        container.append(card);
        const redraw = chart.draw(body);
        if (redraw) redraws.push(redraw);
      } catch (error) {
        console.warn(`Gráfico "${key}" indisponível.`, error);
      }
    });
    // As colunas precisam da largura real: desenha quando a seção estiver aberta (e de novo ao abrir).
    requestAnimationFrame(drawAll);
  }

  window.portalInsightCharts = Object.freeze({ render, redraw: drawAll });
})();
