(() => {
  const storageKey = "issellPortalDemoReleases";
  function read() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      return Array.isArray(saved) ? saved : [];
    } catch (error) {
      console.warn("Não foi possível ler as liberações locais.", error);
      return [];
    }
  }

  function readCurrent() {
    const releases = read();
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 24);
    const cutoff = cutoffDate.getTime();
    const current = releases.filter((release) => {
      if (!release.createdAt) return true;
      const createdAt = Date.parse(release.createdAt);
      return Number.isNaN(createdAt) || createdAt >= cutoff;
    });
    if (current.length !== releases.length) write(current);
    return current;
  }

  function write(releases) {
    localStorage.setItem(storageKey, JSON.stringify(releases));
  }

  window.portalDemoStore = Object.freeze({
    getReleases: readCurrent,
    saveRelease(release) {
      const releases = readCurrent();
      releases.unshift({ ...release, id: `release-${Date.now()}`, createdAt: release.createdAt || new Date().toISOString() });
      write(releases);
      return releases;
    },
    updateRelease(id, changes) {
      const releases = readCurrent().map((release) => release.id === id ? { ...release, ...changes } : release);
      write(releases);
      return releases;
    },
    removeRelease(id) {
      const releases = readCurrent().filter((release) => release.id !== id);
      write(releases);
      return releases;
    },
    clearHistory() {
      write([]);
      return [];
    }
  });
})();
