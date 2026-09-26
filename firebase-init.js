(() => {
  const config = window.portalFirebaseConfig;

  if (!config || config.projectId === "SEU_PROJETO") {
    console.warn("Firebase ainda não configurado. Preencha firebase-config.js com as credenciais do seu projeto. O portal continuará usando o armazenamento local até lá.");
    return;
  }

  const requiredFields = ["apiKey", "authDomain", "projectId", "appId"];
  const missingFields = requiredFields.filter((field) => !config[field]);

  if (missingFields.length > 0) {
    throw new Error(`Configuração do Firebase incompleta: ${missingFields.join(", ")}`);
  }

  if (typeof firebase === "undefined") {
    throw new Error("SDK do Firebase não carregado. Confira se os scripts firebase-*-compat.js estão incluídos antes de firebase-init.js.");
  }

  firebase.initializeApp(config);
  window.portalFirebaseAuth = firebase.auth();
  // Mantém o login salvo no aparelho mesmo depois de fechar o navegador (Safari incluso).
  // Tenta IndexedDB e cai para localStorage; só usa a sessão da aba como último recurso.
  window.portalFirebasePersistenceReady = window.portalFirebaseAuth
    .setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .catch((error) => {
      console.warn("Não foi possível salvar o login de forma permanente; usando a sessão da aba.", error);
      return window.portalFirebaseAuth.setPersistence(firebase.auth.Auth.Persistence.SESSION).catch(() => {});
    });
  window.portalFirebaseDb = firebase.firestore();
  window.portalFirebaseReady = true;
  window.portalFirebaseConfig = Object.freeze({ ...config });
})();
