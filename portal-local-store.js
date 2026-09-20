(() => {
  const employeesKey = "issellPortalEmployees";
  const allowedRegistrationsKey = "issellPortalAllowedRegistrations";
  function getEmployees() {
    try {
      const saved = JSON.parse(localStorage.getItem(employeesKey));
      return Array.isArray(saved) ? saved : [];
    } catch (error) {
      console.warn("Não foi possível ler os colaboradores locais.", error);
      return [];
    }
  }

  function saveEmployees(employees) {
    localStorage.setItem(employeesKey, JSON.stringify(employees));
    return employees;
  }

  function getAllowedRegistrations() {
    try {
      const saved = JSON.parse(localStorage.getItem(allowedRegistrationsKey));
      return Array.isArray(saved) ? saved : [];
    } catch (error) {
      console.warn("Não foi possível ler as matrículas permitidas.", error);
      return [];
    }
  }

  function saveAllowedRegistrations(registrations) {
    localStorage.setItem(allowedRegistrationsKey, JSON.stringify(registrations));
    return registrations;
  }

  function normalizeRegistration(matricula) {
    return String(matricula || "").replace(/\D/g, "").slice(0, 7);
  }

  window.portalEmployeeStore = Object.freeze({
    getAll: getEmployees,
    findByRegistration(matricula) {
      const normalized = normalizeRegistration(matricula);
      return getEmployees().find((employee) => normalizeRegistration(employee.matricula) === normalized && employee.status === "ativo") || null;
    },
    getAllowedRegistrations,
    isRegistrationAllowed(matricula) {
      const normalized = normalizeRegistration(matricula);
      return getAllowedRegistrations().some((item) => normalizeRegistration(item.matricula) === normalized && item.status !== "inativo");
    },
    getAllowedRegistration(matricula) {
      const normalized = normalizeRegistration(matricula);
      return getAllowedRegistrations().find((item) => normalizeRegistration(item.matricula) === normalized && item.status !== "inativo") || null;
    },
    addAllowedRegistration(matricula, employee = null) {
      const registrations = getAllowedRegistrations();
      const existing = registrations.find((item) => item.matricula === matricula);
      const name = employee?.nome || existing?.nome || getEmployees().find((item) => item.matricula === matricula)?.nome || "";
      if (existing) {
        existing.nome = name;
        existing.role = employee?.role || existing.role || "";
        existing.roleValue = employee?.roleValue || existing.roleValue || "";
        existing.status = "ativo";
      } else {
        registrations.push({
          matricula,
          nome: name,
          role: employee?.role || "",
          roleValue: employee?.roleValue || "",
          status: "ativo",
          createdAt: new Date().toISOString()
        });
      }
      return saveAllowedRegistrations(registrations);
    },
    updateAllowedRegistration(matricula, changes) {
      const registrations = getAllowedRegistrations().map((item) => item.matricula === matricula
        ? { ...item, ...changes, updatedAt: new Date().toISOString() }
        : item);
      return saveAllowedRegistrations(registrations);
    },
    removeAllowedRegistration(matricula) {
      return saveAllowedRegistrations(getAllowedRegistrations().filter((item) => item.matricula !== matricula));
    },
    upsert(employee) {
      const employees = getEmployees();
      const index = employees.findIndex((item) => item.matricula === employee.matricula);
      const next = { ...employee, status: employee.status || "ativo", updatedAt: new Date().toISOString() };
      if (index >= 0) employees[index] = { ...employees[index], ...next };
      else employees.push({ ...next, createdAt: new Date().toISOString() });
      return saveEmployees(employees);
    },
    remove(matricula) {
      return saveEmployees(getEmployees().filter((item) => item.matricula !== matricula));
    },
    replaceAll(employees) {
      return saveEmployees(employees);
    }
  });
})();
