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
    dp: ["fingerprints", "leaving", "frequent", "tasksByPerson", "particularByPerson", "topTasks", "topParticular", "byRole", "refused", "response", "reasons", "teams", "retroactive", "noClock", "entries"],
    engenheiro: ["response", "frequent", "tasksByPerson", "topTasks", "reasons", "teams"],
    portaria: ["leaving"],
    ...Object.fromEntries(CHIEFS.map((role) => [role, ["refused", "frequent", "tasksByPerson", "topTasks", "reasons", "retroactive", "noClock", "entries"]]))
  };

  // ---------- Datas e textos ----------
  const pad = (n) => String(n).padStart(2, "0");
  const dayOf = (value) => {
    const date = value ? new Date(value) : null;
    return !date || Number.isNaN(date.getTime()) ? "" : `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };
  // Folha fecha no dia 20: o mês "AAAA-MM" vai do dia 21 do mês anterior ao dia 20 dele (ex.: outubro = 21/09 a 20/10).
  // Um dia 21 ou depois já entra na folha do mês seguinte.
  const payrollKey = (day) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(day || "");
    if (!match) return "";
    const [y, m, d] = match.slice(1).map(Number);
    return d >= 21 ? (m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`) : `${y}-${pad(m)}`;
  };
  const monthKey = (date = new Date()) => payrollKey(dayOf(date));
  // Primeiro e último dia ("AAAA-MM-DD") da folha.
  const payrollRange = (key) => {
    const [y, m] = key.split("-").map(Number);
    const start = new Date(y, m - 2, 21);
    return { from: dayOf(start), to: `${key}-20` };
  };
  const rangeText = (key) => { const { from, to } = payrollRange(key); const br = (d) => d.slice(8, 10) + "/" + d.slice(5, 7); return `${br(from)} a ${br(to)}`; };
  const recordDay = (record) => String(record.date || "").slice(0, 10) || dayOf(record.createdAt);

  // ---------- Período escolhido no topo da BI Dados: uma folha ("AAAA-MM", 21 a 20) ou "all" (todo o período) ----------
  // Os cartões de "agora" (digitais pendentes, aguardando saída, recusadas) não dependem do período.
  let period = monthKey();
  const isAll = () => period === "all";
  const inKey = (key) => (record) => key === "all" || payrollKey(recordDay(record)) === key;
  const inPeriod = (record) => inKey(period)(record);
  const prevMonthKey = (key) => { const [y, m] = key.split("-").map(Number); return monthKey(new Date(y, m - 2, 1)); };
  const monthLabel = (key, withYear = false) => {
    const [y, m] = key.split("-").map(Number);
    const text = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", withYear ? { month: "long", year: "numeric" } : { month: "long" });
    return withYear ? text.charAt(0).toUpperCase() + text.slice(1) : text;
  };
  // "Outubro de 2026 · 21/09 a 20/10" / "Todo o período" no título; nas frases, "em outubro" / "no período todo".
  const periodTitle = () => (isAll() ? "Todo o período" : `${monthLabel(period, true)} · ${rangeText(period)}`);
  const inPhrase = () => (isAll() ? "no período todo" : `em ${monthLabel(period)}`);
  const ofPhrase = () => (isAll() ? "do período" : `de ${monthLabel(period)}`);
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
  const movementsOf = (record) => record.movement || [];
  const bothMovements = (record) => movementsOf(record).includes("entrada") && movementsOf(record).includes("saida");
  const entryOnly = (record) => movementsOf(record).includes("entrada") && !movementsOf(record).includes("saida");
  // Cartão de um tipo de liberação no período (individual + coletiva): total, % do período e quem mais pediu.
  function kindCard({ releases, sheets }, test, { icon, tone, title, what, none, info }) {
    const ind = releases.filter((r) => inPeriod(r) && counted(stageInd(r)) && test(r));
    const cols = sheets.filter((s) => inPeriod(s) && counted(stageCol(s)) && test(s));
    const map = new Map();
    ind.forEach((r) => bump(map, String(r.requester || "Sem solicitante").trim()));
    cols.forEach((s) => bump(map, String(s.requester || "Sem solicitante").trim()));
    const periodTotal = releases.filter(inPeriod).length + sheets.filter(inPeriod).length;
    const total = ind.length + cols.length;
    const short = shortNames([...map.keys()]);
    return {
      icon, tone, title, value: total,
      note: total ? `${periodTotal ? Math.round((total / periodTotal) * 100) : 0}% das liberações ${ofPhrase()} · ${ind.length} ${ind.length === 1 ? "individual" : "individuais"} e ${cols.length} ${cols.length === 1 ? "coletiva" : "coletivas"}` : none,
      details: [info],
      rows: rank(map, 4).map((row) => ({ ...row, label: short(row.label), raw: row.value })), rowsTitle: total ? what : ""
    };
  }

  // Ranking: [{ label, value }] ordenado, com a barra relativa ao maior.
  function rank(map, limit = 5) {
    return [...map.entries()].map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label)).slice(0, limit);
  }
  const bump = (map, key, by = 1) => map.set(key, (map.get(key) || 0) + by);

  // Pessoas de cada liberação do período (individual = 1 pessoa; coletiva = cada participante), com o motivo e a função.
  // reasonText: o texto escrito ("Tarefa: limpeza bloco 5" vira "limpeza bloco 5"; na coletiva, o motivo da folha).
  function peopleOf({ releases, sheets }, test = inPeriod) {
    const list = [];
    releases.filter((r) => test(r) && counted(stageInd(r))).forEach((r) => list.push({
      name: r.name, role: r.role, kind: reasonOf(r), record: r,
      text: String(r.reason || "").replace(/^\s*(tarefa|particular)\s*:\s*/i, "")
    }));
    sheets.filter((s) => test(s) && counted(stageCol(s))).forEach((s) => (s.participants || []).forEach((p) => list.push({
      name: p.nome, role: p.funcao, kind: "tarefa", record: s, text: String(s.motive || "")
    })));
    return list;
  }
  // Textos parecidos viram um só: sem acento, maiúsculas, pontuação e palavras curtas ("de", "do", "no"...).
  // "Limpeza do Bloco 5" e "limpeza bloco 5" contam juntos; o rótulo é o jeito de escrever que mais apareceu.
  const STOP = new Set(["a", "o", "as", "os", "de", "da", "do", "das", "dos", "e", "em", "no", "na", "nos", "nas", "para", "pra", "com", "por", "um", "uma", "ao", "aos"]);
  const textKey = (text) => String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((word) => word && !STOP.has(word)).join(" ");
  function groupTexts(items) {
    const groups = new Map();
    items.forEach(({ text, by = 1 }) => {
      const key = textKey(text);
      if (!key) return;
      const group = groups.get(key) || { count: 0, labels: new Map() };
      group.count += by;
      const label = String(text).trim().replace(/\s+/g, " ");
      group.labels.set(label, (group.labels.get(label) || 0) + 1);
      groups.set(key, group);
    });
    const map = new Map();
    groups.forEach((group) => {
      const label = [...group.labels.entries()].sort((a, b) => b[1] - a[1])[0][0];
      const nice = label.charAt(0).toUpperCase() + label.slice(1);
      map.set(nice.length > 60 ? `${nice.slice(0, 57)}…` : nice, group.count);
    });
    return map;
  }

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
      releases.filter((r) => inPeriod(r) && counted(stageInd(r))).forEach((r) => bump(map, personName(r.name)));
      sheets.filter((s) => inPeriod(s) && counted(stageCol(s))).forEach((s) => (s.participants || []).forEach((p) => bump(map, personName(p.nome))));
      const total = [...map.values()].reduce((a, b) => a + b, 0);
      return {
        icon: "repeat", tone: "orange", title: "Quem mais sai",
        value: total, note: `saídas ${inPhrase()} · ${plural(map.size, "colaborador", "colaboradores")}`,
        rows: rank(map).map((row) => ({ ...row, value: plural(row.value, "saída", "saídas"), raw: row.value })),
        empty: "Nenhuma saída no período."
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
        if (!r.engineerDecisionAt || !r.engineer || /administrador/i.test(`${r.engineerRole || ""} ${r.engineer}`)) return;
        if (!isAll() && payrollKey(dayOf(r.engineerDecisionAt)) !== period) return;
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
        note: all.n ? `média em ${plural(all.n, "decisão", "decisões")} ${ofPhrase()}` : "nenhum abono decidido no período",
        rows, rowsTitle: rows.length ? "Por engenheiro (mais rápido primeiro)" : ""
      };
    },

    // 6. Tarefa x Particular no mês (pessoas: a coletiva é sempre tarefa).
    reasons({ releases, sheets }) {
      let tarefa = 0;
      let particular = 0;
      releases.filter((r) => inPeriod(r) && counted(stageInd(r))).forEach((r) => {
        const reason = reasonOf(r);
        if (reason === "tarefa") tarefa += 1; else if (reason === "particular") particular += 1;
      });
      sheets.filter((s) => inPeriod(s) && counted(stageCol(s))).forEach((s) => { tarefa += (s.participants || []).length; });
      const total = tarefa + particular;
      const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
      return {
        icon: "split", tone: "teal", title: "Tarefa x Particular",
        value: total ? `${pct(particular)}%` : "—",
        note: total ? `das saídas ${ofPhrase()} foram particulares` : "nenhuma saída no período",
        split: total ? [{ label: "Tarefa", value: tarefa, pct: pct(tarefa), tone: "a" }, { label: "Particular", value: particular, pct: pct(particular), tone: "b" }] : null
      };
    },

    // 7. Por solicitante: quem (encarregado/equipe) mais pede liberação no mês.
    teams({ releases, sheets }) {
      const map = new Map();
      releases.filter((r) => inPeriod(r) && counted(stageInd(r))).forEach((r) => bump(map, String(r.requester || "Sem solicitante").trim()));
      sheets.filter((s) => inPeriod(s) && counted(stageCol(s))).forEach((s) => bump(map, String(s.foreman || s.requester || "Sem solicitante").trim(), (s.participants || []).length));
      const short = shortNames([...map.keys()]);
      return {
        icon: "team", tone: "indigo", title: "Saídas por equipe",
        value: map.size, note: `${map.size === 1 ? "solicitante pediu" : "solicitantes pediram"} liberação ${inPhrase()}`,
        rows: rank(map).map((row) => ({ label: short(row.label), value: plural(row.value, "pessoa", "pessoas"), raw: row.value })),
        empty: "Nenhuma liberação no período."
      };
    },

    // 8. Liberações que não seguem o fluxo de saída (cada uma tem seu cartão):
    //    Retroativa: data anterior ao dia em que foi criada (sem DP e sem portaria);
    //    Não bateu o ponto: entrada e saída marcadas juntas (sem DP e sem portaria);
    //    Entrada: só entrada, o colaborador está chegando (engenheiro e DP assinam, sem portaria).
    retroactive(data) {
      return kindCard(data, (r) => flow().isRetroactive(r) && !bothMovements(r), {
        icon: "back", tone: "amber", title: "Retroativas", what: "Quem mais registrou retroativas", none: "nenhuma retroativa ✓",
        info: "Data anterior ao dia do pedido: não passa pelo DP nem pela portaria."
      });
    },
    noClock(data) {
      return kindCard(data, bothMovements, {
        icon: "clockoff", tone: "red", title: "Não bateu o ponto", what: "Quem mais registrou sem ponto", none: "todos bateram o ponto ✓",
        info: "Entrada e saída marcadas juntas: não passa pelo DP nem pela portaria."
      });
    },
    entries(data) {
      const card = kindCard(data, entryOnly, {
        icon: "enter", tone: "teal", title: "Entradas", what: "Quem mais pediu entradas", none: "nenhuma entrada no período",
        info: "Colaborador chegando: engenheiro e DP assinam (Autorizar entrada), sem portaria."
      });
      const list = [...data.releases.filter((r) => inPeriod(r) && entryOnly(r)).map(stageInd), ...data.sheets.filter((s) => inPeriod(s) && entryOnly(s)).map(stageCol)];
      const done = list.filter((stage) => stage === "entered").length;
      const waiting = list.filter((stage) => ["engineer", "dp"].includes(stage)).length;
      if (list.length) card.details.push(`${plural(done, "autorizada pelo DP", "autorizadas pelo DP")} · ${waiting} em andamento`);
      return card;
    },

    // 9. Mais saídas por tarefa (colaboradores; cada pessoa de uma coletiva conta).
    tasksByPerson(data) {
      const map = new Map();
      peopleOf(data).filter((p) => p.kind === "tarefa").forEach((p) => bump(map, personName(p.name)));
      const total = [...map.values()].reduce((a, b) => a + b, 0);
      return {
        icon: "task", tone: "teal", title: "Mais saídas por tarefa",
        value: total, note: `saídas por tarefa ${inPhrase()} · ${plural(map.size, "colaborador", "colaboradores")}`,
        rows: rank(map).map((row) => ({ ...row, value: plural(row.value, "saída", "saídas"), raw: row.value })),
        empty: "Nenhuma saída por tarefa no período."
      };
    },

    // 10. Mais saídas particulares (colaboradores).
    particularByPerson(data) {
      const map = new Map();
      peopleOf(data).filter((p) => p.kind === "particular").forEach((p) => bump(map, personName(p.name)));
      const total = [...map.values()].reduce((a, b) => a + b, 0);
      return {
        icon: "person", tone: "orange", title: "Mais saídas particulares",
        value: total, note: `saídas particulares ${inPhrase()} · ${plural(map.size, "colaborador", "colaboradores")}`,
        rows: rank(map).map((row) => ({ ...row, value: plural(row.value, "saída", "saídas"), raw: row.value })),
        empty: "Nenhuma saída particular no período."
      };
    },

    // 11. Tarefas mais repetidas: o texto da tarefa (individual) e o motivo da coletiva, agrupando os parecidos.
    // Conta pessoas (a coletiva conta cada participante).
    topTasks(data) {
      const map = groupTexts(peopleOf(data).filter((p) => p.kind === "tarefa").map((p) => ({ text: p.text })));
      return {
        icon: "list", tone: "indigo", title: "Tarefas mais repetidas",
        value: map.size, note: `${map.size === 1 ? "tarefa diferente" : "tarefas diferentes"} ${inPhrase()} (textos parecidos contam juntos)`,
        rows: rank(map).map((row) => ({ ...row, value: plural(row.value, "pessoa", "pessoas"), raw: row.value })),
        empty: "Nenhuma tarefa no período."
      };
    },

    // 12. Motivos particulares mais comuns (o texto escrito no pedido, agrupando os parecidos).
    topParticular(data) {
      const map = groupTexts(peopleOf(data).filter((p) => p.kind === "particular").map((p) => ({ text: p.text })));
      return {
        icon: "chat", tone: "red", title: "Motivos particulares mais comuns",
        value: map.size, note: `${map.size === 1 ? "motivo diferente" : "motivos diferentes"} ${inPhrase()} (textos parecidos contam juntos)`,
        rows: rank(map).map((row) => ({ ...row, value: plural(row.value, "vez", "vezes"), raw: row.value })),
        empty: "Nenhuma saída particular no período."
      };
    },

    // 13. Saídas por função (pessoas).
    byRole(data) {
      const map = new Map();
      peopleOf(data).forEach((p) => bump(map, p.role ? String(p.role).trim().toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()) : "Função não informada"));
      return {
        icon: "badge", tone: "blue", title: "Saídas por função",
        value: map.size, note: `${map.size === 1 ? "função" : "funções"} com saídas ${inPhrase()}`,
        rows: rank(map).map((row) => ({ ...row, value: plural(row.value, "saída", "saídas"), raw: row.value })),
        empty: "Nenhuma saída no período."
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
    clockoff: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/><path d="M4 4l16 16"/>',
    enter: '<path d="M10 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4"/><path d="M14 17l5-5-5-5"/><path d="M19 12H9"/>',
    back: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18"/><path d="M8 2v4M16 2v4"/><path d="M14 16h-5l2-2m-2 2l2 2"/>',
    task: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
    person: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
    badge: '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M8 17a4 4 0 0 1 8 0"/>'
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

  // ---------- Placar do topo: os números principais do período, com a comparação com o mês anterior ----------
  function kpisFor(key, data) {
    const test = inKey(key);
    const records = [...data.releases.filter(test), ...data.sheets.filter(test)];
    const people = peopleOf(data, test);
    // Pessoas que saíram: individual com a saída confirmada na portaria; coletiva, cada participante que passou.
    const exited = data.releases.filter((r) => test(r) && stageInd(r) === "exited").length
      + data.sheets.filter(test).reduce((sum, s) => sum + (collective()?.exitedCount(s) || 0), 0);
    const names = new Set(people.map((p) => textKey(p.name)).filter(Boolean));
    const decided = records.filter((r) => r.bonusStatus === "approved" || r.bonusStatus === "denied");
    const approved = decided.filter((r) => r.bonusStatus === "approved").length;
    const particular = people.filter((p) => p.kind === "particular").length;
    const withReason = people.filter((p) => p.kind === "particular" || p.kind === "tarefa").length;
    return {
      releases: records.length,
      exited,
      people: names.size,
      bonusPct: decided.length ? Math.round((approved / decided.length) * 100) : null,
      particularPct: withReason ? Math.round((particular / withReason) * 100) : null
    };
  }
  function kpisHtml(data) {
    const now = kpisFor(period, data);
    const prevKey = isAll() ? null : prevMonthKey(period);
    const before = prevKey ? kpisFor(prevKey, data) : null;
    const prevName = prevKey ? monthLabel(prevKey) : "";
    // Diferença para o mês anterior: em % nos totais e em pontos percentuais nas porcentagens.
    const delta = (key, isPct) => {
      if (!before || now[key] == null || before[key] == null) return "";
      if (isPct) {
        const diff = now[key] - before[key];
        return diff ? `${diff > 0 ? "↑" : "↓"} ${Math.abs(diff)} p.p. vs ${prevName}` : `= igual a ${prevName}`;
      }
      if (!before[key]) return now[key] ? `novo · ${prevName} sem registro` : "";
      const pct = Math.round(((now[key] - before[key]) / before[key]) * 100);
      return pct ? `${pct > 0 ? "↑" : "↓"} ${Math.abs(pct)}% vs ${prevName}` : `= igual a ${prevName}`;
    };
    const tile = (label, value, sub, key, isPct) => `<div class="insights-kpi"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(sub)}</small>${delta(key, isPct) ? `<em>${esc(delta(key, isPct))}</em>` : ""}</div>`;
    const pctText = (n) => (n == null ? "—" : `${n}%`);
    return [
      tile("Liberações registradas", String(now.releases), "individuais e coletivas", "releases"),
      tile("Pessoas que saíram", String(now.exited), "saída confirmada na portaria", "exited"),
      tile("Colaboradores diferentes", String(now.people), "com liberação no período", "people"),
      tile("Abonadas", pctText(now.bonusPct), "das decididas pelo engenheiro", "bonusPct", true),
      tile("Particulares", pctText(now.particularPct), "das saídas (o resto é tarefa)", "particularPct", true)
    ].join("");
  }
  // Folhas com registro (mais recente primeiro) + "Todo o período", para o seletor.
  function periodOptions(data) {
    const months = new Set([monthKey()]);
    [...data.releases, ...data.sheets].forEach((r) => { const day = recordDay(r); const key = payrollKey(day); if (key) months.add(key); });
    const list = [...months].sort().reverse();
    return list.map((key) => `<option value="${key}">${esc(monthLabel(key, true))} · ${rangeText(key)}</option>`).join("")
      + '<option value="all">Todo o período</option>';
  }

  let section = null;
  let lastArgs = null;
  function ensureSection() {
    if (section) return section;
    const stats = document.querySelector("#engineer-stats") || document.querySelector(".portal-stats");
    if (!stats) return null;
    stats.insertAdjacentHTML("afterend", `
      <details class="portal-insights" id="portal-insights" hidden>
        <summary><span class="portal-insights-title">Indicadores</span><small id="portal-insights-month"></small><span class="portal-insights-toggle" aria-hidden="true"></span></summary>
        <div class="insights-toolbar"><label for="insights-period">Período</label><select id="insights-period"></select></div>
        <div class="insights-kpis" id="insights-kpis" aria-label="Números do período"></div>
        <div class="insights-grid" id="insights-grid"></div>
        <div class="insights-charts" id="insights-charts"></div>
      </details>`);
    // Sempre começa recolhida (<details> sem "open"): a pessoa abre quando quiser.
    section = document.querySelector("#portal-insights");
    // Os gráficos de colunas precisam da largura real: redesenha ao abrir.
    section.addEventListener("toggle", () => { if (section.open) window.portalInsightCharts?.redraw(); });
    // Trocar o período redesenha tudo (placar, cartões e gráficos) com os mesmos dados.
    section.querySelector("#insights-period").addEventListener("change", (event) => {
      period = event.target.value;
      if (lastArgs) render(lastArgs);
    });
    return section;
  }

  function render({ profileKey, releases = [], sheets = [] }) {
    const el = ensureSection();
    if (!el) return;
    const keys = CARDS_BY_PROFILE[profileKey] || [];
    el.hidden = !keys.length;
    if (!keys.length) return;
    lastArgs = { profileKey, releases, sheets };
    const data = { releases, sheets };
    const select = el.querySelector("#insights-period");
    select.innerHTML = periodOptions(data);
    if (![...select.options].some((option) => option.value === period)) period = monthKey();
    select.value = period;
    el.querySelector("#portal-insights-month").textContent = periodTitle();
    el.querySelector("#insights-kpis").innerHTML = kpisHtml(data);
    el.querySelector("#insights-grid").innerHTML = keys.map((key) => {
      try { return cardHtml(CARDS[key](data)); } catch (error) { console.warn(`Indicador "${key}" indisponível.`, error); return ""; }
    }).join("");
    // Gráficos embaixo dos cartões (js/features/portal-insights-charts.js).
    const charts = el.querySelector("#insights-charts");
    if (window.portalInsightCharts) window.portalInsightCharts.render(charts, { profileKey, releases, sheets });
    else charts.hidden = true;
  }

  // Os gráficos (portal-insights-charts.js) usam o mesmo período.
  window.portalInsightsPeriod = Object.freeze({
    get: () => period, isAll, inPeriod, monthKey, monthLabel, inPhrase, ofPhrase, payrollKey, payrollRange,
    createdInPeriod: (record) => isAll() || payrollKey(dayOf(record.createdAt) || String(record.date || "").slice(0, 10)) === period
  });
  window.portalInsights = Object.freeze({ render, CARDS_BY_PROFILE });
})();
