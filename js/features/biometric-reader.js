// Leitor biométrico Hamster DX. O navegador não acessa USB: quem lê a digital é a API local da Fingertech
// (programa "Fingertech-API", http://localhost:5000/apiservice), que precisa estar aberta no computador onde o leitor está ligado.
// As digitais cadastradas ficam na coleção "biometrics", uma por matrícula (dado sensível, LGPD art. 11).
(() => {
  const AGENT_URL = "http://localhost:5000/apiservice";
  const biometricsCollection = () => window.portalFirebaseDb.collection(window.portalDataModel?.collections?.biometrics || "biometrics");

  const errorMessages = {
    "agente-indisponivel": "Leitor biométrico não encontrado neste computador. Abra o programa Fingertech-API no PC onde o Hamster DX está ligado e permita o acesso à rede local quando o navegador perguntar.",
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
  // A API da Fingertech responde { success, message, ... }; erro de captura vem com HTTP 400 e a mensagem em "message".
  async function callAgent(path, { body, timeoutMs = 90000, allowMismatch = false } = {}) {
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
    if (allowMismatch && response.ok) return data; // conferência: HTTP 200 com success=false quer dizer "não confere"
    if (!response.ok || !data.success) {
      const message = String(data.message || "");
      if (/timeout/i.test(message)) throw new BiometricError("tempo-esgotado");
      if (/device|open/i.test(message) && /error/i.test(message)) throw new BiometricError("leitor-desconectado");
      throw new BiometricError("falha-captura");
    }
    return data;
  }

  window.portalBiometricReader = Object.freeze({
    BiometricError,

    // true quando o agente está aberto e o leitor conectado. Nunca lança erro.
    async isAvailable() {
      try {
        return !!(await callAgent("/device-unique-id", { timeoutMs: 2500 })).serial;
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
      const { template } = await callAgent("/capture-hash");
      if (!template) throw new BiometricError("falha-captura");
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
      const result = await callAgent("/match-one-on-one", { body: { template: enrollment.template }, allowMismatch: true });
      if (!result.success) throw new BiometricError("nao-confere");
      // Identificador do modelo (não o modelo em si): gera o desenho da digital na folha de liberação.
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(enrollment.template));
      const fingerprintHash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 32);
      return {
        method: "biometria",
        fingerprintHash,
        device: "Hamster DX",
        matricula: normalizeRegistration(matricula),
        nome: enrollment.nome || "",
        signedAt: new Date().toISOString()
      };
    }
  });
})();
