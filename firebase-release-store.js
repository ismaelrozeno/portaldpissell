(() => {
  const releasesCollection = () => window.portalFirebaseDb.collection(window.portalDataModel?.collections?.releases || "releases");

  function toPlain(doc) {
    return { id: doc.id, ...doc.data() };
  }

  function cutoffIso() {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - (window.portalDataModel?.retentionMonths || 24));
    return cutoffDate.toISOString();
  }

  // Ordem do fluxo: encarregado solicita -> engenheiro decide o abono (ou recusa e devolve ao encarregado)
  // -> DP autoriza ou nega -> portaria confirma a saída.
  window.portalReleaseFlow = Object.freeze({
    stages: Object.freeze({
      engineer: { label: "Aguardando engenheiro", tone: "pending" },
      foreman: { label: "Recusada pelo engenheiro", tone: "denied" },
      dp: { label: "Aguardando DP", tone: "pending" },
      gate: { label: "Autorizada · aguardando saída", tone: "approved" },
      exited: { label: "Saída confirmada", tone: "approved" },
      closed: { label: "Negada pelo DP", tone: "denied" }
    }),
    refusalReasons: Object.freeze([
      "Ajustar horário",
      "Ajustar motivo da liberação"
    ]),
    // "Entrada", "Saída" ou "Entrada e saída". Liberações antigas não guardaram: eram só saída.
    movementLabel(release) {
      const list = release.movement?.length ? release.movement : ["saida"];
      const names = list.map((item) => item === "entrada" ? "Entrada" : "Saída");
      return names.length > 1 ? "Entrada e saída" : names[0];
    },
    // Liberações antigas não têm "stage": deriva da situação que já tinham.
    stageOf(release) {
      if (release.stage) return release.stage;
      if (release.status === "authorized") return release.exitConfirmedAt ? "exited" : "gate";
      return release.status === "denied" ? "closed" : "dp";
    }
  });

  window.portalDemoStore = Object.freeze({
    async getReleases() {
      const cutoff = cutoffIso();
      const snapshot = await releasesCollection().orderBy("createdAt", "desc").get();
      return snapshot.docs.map(toPlain).filter((release) => !release.createdAt || release.createdAt >= cutoff);
    },
    async saveRelease(release) {
      const data = { ...release, createdAt: release.createdAt || new Date().toISOString() };
      await releasesCollection().add(data);
      return this.getReleases();
    },
    // Acompanha uma liberação em tempo real; devolve a função para parar de acompanhar.
    subscribeRelease(id, callback) {
      return releasesCollection().doc(id).onSnapshot((doc) => {
        if (doc.exists) callback(toPlain(doc));
      }, (error) => console.warn("Falha ao acompanhar a liberação ao vivo.", error));
    },
    async updateRelease(id, changes) {
      await releasesCollection().doc(id).update(changes);
      return this.getReleases();
    },
    async removeRelease(id) {
      await releasesCollection().doc(id).delete();
      return this.getReleases();
    },
    async clearHistory() {
      const snapshot = await releasesCollection().get();
      const batch = window.portalFirebaseDb.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      return [];
    }
  });
})();
