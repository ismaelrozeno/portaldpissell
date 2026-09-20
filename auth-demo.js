(() => {
  const sessionKey = "issellPortalDemoSession";
  const adminEmail = "admin@admdf.site";
  const adminPasswordHash = "75d895eb7f1e455135a8ae6ce5b63950b710395f2bac43deae250becdd8faa5f";
  const porterRequestsKey = "issellPortalDemoPorterRequests";

  async function hash(value) {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function getSession() {
    try {
      const localSession = localStorage.getItem(sessionKey);
      if (localSession) return JSON.parse(localSession);

      const cookie = document.cookie
        .split("; ")
        .find((item) => item.startsWith(`${sessionKey}=`));
      if (!cookie) return null;
      return JSON.parse(decodeURIComponent(cookie.split("=").slice(1).join("=")));
    } catch (error) {
      console.warn("Não foi possível ler a sessão demonstrativa.", error);
      return null;
    }
  }

  function saveSession(profile) {
    localStorage.setItem(sessionKey, JSON.stringify(profile));
    document.cookie = `${sessionKey}=${encodeURIComponent(JSON.stringify({
      name: profile.name,
      email: profile.email,
      role: profile.role
    }))}; path=/; SameSite=Lax`;
  }

  function normalizeIdentity(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/\s+/g, " ")
      .trim();
  }


  window.portalAuthDemo = Object.freeze({
    getSession,
    normalizeIdentity,
    isFixedAdministratorIdentifier(identifier) {
      return identifier.trim().toLowerCase() === adminEmail;
    },
    getPorterRequests() {
      try {
        const requests = JSON.parse(localStorage.getItem(porterRequestsKey) || "[]");
        return Array.isArray(requests) ? requests : [];
      } catch (error) {
        console.warn("Não foi possível ler os cadastros de porteiro.", error);
        return [];
      }
    },
    updatePorterRequest(requestId, status) {
      const requests = this.getPorterRequests().map((request) => request.id === requestId
        ? { ...request, status, reviewedAt: new Date().toISOString(), reviewedBy: "Administrador Analista" }
        : request);
      localStorage.setItem(porterRequestsKey, JSON.stringify(requests));
      return requests;
    },
    updatePorterProfile(requestId, changes) {
      const requests = this.getPorterRequests().map((request) => request.id === requestId
        ? { ...request, ...changes, updatedAt: new Date().toISOString() }
        : request);
      localStorage.setItem(porterRequestsKey, JSON.stringify(requests));
      return requests;
    },
    removePorterRequest(requestId) {
      const requests = this.getPorterRequests().filter((request) => request.id !== requestId);
      localStorage.setItem(porterRequestsKey, JSON.stringify(requests));
      return requests;
    },
    async login(identifier, password) {
      if (identifier.trim().toLowerCase() !== adminEmail || await hash(password) !== adminPasswordHash) {
        return false;
      }
      saveSession({ name: "Administrador Analista", email: adminEmail, role: "Administrador Analista", roleValue: "administrador-analista", photo: "" });
      return true;
    },
    register(profile) {
      if (profile.roleValue === "porteiro") {
        const requests = JSON.parse(localStorage.getItem(porterRequestsKey) || "[]");
        requests.push({ ...profile, id: `porter-${Date.now()}`, status: "pending-dp", createdAt: new Date().toISOString() });
        localStorage.setItem(porterRequestsKey, JSON.stringify(requests));
        return "pending-dp";
      }
      saveSession({ ...profile, photo: "" });
      return "approved";
    },
    isValidEmployee(matricula) {
      return Boolean(window.portalEmployeeStore?.isRegistrationAllowed(matricula));
    },
    isRegistrationAllowedForRole(matricula, roleValue) {
      const allowed = window.portalEmployeeStore?.getAllowedRegistration(matricula);
      if (!allowed) return false;
      const roleAliases = {
        dp: ["dp", "departamento pessoal"],
        encarregado: ["encarregado"],
        engenheiro: ["engenheiro", "engenheiro responsável"]
      };
      const acceptedRoles = roleAliases[roleValue] || [roleValue];
      const savedRole = String(allowed.roleValue || allowed.role || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
      return acceptedRoles.some((role) => role.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === savedRole);
    },
    isRegistrationIdentityAllowed(matricula, name, roleValue) {
      const allowed = window.portalEmployeeStore?.getAllowedRegistration(matricula);
      if (!allowed || allowed.roleValue !== roleValue) return false;
      return normalizeIdentity(allowed.nome) === normalizeIdentity(name);
    },
    saveImportedEmployees(matriculas) {
      const current = window.portalEmployeeStore?.getAll() || [];
      const employees = matriculas.map((matricula) => current.find((employee) => employee.matricula === matricula) || { matricula, nome: "", funcao: "", setor: "", encarregado: "", status: "ativo" });
      window.portalEmployeeStore?.replaceAll(employees);
    },
    updateProfile(changes) {
      const session = getSession();
      if (!session) return null;
      const isFixedAdministrator = session.roleValue === "administrador-analista"
        || session.role === "Administrador Analista";
      const safeChanges = isFixedAdministrator
        ? { ...changes, email: session.email }
        : changes;
      const updated = { ...session, ...safeChanges };
      saveSession(updated);
      return updated;
    },
    logout() {
      localStorage.removeItem(sessionKey);
      document.cookie = `${sessionKey}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
    }
  });
})();
