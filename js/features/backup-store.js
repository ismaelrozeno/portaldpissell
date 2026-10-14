// Leitura e restauração de backups do banco: liberações individuais e coletivas, colaboradores, matrículas permitidas,
// perfis dos usuários, fechamentos mensais, histórico de importações e digitais (biometria).
// Só lê e grava; quem decide o que pode é a tela (Backup.html) e as regras do Firestore.
// Fora do backup: "matriculaIndex" (as regras não deixam listar; ele aponta matrícula -> conta e se refaz com os perfis)
// e as contas de login/senhas (Firebase Authentication, que o navegador não lê).
(() => {
  const collectionName = (key) => window.portalDataModel?.collections?.[key] || key;
  const collection = (key) => window.portalFirebaseDb.collection(collectionName(key));
  const FORMAT = "issell-portal-backup";
  const VERSION = 1;
  const KEYS = ["releases", "collectiveReleases", "employees", "allowedRegistrations", "users", "monthlyClosures", "importRuns", "biometrics"];
  // Perfis dos usuários: só recoloca por cima de um perfil que existe. Criar um perfil é só a própria conta, no
  // cadastro (regras do banco), e um perfil sem a conta de login não serviria para nada.
  const UPDATE_ONLY = new Set(["users"]);
  // Aviso gravado no arquivo quando ele leva as digitais (LGPD, art. 11: dado pessoal sensível).
  const BIOMETRIC_NOTICE = "Este arquivo contém dados biométricos (modelos de digitais) dos colaboradores, dado pessoal sensível (LGPD, art. 11). " +
    "Uso exclusivo para restaurar o cadastro de digitais deste portal, que serve só para assinar liberações. " +
    "Guarde em local protegido e com acesso restrito, não compartilhe e apague as cópias antigas quando não forem mais necessárias.";

  async function readCollection(key) {
    const snapshot = await collection(key).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
  }

  window.portalBackupStore = Object.freeze({
    FORMAT,
    VERSION,
    KEYS,

    // Lê as coleções pedidas. O que não puder ser lido (regras do banco) volta em "skipped" com o motivo.
    async exportData(keys, exportedBy) {
      const collections = {};
      const skipped = {};
      for (const key of keys) {
        try {
          collections[key] = await readCollection(key);
        } catch (error) {
          skipped[key] = String(error?.code || error?.message || error);
        }
      }
      return {
        format: FORMAT,
        version: VERSION,
        exportedAt: new Date().toISOString(),
        exportedBy: exportedBy || "",
        projectId: window.portalFirebaseConfig?.projectId || "",
        counts: Object.fromEntries(Object.entries(collections).map(([key, list]) => [key, list.length])),
        skipped,
        ...(collections.biometrics ? { lgpd: BIOMETRIC_NOTICE } : {}),
        collections
      };
    },

    // Confere se o arquivo é um backup deste portal e devolve um resumo, ou lança um erro com o motivo.
    inspect(backup) {
      if (!backup || backup.format !== FORMAT) throw new Error("Este arquivo não é um backup do portal.");
      if (backup.version > VERSION) throw new Error("Este backup foi feito por uma versão mais nova do portal.");
      const summary = {};
      for (const key of KEYS) {
        const list = backup.collections?.[key];
        if (list === undefined) continue;
        if (!Array.isArray(list) || list.some((item) => !item || typeof item.id !== "string" || typeof item.data !== "object")) {
          throw new Error(`O backup está danificado na parte "${key}".`);
        }
        summary[key] = list.length;
      }
      if (!Object.keys(summary).length) throw new Error("O backup está vazio.");
      return { exportedAt: backup.exportedAt, exportedBy: backup.exportedBy, projectId: backup.projectId, counts: summary };
    },

    // Restaura sem NUNCA apagar nada do banco:
    //  - mode "missing": só recoloca o que não existe mais (o que existe fica como está);
    //  - mode "overwrite": recoloca tudo, sobrescrevendo o que existe com a versão do backup.
    async restore(backup, { keys, mode, onProgress }) {
      const result = {};
      for (const key of keys) {
        const list = backup.collections?.[key] || [];
        const existing = new Set((await collection(key).get()).docs.map((doc) => doc.id));
        const stats = { restored: 0, skipped: 0, failed: 0, unavailable: 0, error: "" };
        for (let start = 0; start < list.length; start += 400) {
          const chunk = list.slice(start, start + 400);
          const batch = window.portalFirebaseDb.batch();
          let inBatch = 0;
          for (const item of chunk) {
            if (mode === "missing" && existing.has(item.id)) {
              stats.skipped += 1;
              continue;
            }
            if (UPDATE_ONLY.has(key) && !existing.has(item.id)) {
              stats.unavailable += 1;
              continue;
            }
            batch.set(collection(key).doc(item.id), item.data);
            inBatch += 1;
          }
          try {
            if (inBatch) await batch.commit();
            stats.restored += inBatch;
          } catch (error) {
            stats.failed += inBatch;
            stats.error = String(error?.code || error?.message || error);
          }
          if (onProgress) onProgress(key, Math.min(start + 400, list.length), list.length);
        }
        result[key] = stats;
      }
      return result;
    }
  });
})();
