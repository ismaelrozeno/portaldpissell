(() => {
  const config = window.portalFirebaseConfig;

  if (!config || config.projectId === "SEU_PROJETO") {
    console.warn("Firebase ainda não configurado. O portal continuará usando o armazenamento local.");
    return;
  }

  const requiredFields = ["apiKey", "authDomain", "projectId", "appId"];
  const missingFields = requiredFields.filter((field) => !config[field]);

  if (missingFields.length > 0) {
    throw new Error(`Configuração do Firebase incompleta: ${missingFields.join(", ")}`);
  }

  window.portalFirebaseReady = true;
  window.portalFirebaseConfig = Object.freeze({ ...config });
})();
