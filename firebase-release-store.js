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
