// "Exportar equipes (Excel)": a mesma planilha geral nas páginas Equipes e Equipes dos engenheiros.
// Abas: Colaboradores (com encarregado e engenheiro de cada um), Equipes (uma linha por encarregado) e Engenheiros
// (uma linha por engenheiro, com os encarregados da equipe dele). Precisa do ExcelJS carregado na página.
// Uso: const { employees, teams } = await window.portalTeamsExport.download();
(() => {
  const fold = (value) => String(value || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const same = (a, b) => fold(a) === fold(b) && fold(a) !== "";
  const maoLabel = (employee) => (employee.maoDeObra === "direta" ? "Direta" : employee.maoDeObra === "indireta" ? "Indireta" : "");

  async function collect() {
    const employees = (await window.portalEmployeeStore.getAll())
      .sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", { sensitivity: "base" }));
    let foremen = [];
    let interns = [];
    try {
      const directory = await window.portalAuthDemo.getTeamDirectory();
      foremen = directory.foremen;
      interns = directory.interns;
    } catch (error) {
      console.warn("Não foi possível listar encarregados e estagiários para a exportação.", error);
    }
    // Encarregados: os cadastrados como usuário + colaboradores com função "Encarregado" + os que já têm equipe
    // (mesma regra da página Equipes).
    const names = new Map();
    foremen.forEach((user) => names.set(fold(user.name), user.name));
    employees.forEach((employee) => {
      if (employee.nome && fold(employee.funcao).includes("encarregado") && !names.has(fold(employee.nome))) names.set(fold(employee.nome), employee.nome);
    });
    employees.forEach((employee) => { if (employee.encarregado && !names.has(fold(employee.encarregado))) names.set(fold(employee.encarregado), employee.encarregado); });
    const foremanNames = [...names.values()].sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
    return { employees, foremen, interns, foremanNames };
  }

  async function download() {
    if (typeof ExcelJS === "undefined") throw new Error("excel-unavailable");
    const { employees, foremen, interns, foremanNames } = await collect();
    const internsOf = (name) => interns.filter((user) => same(user.linkedForeman, name)).map((user) => user.name);
    // Engenheiro da equipe do encarregado (Equipes dos engenheiros: campo "linkedEngineer" do cadastro do encarregado).
    const engineerOf = (name) => (name ? foremen.find((user) => same(user.name, name) && user.linkedEngineer)?.linkedEngineer || "" : "");

    const workbook = new ExcelJS.Workbook();
    workbook.creator = window.portalAuthDemo?.getSession()?.name || "Portal";
    workbook.created = new Date();
    const style = (sheet) => {
      const header = sheet.getRow(1);
      header.height = 26;
      header.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF00142D" } };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      });
      sheet.views = [{ state: "frozen", ySplit: 1 }];
      sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columnCount } };
    };

    const people = workbook.addWorksheet("Colaboradores");
    people.columns = [
      { header: "Matrícula", key: "matricula", width: 12 },
      { header: "Colaborador", key: "nome", width: 36 },
      { header: "Função", key: "funcao", width: 26 },
      { header: "Setor / frente", key: "setor", width: 22 },
      { header: "Situação", key: "status", width: 11 },
      { header: "Mão de obra", key: "mao", width: 13 },
      { header: "Encarregado (equipe)", key: "encarregado", width: 34 },
      { header: "Engenheiro (equipe do encarregado)", key: "engenheiro", width: 34 },
      { header: "Estagiário / engenheiro vinculado(s) ao encarregado", key: "estagiarios", width: 44 }
    ];
    employees.forEach((employee) => people.addRow({
      matricula: employee.matricula,
      nome: employee.nome,
      funcao: employee.funcao || "",
      setor: employee.setor || "",
      status: employee.status || "",
      mao: maoLabel(employee) || "Não informada",
      encarregado: employee.encarregado || "Sem equipe",
      engenheiro: employee.encarregado ? engineerOf(employee.encarregado) || "Sem engenheiro" : "",
      estagiarios: employee.encarregado ? internsOf(employee.encarregado).join(", ") : ""
    }));
    style(people);

    const teams = workbook.addWorksheet("Equipes");
    teams.columns = [
      { header: "Encarregado", key: "encarregado", width: 36 },
      { header: "Engenheiro", key: "engenheiro", width: 34 },
      { header: "Estagiário / engenheiro vinculado(s)", key: "estagiarios", width: 44 },
      { header: "Colaboradores na equipe", key: "total", width: 16 }
    ];
    foremanNames.forEach((name) => teams.addRow({
      encarregado: name,
      engenheiro: engineerOf(name) || "Sem engenheiro",
      estagiarios: internsOf(name).join(", ") || "—",
      total: employees.filter((employee) => same(employee.encarregado, name)).length
    }));
    const free = employees.filter((employee) => !employee.encarregado).length;
    if (free) teams.addRow({ encarregado: "(Sem equipe)", estagiarios: "", total: free });
    style(teams);

    // Uma linha por engenheiro: os encarregados da equipe dele e quantos colaboradores eles somam.
    const byEngineer = workbook.addWorksheet("Engenheiros");
    byEngineer.columns = [
      { header: "Engenheiro", key: "engenheiro", width: 36 },
      { header: "Encarregados da equipe", key: "encarregados", width: 70 },
      { header: "Encarregados", key: "totalEncarregados", width: 14 },
      { header: "Colaboradores nas equipes", key: "totalColaboradores", width: 18 }
    ];
    const engineerTeams = new Map();
    foremanNames.forEach((name) => {
      const engineer = engineerOf(name) || "(Sem engenheiro)";
      const key = engineer.toLowerCase();
      if (!engineerTeams.has(key)) engineerTeams.set(key, { engineer, names: [] });
      engineerTeams.get(key).names.push(name);
    });
    [...engineerTeams.values()]
      .sort((a, b) => (a.engineer === "(Sem engenheiro)") - (b.engineer === "(Sem engenheiro)") || a.engineer.localeCompare(b.engineer, "pt-BR"))
      .forEach(({ engineer, names }) => byEngineer.addRow({
        engenheiro: engineer,
        encarregados: names.join(", "),
        totalEncarregados: names.length,
        totalColaboradores: employees.filter((employee) => names.some((name) => same(employee.encarregado, name))).length
      }));
    byEngineer.getColumn("encarregados").alignment = { wrapText: true, vertical: "top" };
    style(byEngineer);

    const buffer = await workbook.xlsx.writeBuffer();
    const link = document.createElement("a");
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    link.href = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    link.download = `equipes-obra-369_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.xlsx`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 30000);
    return { employees: employees.length, teams: teams.rowCount - 1 };
  }

  window.portalTeamsExport = Object.freeze({ download });
})();
