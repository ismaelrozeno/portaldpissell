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
      closed: { label: "Negada pelo DP", tone: "denied" },
      // Retroativa (data anterior ao dia em que foi criada): o colaborador já saiu, então não há saída para o DP
      // autorizar nem para a portaria confirmar. Depois do engenheiro ela já fica registrada (o DP só lança o abono no RM).
      registered: { label: "Retroativa · registrada", tone: "approved" }
    }),
    // Data da liberação anterior ao dia em que ela foi criada (pelo relógio local de quem vê).
    isRetroactive(record) {
      const created = new Date(record?.createdAt || record?.requestedAt || "");
      if (!record?.date || Number.isNaN(created.getTime())) return false;
      const pad = (n) => String(n).padStart(2, "0");
      return String(record.date).slice(0, 10) < `${created.getFullYear()}-${pad(created.getMonth() + 1)}-${pad(created.getDate())}`;
    },
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
    // Retroativa que passou do engenheiro (ou que o DP já tinha autorizado) vira "registrada", inclusive as antigas.
    stageOf(release) {
      const stage = release.stage
        || (release.status === "authorized" ? (release.exitConfirmedAt ? "exited" : "gate") : release.status === "denied" ? "closed" : "dp");
      return ["dp", "gate"].includes(stage) && window.portalReleaseFlow.isRetroactive(release) ? "registered" : stage;
    }
  });

  // ---------- Internet ruim / sem conexão ----------
  // O site não pode travar esperando o servidor: leitura cai para o que já está no aparelho depois de alguns
  // segundos, gravação destrava a tela depois de alguns segundos (o Firestore guarda e envia sozinho quando a
  // internet volta, com a página aberta) e uma faixa avisa que está sem conexão.
  const READ_WAIT_MS = 4000;
  const WRITE_WAIT_MS = 1500;
  let offline = false;
  let lastGood = [];

  function showConnectionBanner() {
    let banner = document.querySelector("#connection-banner");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "connection-banner";
      banner.className = "connection-banner";
      banner.setAttribute("role", "status");
      banner.textContent = "Sem conexão com o servidor. Mostrando a última versão carregada; o que você fizer será enviado quando a internet voltar (mantenha a página aberta).";
      document.body.append(banner);
    }
    banner.hidden = !offline;
  }

  // "Sem conexão" só aparece se durar alguns segundos (evita a faixa piscar ao abrir a página); some na hora.
  let offlineTimer = null;
  function applyOffline(value) {
    if (offline === value) return;
    offline = value;
    showConnectionBanner();
    document.dispatchEvent(new CustomEvent("portal:connection", { detail: { offline } }));
  }
  function setOffline(value) {
    if (!value) {
      clearTimeout(offlineTimer);
      offlineTimer = null;
      applyOffline(false);
    } else if (!offline && !offlineTimer) {
      offlineTimer = setTimeout(() => { offlineTimer = null; applyOffline(true); }, 2500);
    }
  }

  // Lista ao vivo: um só "ouvinte" da coleção mantém a lista sempre atual no aparelho, inclusive com o que a
  // pessoa acabou de fazer sem internet. Assim ler as liberações é instantâneo (não espera o servidor) e a
  // tela nunca volta para uma versão antiga depois de um clique.
  let liveList = null;
  let liveStarted = false;
  let resolveSynced;
  const liveSynced = new Promise((resolve) => { resolveSynced = resolve; });
  function startLive() {
    if (liveStarted) return;
    liveStarted = true;
    releasesCollection().orderBy("createdAt", "desc").onSnapshot({ includeMetadataChanges: true }, (snapshot) => {
      const firstLoad = liveList === null;
      const before = liveList;
      liveList = snapshot.docs.map(toPlain);
      setOffline(snapshot.metadata.fromCache);
      if (!snapshot.metadata.fromCache) resolveSynced();
      // Avisa as telas quando os dados mudaram (outra pessoa, ou a gravação confirmada), não só os metadados.
      if (!firstLoad && snapshot.docChanges({ includeMetadataChanges: false }).length && before) {
        document.dispatchEvent(new CustomEvent("portal:releases-updated"));
      }
    }, (error) => {
      console.warn("Falha ao acompanhar as liberações ao vivo.", error);
      liveStarted = false;
      liveList = null;
    });
  }

  // Tenta o servidor; se demorar, usa a cópia do aparelho (cache) para não deixar a tela esperando.
  async function fetchReleasesSnapshot() {
    const query = releasesCollection().orderBy("createdAt", "desc");
    const fromServer = query.get();
    fromServer.catch(() => {});
    const first = await Promise.race([fromServer, new Promise((resolve) => setTimeout(() => resolve(null), READ_WAIT_MS))]);
    if (first) return first;
    try {
      return await query.get({ source: "cache" });
    } catch (error) {
      return fromServer;
    }
  }

  // Grava sem prender a tela: se o servidor não confirmar em alguns segundos, segue (a gravação fica na fila).
  async function write(promise) {
    // Já sabe que está sem conexão: não espera nada (a alteração já aparece na tela e fica na fila de envio).
    const wait = offline ? 0 : WRITE_WAIT_MS;
    const result = await Promise.race([promise.then(() => "ok"), new Promise((resolve) => setTimeout(() => resolve("pending"), wait))]);
    if (result === "pending") {
      setOffline(true);
      promise.then(() => setOffline(false), (error) => console.error("O servidor recusou uma alteração enviada depois.", error));
    } else {
      setOffline(false);
    }
  }

  window.portalDemoStore = Object.freeze({
    isOffline: () => offline,
    async getReleases() {
      const cutoff = cutoffIso();
      startLive();
      // Na primeira vez espera o servidor (até alguns segundos); depois é instantâneo.
      await Promise.race([liveSynced, new Promise((resolve) => setTimeout(resolve, READ_WAIT_MS))]);
      if (liveList && (liveList.length || !lastGood.length)) {
        lastGood = liveList;
        return liveList.filter((release) => !release.createdAt || release.createdAt >= cutoff);
      }
      // Sem a lista ao vivo (ainda carregando ou erro): busca direto, com o mesmo limite de espera.
      const snapshot = await fetchReleasesSnapshot();
      const list = snapshot.docs.map(toPlain).filter((release) => !release.createdAt || release.createdAt >= cutoff);
      if (snapshot.metadata.fromCache) {
        setOffline(true);
        // Sem conexão, a cópia do aparelho pode ter só parte das liberações: junta com a última lista completa
        // (as do aparelho, que já incluem o que a pessoa acabou de fazer, prevalecem) para nada "sumir" da tela.
        const merged = new Map(lastGood.map((release) => [release.id, release]));
        list.forEach((release) => merged.set(release.id, release));
        lastGood = [...merged.values()].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
        return lastGood;
      } else {
        setOffline(false);
      }
      lastGood = list;
      return list;
    },
    async saveRelease(release) {
      const data = { ...release, createdAt: release.createdAt || new Date().toISOString() };
      await write(releasesCollection().add(data));
      return this.getReleases();
    },
    // Acompanha uma liberação em tempo real; devolve a função para parar de acompanhar.
    subscribeRelease(id, callback) {
      return releasesCollection().doc(id).onSnapshot((doc) => {
        if (doc.exists) callback(toPlain(doc));
      }, (error) => console.warn("Falha ao acompanhar a liberação ao vivo.", error));
    },
    // Não relê a coleção inteira depois de gravar: quem chama já redesenha a tela com os dados novos.
    async updateRelease(id, changes) {
      await write(releasesCollection().doc(id).update(changes));
    },
    // Lixeira por usuário: põe/tira SÓ o id de quem está logado na lista (hiddenFor/purgedFor), de forma
    // atômica no banco. Nunca regrava a lista inteira a partir de uma cópia antiga da tela — senão a ação
    // de um usuário podia esconder ou apagar a liberação do histórico de outro.
    async addToList(id, field, value) {
      await write(releasesCollection().doc(id).update({ [field]: firebase.firestore.FieldValue.arrayUnion(value) }));
    },
    async removeFromList(id, field, value) {
      await write(releasesCollection().doc(id).update({ [field]: firebase.firestore.FieldValue.arrayRemove(value) }));
    },
    async removeRelease(id) {
      await write(releasesCollection().doc(id).delete());
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
