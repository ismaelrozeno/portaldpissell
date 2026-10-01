// Liberações coletivas (lista de presença de uma tarefa do dia), guardadas à parte das liberações individuais
// para não entrarem no fluxo engenheiro/DP/portaria, no Excel nem no fechamento mensal.
(() => {
  const collection = () => window.portalFirebaseDb.collection(window.portalDataModel?.collections?.collectiveReleases || "collectiveReleases");
  const toPlain = (doc) => ({ id: doc.id, ...doc.data() });

  window.portalCollectiveStore = Object.freeze({
    async getAll() {
      const snapshot = await collection().orderBy("createdAt", "desc").limit(100).get();
      return snapshot.docs.map(toPlain);
    },
    async save(sheet) {
      const data = { ...sheet, createdAt: sheet.createdAt || new Date().toISOString() };
      const ref = await collection().add(data);
      return { id: ref.id, ...data };
    },
    async update(id, changes) {
      await collection().doc(id).update(changes);
    },
    // Quem vê o quê: o engenheiro, só o que foi enviado a ele (ou a "todos"); DP e administrador, tudo;
    // encarregado e demais solicitantes, só o que eles mesmos enviaram.
    byRole(sheets) {
      const session = window.portalAuthDemo?.getSession();
      const role = session?.roleValue;
      const same = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
      if (role === "dp" || role === "administrador-analista" || window.portalAuthDemo?.isDpDelegate?.()) return sheets;
      // Engenheiro Gestor recebe todas as folhas, mesmo as enviadas a outro engenheiro.
      if (role === "engenheiro" && window.portalAuthDemo?.isManager?.()) return sheets;
      if (role === "engenheiro") return sheets.filter((sheet) => !sheet.targetEngineer || same(sheet.targetEngineer, session.name));
      // Portaria: só o que o DP autorizou (aguardando saída ou saída já confirmada).
      if (role === "porteiro") return sheets.filter((sheet) => ["gate", "exited"].includes(sheet.stage));
      return sheets.filter((sheet) => sheet.createdByUid === session?.uid);
    },
    // Lixeira de cada usuário (como nas liberações individuais): "hiddenFor" = está na lixeira de quem apagou,
    // "purgedFor" = apagada de vez só do histórico dele. Mexe só no id de quem está logado.
    myId: () => window.portalAuthDemo?.getSession()?.uid || "",
    visibleFor(sheets) {
      const me = this.myId();
      return this.byRole(sheets).filter((sheet) => !(sheet.hiddenFor || []).includes(me) && !(sheet.purgedFor || []).includes(me));
    },
    trashFor(sheets) {
      const me = this.myId();
      return this.byRole(sheets).filter((sheet) => (sheet.hiddenFor || []).includes(me) && !(sheet.purgedFor || []).includes(me));
    },
    async addToList(id, field, value) {
      await collection().doc(id).update({ [field]: firebase.firestore.FieldValue.arrayUnion(value) });
    },
    async removeFromList(id, field, value) {
      await collection().doc(id).update({ [field]: firebase.firestore.FieldValue.arrayRemove(value) });
    },
    async remove(id) {
      await collection().doc(id).delete();
    }
  });
})();
