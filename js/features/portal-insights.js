// "Indicadores do mês" do Meu portal: cartões claros abaixo dos cartões do dia, montados só com o que o sistema já
// grava (liberações individuais + coletivas visíveis no perfil aberto). Cada perfil vê os indicadores que fazem
// sentido para ele (CARDS_BY_PROFILE), com gráficos embaixo (portal-insights-charts.js). Abre sempre recolhida.
// Uso: window.portalInsights.render({ profileKey, releases, sheets })  (chamado por writeStats em js/pages/portal.js)
(() => {
  const esc = (value) => window.escapeHtml(value);
  const flow = () => window.portalReleaseFlow;
  const collective = () => window.portalCollectiveSheet;

  const CHIEFS = ["encarregado", "analista", "estagiario_engenharia", "seguranca_trabalho"];
  const CARDS_BY_PROFILE = {
    dp: ["fingerprints", "leaving", "frequent", "refused", "response", "reasons", "teams", "retroactive"],
    engenheiro: ["response", "frequent", "reasons", "teams"],
    portaria: ["leaving"],
    ...Object.fromEntries(CHIEFS.map((role) => [role, ["refused", "frequent", "reasons", "retroactive"]]))
  };

  // ---------- Datas e textos ----------
  const pad = (n) => String(n).padStart(2, "0");
  const dayOf = (value) => {
    const date = value ? new Date(value) : null;
    return !date || Number.isNaN(date.getTime()) ? "" : `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };
  const monthKey = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
  const recordDay = (record) => String(record.date || "").slice(0, 10) || dayOf(record.createdAt);
  const inMonth = (record) => recordDay(record).startsWith(monthKey());
  // "Outubro de 2026" no título da seção; nas frases dos cartões, só "outubro" (o ano já está no título).
  const monthTitle = () => { const text = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" }); return text.charAt(0).toUpperCase() + text.slice(1); };
  const monthName = () => new Date().toLocaleDateString("pt-BR", { month: "long" });
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const title = (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  // Colaborador: primeiro nome + o próximo sobrenome que não seja "da/de/do/dos/das/e" ("Daniel Silva"), sem maiúsculas.
  const PARTICLES = ["da", "de", "do", "das", "dos", "e"];
  const personName = (name) => {
    const words = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!words.length) return "Sem nome";
    const second = words.slice(1).find((word) => !PARTICLES.includes(word.toLowerCase()));
    return [words[0], second].filter(Boolean).map(title).join(" ");
  };
  // Engenheiro/solicitante: primeiro nome; se dois têm o mesmo primeiro nome, os dois primeiros.
  function shortNames(names) {
    const first = (name) => name.split(" ")[0].toLowerCase();
    return (name) => {
      const clash = names.some((other) => other.toLowerCase() !== name.toLowerCase() && first(other) === first(name));
      return name.split(" ").slice(0, clash ? 2 : 1).map(title).join(" ");
    };
  }
  const duration = (minutes) => {
    if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min`;
    if (minutes < 1440) return `${(minutes / 60).toFixed(minutes < 600 ? 1 : 0).replace(".", ",").replace(",0", "")} h`;
    return `${(minutes / 1440).toFixed(1).replace(".", ",").replace(",0", "")} ${minutes < 2880 ? "dia" : "dias"}`;
  };
  const ageLabel = (iso) => {
    const time = new Date(iso || "").getTime();
    return Number.isNaN(time) ? "" : duration((Date.now() - time) / 60000);
  };

  // ---------- Registros unificados (individual + coletiva) ----------
  const stageInd = (record) => flow().stageOf(record);
  const stageCol = (sheet) => collective()?.stageOf(sheet) || sheet.stage || "engineer";
  const reasonOf = (record) => record.reasonType
    || (/^tarefa/i.test(record.reason || "") ? "tarefa" : /^particular/i.test(record.reason || "") ? "particular" : "");
  const counted = (stage) => !["foreman", "closed"].includes(stage);

  // Ranking: [{ label, value }] ordenado, com a barra relativa ao maior.
  function rank(map, limit = 5) {
    return [...map.entries()].map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label)).slice(0, limit);
  }
  const bump = (map, key, by = 1) => map.set(key, (map.get(key) || 0) + by);

  // ---------- Cartões ----------
  const CARDS = {
    // 1. Digitais pendentes: o que mais segura a liberação de ficar "Concluída".
    fingerprints({ releases, sheets }) {
      const ind = releases.filter((r) => counted(stageInd(r)) && r.employeeSignature?.method !== "biometria");
      const cols = sheets.filter((s) => counted(stageCol(s)) && (s.participants || []).length > (collective()?.signedCount(s) || 0));
      const people = cols.reduce((sum, s) => sum + (s.participants || []).length - (collective()?.signedCount(s) || 0), 0);
      const oldest = [...ind, ...cols].map((r) => r.createdAt).filter(Boolean).sort()[0];
      return {
        icon: "fingerprint", tone: "violet", title: "Digitais pendentes",
        value: ind.length + people,
        note: ind.length + people ? `${ind.length + people === 1 ? "colaborador" : "colaboradores"} sem assinar com a digital` : "todos assinaram com a digital ✓",
        details: [
          `${plural(ind.length, "individual", "individuais")} · ${plural(people, "pessoa", "pessoas")} em ${plural(cols.length, "coletiva", "coletivas")}`,
          oldest ? `mais antiga esperando há ${ageLabel(oldest)}` : ""
        ]
      };
    },

    // 2. Saindo agora: autorizados pelo DP que ainda não passaram pela portaria (coletivas mostram "2 de 4").
    leaving({ releases, sheets }) {
      const ind = releases.filter((r) => stageInd(r) === "gate");
      const cols = sheets.filter((s) => stageCol(s) === "gate");
      const inside = cols.reduce((sum, s) => sum + (s.participants || []).length - (collective()?.exitedCount(s) || 0), 0);
      const rows = cols.map((s) => {
        const total = (s.participants || []).length;
        const out = collective()?.exitedCount(s) || 0;
        return { label: String(s.motive || "Coletiva").slice(0, 38), value: `${out} de ${total}`, bar: total ? out / total : 0 };
      }).sort((a, b) => b.bar - a.bar).slice(0, 5);
      return {
        icon: "door", tone: "green", title: "Aguardando saída",
        value: ind.length + inside,
        note: ind.length + inside ? (ind.length + inside === 1 ? "pessoa autorizada que ainda não saiu" : "pessoas autorizadas que ainda não saíram") : "ninguém aguardando na portaria",
        details: [`${plural(ind.length, "individual", "individuais")} · ${plural(inside, "pessoa", "pessoas")} em ${plural(cols.length, "coletiva", "coletivas")}`],
        rows, rowsTitle: cols.length ? "Coletivas · saíram" : ""
      };
    },

    // 3. Quem mais sai no mês (cada pessoa de uma coletiva conta como uma saída).
    frequent({ releases, sheets }) {
      const map = new Map();
      releases.filter((r) => inMonth(r) && counted(stageInd(r))).forEach((r) => bump(map, personName(r.name)));
      sheets.filter((s) => inMonth(s) && counted(stageCol(s))).forEach((s) => (s.participants || []).forEach((p) => bump(map, personName(p.nome))));
      const total = [...map.values()].reduce((a, b) => a + b, 0);
      return {
        icon: "repeat", tone: "orange", title: "Quem mais sai no mês",
        value: total, note: `saídas em ${monthName()} · ${plural(map.size, "colaborador", "colaboradores")}`,
        rows: rank(map).map((row) => ({ ...row, value: plural(row.value, "saída", "saídas"), raw: row.value })),
        empty: "Nenhuma saída neste mês."
      };
    },

    // 4. Recusadas para ajustar: voltaram ao solicitante; mostra os motivos mais comuns.
    refused({ releases, sheets }) {
      const list = [...releases.filter((r) => stageInd(r) === "foreman"), ...sheets.filter((s) => stageCol(s) === "foreman")];
      const map = new Map();
      list.forEach((r) => (r.refusalReasons?.length ? r.refusalReasons : [r.refusalReason || "Sem motivo informado"]).forEach((reason) => bump(map, String(reason))));
      const oldest = list.map((r) => r.refusedAt).filter(Boolean).sort()[0];
      return {
        icon: "undo", tone: "red", title: "Recusadas para ajustar",
        value: list.length,
        note: list.length ? "devolvidas ao solicitante, aguardando reenvio" : "nenhuma recusada pendente ✓",
        details: [oldest ? `mais antiga parada há ${ageLabel(oldest)}` : ""],
        rows: rank(map, 4), rowsTitle: list.length ? "Motivos mais comuns" : ""
      };
    },

    // 5. Tempo de resposta do engenheiro: da criação até a decisão do abono, nas decididas no mês.
    response({ releases, sheets }) {
      const per = new Map();
      [...releases, ...sheets].forEach((r) => {
        if (!r.engineerDecisionAt || !r.engineer || !dayOf(r.engineerDecisionAt).startsWith(monthKey())) return;
        const minutes = (new Date(r.engineerDecisionAt) - new Date(r.requestedAt || r.createdAt)) / 60000;
        if (!(minutes >= 0)) return;
        const key = String(r.engineer).trim().replace(/\s+/g, " ");
        const item = per.get(key) || { sum: 0, n: 0 };
        item.sum += minutes;
        item.n += 1;
        per.set(key, item);
      });
      const names = [...per.keys()];
      const short = shortNames(names);
      const all = [...per.values()].reduce((acc, item) => ({ sum: acc.sum + item.sum, n: acc.n + item.n }), { sum: 0, n: 0 });
      const rows = names.map((name) => ({ label: short(name), avg: per.get(name).sum / per.get(name).n, n: per.get(name).n }))
        .sort((a, b) => a.avg - b.avg)
        .map((row, _, list) => ({ label: row.label, value: duration(row.avg), sub: plural(row.n, "decisão", "decisões"), bar: Math.max(...list.map((r) => r.avg)) ? row.avg / Math.max(...list.map((r) => r.avg)) : 0 }));
      return {
        icon: "clock", tone: "blue", title: "Tempo de resposta do abono",
        value: all.n ? duration(all.sum / all.n) : "—",
        note: all.n ? `média em ${plural(all.n, "decisão", "decisões")} de ${monthName()}` : "nenhum abono decidido neste mês",
        rows, rowsTitle: rows.length ? "Por engenheiro (mais rápido primeiro)" : ""
      };
    },

    // 6. Tarefa x Particular no mês (pessoas: a coletiva é sempre tarefa).
    reasons({ releases, sheets }) {
      let tarefa = 0;
      let particular = 0;
      releases.filter((r) => inMonth(r) && counted(stageInd(r))).forEach((r) => {
        const reason = reasonOf(r);
        if (reason === "tarefa") tarefa += 1; else if (reason === "particular") particular += 1;
      });
      sheets.filter((s) => inMonth(s) && counted(stageCol(s))).forEach((s) => { tarefa += (s.participants || []).length; });
      const total = tarefa + particular;
      const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
      return {
        icon: "split", tone: "teal", title: "Tarefa x Particular",
        value: total ? `${pct(particular)}%` : "—",
        note: total ? `das saídas de ${monthName()} foram particulares` : "nenhuma saída neste mês",
        split: total ? [{ label: "Tarefa", value: tarefa, pct: pct(tarefa), tone: "a" }, { label: "Particular", value: particular, pct: pct(particular), tone: "b" }] : null
      };
    },

    // 7. Por solicitante: quem (encarregado/equipe) mais pede liberação no mês.
    teams({ releases, sheets }) {
      const map = new Map();
      releases.filter((r) => inMonth(r) && counted(stageInd(r))).forEach((r) => bump(map, String(r.requester || "Sem solicitante").trim()));
      sheets.filter((s) => inMonth(s) && counted(stageCol(s))).forEach((s) => bump(map, String(s.foreman || s.requester || "Sem solicitante").trim(), (s.participants || []).length));
      const short = shortNames([...map.keys()]);
      return {
        icon: "team", tone: "indigo", title: "Saídas por equipe",
        value: map.size, note: `${map.size === 1 ? "solicitante pediu" : "solicitantes pediram"} liberação em ${monthName()}`,
        rows: rank(map).map((row) => ({ label: short(row.label), value: plural(row.value, "pessoa", "pessoas"), raw: row.value })),
        empty: "Nenhuma liberação neste mês."
      };
    },

    // 8. Retroativas no mês: registradas depois do dia, ou com entrada e saída juntas (não bateu o ponto).
    retroactive({ releases, sheets }) {
      const ind = releases.filter((r) => inMonth(r) && flow().isRetroactive(r));
      const cols = sheets.filter((s) => inMonth(s) && collective()?.isRetroactive(s));
      const map = new Map();
      ind.forEach((r) => bump(map, String(r.requester || "Sem solicitante").trim()));
      cols.forEach((s) => bump(map, String(s.requester || "Sem solicitante").trim()));
      const monthTotal = releases.filter(inMonth).length + sheets.filter(inMonth).length;
      const total = ind.length + cols.length;
      const short = shortNames([...map.keys()]);
      return {
        icon: "back", tone: "amber", title: "Retroativas no mês",
        value: total,
        note: total ? `${monthTotal ? Math.round((total / monthTotal) * 100) : 0}% das liberações de ${monthName()} foram retroativas` : "nenhuma retroativa ✓",
        rows: rank(map, 4).map((row) => ({ ...row, label: short(row.label), raw: row.value })), rowsTitle: total ? "Quem mais registrou retroativas" : ""
      };
    }
  };

  // ---------- Ícones (traço simples, cor do cartão) ----------
  const ICONS = {
    fingerprint: '<path d="M12 11v3a8 8 0 0 1-1 4"/><path d="M8.5 14a3.5 3.5 0 0 0 7 0v-3a3.5 3.5 0 0 0-7 0"/><path d="M5 12a7 7 0 0 1 14 0v2"/><path d="M7.5 19.5A10 10 0 0 0 9 15"/><path d="M16 18.5a12 12 0 0 0 .5-3.5"/>',
    door: '<path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H4"/>',
    repeat: '<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    split: '<path d="M12 3v18"/><path d="M12 3a9 9 0 0 1 0 18"/><circle cx="12" cy="12" r="9"/>',
    team: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14a6.5 6.5 0 0 1 3.5 6"/>',
    back: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18"/><path d="M8 2v4M16 2v4"/><path d="M14 16h-5l2-2m-2 2l2 2"/>'
  };
  const icon = (name) => `<svg class="insight-icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ""}</svg>`;

  function cardHtml(card) {
    const details = (card.details || []).filter(Boolean).map((line) => `<small>${esc(line)}</small>`).join("");
    const max = Math.max(1, ...(card.rows || []).map((row) => row.raw ?? (typeof row.value === "number" ? row.value : 0)));
    const rows = (card.rows || []).length
      ? `${card.rowsTitle ? `<p class="insight-rows-title">${esc(card.rowsTitle)}</p>` : ""}<ol class="insight-rows">${card.rows.map((row) => {
        const ratio = row.bar ?? ((row.raw ?? row.value) / max);
        return `<li><span class="insight-row-label">${esc(row.label)}${row.sub ? `<small>${esc(row.sub)}</small>` : ""}</span><b>${esc(String(row.value))}</b><i class="insight-row-bar" style="--w:${Math.round(Math.max(0.04, Math.min(1, ratio || 0)) * 100)}%"></i></li>`;
      }).join("")}</ol>`
      : card.empty && !card.split ? `<p class="insight-empty">${esc(card.empty)}</p>` : "";
    const split = card.split
      ? `<div class="insight-split" role="img" aria-label="${card.split.map((s) => `${s.label} ${s.pct}%`).join(", ")}">${card.split.map((s) => `<i class="insight-split-${s.tone}" style="--w:${s.pct}%"></i>`).join("")}</div>
         <ul class="insight-legend">${card.split.map((s) => `<li class="insight-legend-${s.tone}"><span>${esc(s.label)}</span><b>${s.value}</b><small>${s.pct}%</small></li>`).join("")}</ul>`
      : "";
    return `<article class="insight-card insight-${card.tone}">
      <header>${icon(card.icon)}<h3>${esc(card.title)}</h3></header>
      <strong class="insight-value">${esc(String(card.value))}</strong>
      <p class="insight-note">${esc(card.note || "")}</p>
      ${details ? `<div class="insight-details">${details}</div>` : ""}
      ${split}${rows}
    </article>`;
  }

  let section = null;
  function ensureSection() {
    if (section) return section;
    const stats = document.querySelector("#engineer-stats") || document.querySelector(".portal-stats");
    if (!stats) return null;
    stats.insertAdjacentHTML("afterend", `
      <details class="portal-insights" id="portal-insights" hidden>
        <summary><span class="portal-insights-title">Indicadores do mês</span><small id="portal-insights-month"></small><span class="portal-insights-toggle" aria-hidden="true"></span></summary>
        <div class="insights-grid" id="insights-grid"></div>
        <div class="insights-charts" id="insights-charts"></div>
      </details>`);
    // Sempre começa recolhida (<details> sem "open"): a pessoa abre quando quiser.
    section = document.querySelector("#portal-insights");
    // Os gráficos de colunas precisam da largura real: redesenha ao abrir.
    section.addEventListener("toggle", () => { if (section.open) window.portalInsightCharts?.redraw(); });
    return section;
  }

  function render({ profileKey, releases = [], sheets = [] }) {
    const el = ensureSection();
    if (!el) return;
    const keys = CARDS_BY_PROFILE[profileKey] || [];
    el.hidden = !keys.length;
    if (!keys.length) return;
    const data = { releases, sheets };
    el.querySelector("#portal-insights-month").textContent = monthTitle();
    el.querySelector("#insights-grid").innerHTML = keys.map((key) => {
      try { return cardHtml(CARDS[key](data)); } catch (error) { console.warn(`Indicador "${key}" indisponível.`, error); return ""; }
    }).join("");
    // Gráficos embaixo dos cartões (js/features/portal-insights-charts.js).
    const charts = el.querySelector("#insights-charts");
    if (window.portalInsightCharts) window.portalInsightCharts.render(charts, { profileKey, releases, sheets });
    else charts.hidden = true;
  }

  window.portalInsights = Object.freeze({ render, CARDS_BY_PROFILE });
})();
