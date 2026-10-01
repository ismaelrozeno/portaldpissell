// Leitor biométrico Hamster DX. O navegador não acessa USB: quem lê a digital é o agente local
// (pasta biometria-agente), que precisa estar aberto no computador onde o leitor está ligado.
// As digitais cadastradas ficam na coleção "biometrics", uma por matrícula (dado sensível, LGPD art. 11).
(() => {
  const AGENT_URL = "http://localhost:9001";
  const biometricsCollection = () => window.portalFirebaseDb.collection(window.portalDataModel?.collections?.biometrics || "biometrics");

  const errorMessages = {
    "agente-indisponivel": "Leitor biométrico não encontrado neste computador. Abra o Agente Biométrico no PC onde o Hamster DX está ligado.",
    "leitor-desconectado": "O Hamster DX não está conectado. Confira o cabo USB e tente de novo.",
    "cancelado": "Leitura da digital cancelada.",
    "tempo-esgotado": "O leitor esperou e ninguém colocou o dedo. Tente de novo.",
    "falha-captura": "Não foi possível ler a digital. Limpe o leitor e o dedo e tente de novo.",
    "origem-nao-permitida": "O agente biométrico não aceita pedidos deste endereço do portal.",
    "sem-cadastro": "Este colaborador ainda não tem digital cadastrada. Procure o DP para cadastrar.",
    "nao-confere": "A digital não confere com a do colaborador selecionado."
  };

  class BiometricError extends Error {
    constructor(code) {
      super(errorMessages[code] || "Falha no leitor biométrico.");
      this.code = code;
    }
  }

  function normalizeRegistration(matricula) {
    return String(matricula || "").replace(/\D/g, "").slice(0, 7);
  }

  // Cadastro e conferência esperam o colaborador pôr o dedo (várias vezes no cadastro): prazo longo.
  async function callAgent(path, { body, timeoutMs = 90000 } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetch(`${AGENT_URL}${path}`, {
        method: body === undefined ? "GET" : "POST",
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal
      });
    } catch {
      throw new BiometricError("agente-indisponivel");
    } finally {
      clearTimeout(timer);
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new BiometricError(data.error || "falha-captura");
    return data;
  }

  window.portalBiometricReader = Object.freeze({
    BiometricError,

    // true quando o agente está aberto e o leitor conectado. Nunca lança erro.
    async isAvailable() {
      try {
        return (await callAgent("/status", { timeoutMs: 2500 })).device === true;
      } catch {
        return false;
      }
    },

    async getEnrollment(matricula) {
      const doc = await biometricsCollection().doc(normalizeRegistration(matricula)).get();
      return doc.exists ? doc.data() : null;
    },

    async listEnrolledRegistrations() {
      const snapshot = await biometricsCollection().get();
      return new Set(snapshot.docs.map((doc) => doc.id));
    },

    // Captura a digital no Hamster DX e grava o modelo do colaborador. Só com consentimento registrado.
    async enroll(employee, enrolledBy) {
      const matricula = normalizeRegistration(employee.matricula);
      const { template } = await callAgent("/enroll", { body: {} });
      const now = new Date().toISOString();
      await biometricsCollection().doc(matricula).set({
        matricula,
        nome: employee.nome || "",
        template,
        device: "Hamster DX",
        consentAt: now,
        enrolledBy: enrolledBy || "",
        enrolledAt: now
      });
    },

    async removeEnrollment(matricula) {
      await biometricsCollection().doc(normalizeRegistration(matricula)).delete();
    },

    // O colaborador põe o dedo e o agente compara com o cadastro dele (1:1). Devolve a assinatura para
    // gravar na liberação ou lança BiometricError com a mensagem para mostrar na tela.
    async signAs(matricula) {
      const enrollment = await this.getEnrollment(matricula);
      if (!enrollment?.template) throw new BiometricError("sem-cadastro");
      const { match } = await callAgent("/verify", { body: { template: enrollment.template } });
      if (!match) throw new BiometricError("nao-confere");
      return {
        method: "biometria",
        device: "Hamster DX",
        matricula: normalizeRegistration(matricula),
        nome: enrollment.nome || "",
        signedAt: new Date().toISOString()
      };
    }
  });
})();
