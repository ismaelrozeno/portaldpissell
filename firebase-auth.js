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
      linkedForeman: profile.linkedForeman || "",
      photo: profile.photo || "",
      avatar: profile.avatar || "",
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

  // Cópia da última sessão carregada com sucesso. Só é usada quando o Firebase confirma o login
  // mas o perfil não pôde ser lido por uma falha momentânea (rede ruim, Safari acordando o aparelho).
  const sessionCacheKey = "issellPortalAuthSessionCache";
  const readSessionCache = (uid) => {
    try {
      const cached = JSON.parse(localStorage.getItem(sessionCacheKey));
      return cached && cached.uid === uid && cached.status === "approved" ? cached : null;
    } catch (error) {
      return null;
    }
  };
  const writeSessionCache = (session) => {
    try { localStorage.setItem(sessionCacheKey, JSON.stringify(session)); } catch (error) { /* armazenamento indisponível */ }
  };
  const clearSessionCache = () => {
    try { localStorage.removeItem(sessionCacheKey); } catch (error) { /* armazenamento indisponível */ }
  };
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Tenta ler o perfil algumas vezes antes de desistir.
  async function loadProfileWithRetry(user) {
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await loadProfile(user);
      } catch (error) {
        lastError = error;
        await wait(700 * (attempt + 1));
      }
    }
    throw lastError;
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
        clearSessionCache();
        resolveReady();
        return;
      }
      try {
        const profile = await loadProfileWithRetry(user);
        currentSession = profile ? sessionFromProfile(user, profile) : null;
        if (currentSession) writeSessionCache(currentSession);
        else clearSessionCache();
      } catch (error) {
        console.error("Não foi possível carregar o perfil do usuário.", error);
        // Falha de leitura não é logout: mantém o usuário logado com a última sessão conhecida.
        currentSession = readSessionCache(user.uid);
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
        await window.portalFirebasePersistenceReady;
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
        writeSessionCache(currentSession);
        return true;
      } catch (error) {
        console.warn("Falha no login.", error);
        return false;
      }
    },

    // Uma matrícula só pode ter um cadastro: o índice matrícula -> e-mail é criado uma única vez.
    async isEnrollmentRegistered(matricula) {
      const trimmed = String(matricula || "").trim();
      if (!trimmed) return false;
      const indexDoc = await matriculaIndexRef().doc(trimmed).get();
      return indexDoc.exists;
    },

    async register(profile, password) {
      const isPorter = profile.roleValue === "porteiro";
      if (!isPorter && profile.matricula && (await this.isEnrollmentRegistered(profile.matricula))) {
        const error = new Error("Matrícula já cadastrada.");
        error.code = "portal/matricula-already-registered";
        throw error;
      }
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
        // Conta nova começa sem avatar: o círculo mostra as iniciais do nome até a pessoa escolher um.
        avatar: "",
        createdAt: new Date().toISOString()
      };
      let indexCreated = false;
      try {
        // O índice vem primeiro e funciona como trava: as regras do banco recusam criar de novo uma matrícula que já existe.
        if (!isPorter && profile.matricula) {
          await matriculaIndexRef().doc(profile.matricula).set({ email: profile.email, uid: credential.user.uid });
          indexCreated = true;
        }
        await usersRef().doc(credential.user.uid).set(userDoc);
      } catch (error) {
        // Não deixa conta "fantasma" (login criado sem perfil): desfaz o que foi criado para a pessoa poder tentar de novo.
        if (indexCreated) await matriculaIndexRef().doc(profile.matricula).delete().catch(() => {});
        await credential.user.delete().catch(() => auth().signOut());
        if (error?.code === "permission-denied" && !indexCreated && !isPorter) {
          const duplicate = new Error("Matrícula já cadastrada.");
          duplicate.code = "portal/matricula-already-registered";
          throw duplicate;
        }
        throw error;
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
    // Diretório para montar equipes (encarregados, e estagiários/engenheiros/DP vinculados a eles). Não exige ser administrador:
    // as regras do banco deixam DP, encarregado e estagiário listar só esses dois perfis.
    async getTeamDirectory() {
      const snapshot = await usersRef().where("roleValue", "in", ["encarregado", "estagiario_engenharia", "engenheiro", "dp"]).get();
      const people = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((user) => user.status === "approved" && user.name);
      return {
        foremen: people.filter((user) => user.roleValue === "encarregado"),
        interns: people.filter((user) => user.roleValue !== "encarregado" && user.linkedForeman),
        all: people
      };
    },
    // Administrador: define (ou tira, com "") o encarregado a quem um estagiário/engenheiro/DP está vinculado.
    async setUserLinkedForeman(userId, foremanName) {
      await usersRef().doc(userId).update({ linkedForeman: foremanName || "", updatedAt: new Date().toISOString() });
    },
    // Ao vivo: avisa quando alguém se vincula/desvincula ou um encarregado entra/sai.
    subscribeTeamDirectory(callback, onError) {
      return usersRef().where("roleValue", "in", ["encarregado", "estagiario_engenharia", "engenheiro", "dp"]).onSnapshot((snapshot) => {
        const people = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((user) => user.status === "approved" && user.name);
        callback({
          foremen: people.filter((user) => user.roleValue === "encarregado"),
          interns: people.filter((user) => user.roleValue !== "encarregado" && user.linkedForeman),
          all: people
        });
      }, (error) => {
        console.warn("Falha ao acompanhar os vínculos ao vivo.", error);
        if (onError) onError(error);
      });
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
        seguranca_trabalho: ["seguranca_trabalho", "segurança do trabalho", "seguranca do trabalho"],
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
      writeSessionCache(currentSession);
      return currentSession;
    },
    logout() {
      currentSession = null;
      clearSessionCache();
      return auth().signOut();
    }
  });
})();
