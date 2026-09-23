(() => {
  const adminEmail = "admin@admdf.site";
  const usersCollectionName = () => window.portalDataModel?.collections?.users || "users";
  const matriculaIndexCollectionName = () => window.portalDataModel?.collections?.matriculaIndex || "matriculaIndex";

  const auth = () => window.portalFirebaseAuth;
  const usersRef = () => window.portalFirebaseDb.collection(usersCollectionName());
  const matriculaIndexRef = () => window.portalFirebaseDb.collection(matriculaIndexCollectionName());

  function normalizeIdentity(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toUpperCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function isFixedAdministratorIdentifier(identifier) {
    return String(identifier || "").trim().toLowerCase() === adminEmail;
  }

  function sessionFromProfile(user, profile) {
    return {
      uid: user.uid,
      name: profile.name || "",
      email: profile.email || user.email || "",
      role: profile.role || "",
      roleValue: profile.roleValue || "",
      especialidade: profile.especialidade || "",
      photo: profile.photo || "",
      status: profile.status || "approved"
    };
  }

  async function ensureFixedAdministratorProfile(user) {
    const ref = usersRef().doc(user.uid);
    const snapshot = await ref.get();
    if (snapshot.exists) return snapshot.data();
    const profile = {
      name: "Administrador Analista",
      email: adminEmail,
      role: "Administrador Analista",
      roleValue: "administrador-analista",
      photo: "",
      status: "approved",
      createdAt: new Date().toISOString()
    };
    await ref.set(profile);
    return profile;
  }

  async function loadProfile(user) {
    if (isFixedAdministratorIdentifier(user.email)) {
      return ensureFixedAdministratorProfile(user);
    }
    const snapshot = await usersRef().doc(user.uid).get();
    return snapshot.exists ? snapshot.data() : null;
  }

  let currentSession = null;
  let readyResolve;
  let readyFired = false;
  const readyPromise = new Promise((resolve) => { readyResolve = resolve; });

  function resolveReady() {
    if (!readyFired) {
      readyFired = true;
      readyResolve(currentSession);
    }
  }

  if (window.portalFirebaseReady) {
    auth().onAuthStateChanged(async (user) => {
      if (!user) {
        currentSession = null;
        resolveReady();
        return;
      }
      try {
        const profile = await loadProfile(user);
        currentSession = profile ? sessionFromProfile(user, profile) : null;
      } catch (error) {
        console.error("Não foi possível carregar o perfil do usuário.", error);
        currentSession = null;
      }
      resolveReady();
    });
  } else {
    console.warn("Firebase ainda não configurado. Login e cadastro ficarão indisponíveis.");
    resolveReady();
  }

  window.portalAuthDemo = Object.freeze({
    ready: () => readyPromise,
    getSession: () => currentSession,
    normalizeIdentity,
    isFixedAdministratorIdentifier,

    async login(identifier, password) {
      if (!window.portalFirebaseReady) return false;
      const trimmed = String(identifier || "").trim();
      let email = trimmed;
      if (/^\d{7}$/.test(trimmed)) {
        const indexDoc = await matriculaIndexRef().doc(trimmed).get();
        if (!indexDoc.exists) return false;
        email = indexDoc.data().email;
      }
      try {
        const credential = await auth().signInWithEmailAndPassword(email, password);
        const profile = await loadProfile(credential.user);
        if (!profile) {
          await auth().signOut();
          return false;
        }
        if (profile.status !== "approved") {
          await auth().signOut();
          return profile.status === "pending-dp" ? "pending" : "rejected";
        }
        currentSession = sessionFromProfile(credential.user, profile);
        return true;
      } catch (error) {
        console.warn("Falha no login.", error);
        return false;
      }
    },

    async register(profile, password) {
      const isPorter = profile.roleValue === "porteiro";
      const credential = await auth().createUserWithEmailAndPassword(profile.email, password);
      const status = isPorter ? "pending-dp" : "approved";
      const userDoc = {
        name: profile.name,
        email: profile.email,
        role: profile.role,
        roleValue: profile.roleValue,
        especialidade: profile.especialidade || "",
        matricula: isPorter ? "" : (profile.matricula || ""),
        status,
        photo: "",
        createdAt: new Date().toISOString()
      };
      await usersRef().doc(credential.user.uid).set(userDoc);
      if (!isPorter && profile.matricula) {
        await matriculaIndexRef().doc(profile.matricula).set({ email: profile.email });
      }
      if (isPorter) {
        await auth().signOut();
        return "pending-dp";
      }
      currentSession = sessionFromProfile(credential.user, userDoc);
      return "approved";
    },

    async getPorterRequests() {
      const snapshot = await usersRef().where("roleValue", "==", "porteiro").get();
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    },
    async getAllUsers() {
      const snapshot = await usersRef().get();
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    },
    async updatePorterRequest(requestId, status) {
      await usersRef().doc(requestId).update({
        status: status === "approved" ? "approved" : "rejected",
        reviewedAt: new Date().toISOString(),
        reviewedBy: "Administrador Analista"
      });
      return this.getPorterRequests();
    },
    async updatePorterProfile(requestId, changes) {
      await usersRef().doc(requestId).update({ ...changes, updatedAt: new Date().toISOString() });
      return this.getPorterRequests();
    },
    async removePorterRequest(requestId) {
      await usersRef().doc(requestId).delete();
      return this.getPorterRequests();
    },

    async isValidEmployee(matricula) {
      return Boolean(await window.portalEmployeeStore?.isRegistrationAllowed(matricula));
    },
    async isRegistrationAllowedForRole(matricula, roleValue) {
      const allowed = await window.portalEmployeeStore?.getAllowedRegistration(matricula);
      if (!allowed) return false;
      const roleAliases = {
        dp: ["dp", "departamento pessoal"],
        encarregado: ["encarregado"],
        estagiario_engenharia: ["estagiario_engenharia", "estagiário de engenharia"],
        engenheiro: ["engenheiro", "engenheiro responsável"]
      };
      const acceptedRoles = roleAliases[roleValue] || [roleValue];
      const savedRole = String(allowed.roleValue || allowed.role || "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .trim();
      return acceptedRoles.some((role) => role.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase() === savedRole);
    },
    async isRegistrationIdentityAllowed(matricula, name, roleValue) {
      const allowed = await window.portalEmployeeStore?.getAllowedRegistration(matricula);
      if (!allowed || allowed.roleValue !== roleValue) return false;
      return normalizeIdentity(allowed.nome) === normalizeIdentity(name);
    },
    async saveImportedEmployees(matriculas) {
      const current = await window.portalEmployeeStore?.getAll() || [];
      const employees = matriculas.map((matricula) => current.find((employee) => employee.matricula === matricula) || { matricula, nome: "", funcao: "", setor: "", encarregado: "", status: "ativo" });
      await window.portalEmployeeStore?.replaceAll(employees);
    },

    async updateProfile(changes) {
      const user = auth().currentUser;
      if (!user || !currentSession) return null;
      const isFixedAdministrator = currentSession.roleValue === "administrador-analista";
      const safeChanges = isFixedAdministrator ? { ...changes, email: currentSession.email } : changes;
      await usersRef().doc(user.uid).update({ ...safeChanges, updatedAt: new Date().toISOString() });
      currentSession = { ...currentSession, ...safeChanges };
      return currentSession;
    },
    logout() {
      currentSession = null;
      return auth().signOut();
    }
  });
})();
