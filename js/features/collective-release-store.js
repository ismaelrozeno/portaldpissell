// Liberações coletivas (lista de presença de uma tarefa do dia), guardadas à parte das liberações individuais
// para não entrarem no fluxo engenheiro/DP/portaria, no Excel nem no fechamento mensal.
(() => {
  const collection = () => window.portalFirebaseDb.collection(window.portalDataModel?.collections?.collectiveReleases || "collectiveReleases");
  const toPlain = (doc) => ({ id: doc.id, ...doc.data() });

  window.portalCollectiveStore = Object.freeze({
    // Todas, mais recentes primeiro (sem limite: os cartões do resumo precisam contar todas as folhas).
    async getAll() {
      const snapshot = await collection().orderBy("createdAt", "desc").get();
      return snapshot.docs.map(toPlain);
    },
    // Todas, sem ordem (exportação do mês em Backup).
    async getEverything() {
      const snapshot = await collection().get();
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
    // Grava só a assinatura (digital) de um participante, sem mexer nas dos outros.
    async signParticipant(id, matricula, signature) {
      await collection().doc(id).update(new firebase.firestore.FieldPath("participantSignatures", String(matricula)), signature);
    },
    // Saída de um colaborador na portaria (value = { at, by, byRole }); null desfaz a marcação.
    async markExit(id, matricula, value) {
      await collection().doc(id).update(new firebase.firestore.FieldPath("participantExits", String(matricula)), value || firebase.firestore.FieldValue.delete());
    },
    // Quem vê o quê: o engenheiro, só o que foi enviado a ele (ou a "todos"); DP e administrador, tudo;
    // encarregado e demais solicitantes, só o que eles mesmos enviaram.
    // profileKey: perfil aberto no Meu portal. O administrador troca de perfil e, como nas individuais, vê pelo perfil
    // aberto: como encarregado/estagiário/analista/segurança, só o que ele mesmo enviou; como portaria, só o autorizado.
    byRole(sheets, profileKey) {
      const session = window.portalAuthDemo?.getSession();
      const role = session?.roleValue;
      const same = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
      if (role === "administrador-analista" && profileKey) {
        if (["encarregado", "estagiario_engenharia", "analista", "seguranca_trabalho"].includes(profileKey)) return sheets.filter((sheet) => sheet.createdByUid === session.uid);
        if (profileKey === "portaria") return sheets.filter((sheet) => ["gate", "exited"].includes(window.portalCollectiveSheet?.stageOf(sheet) ?? sheet.stage));
      }
      // Analista com acesso de engenheiro, no painel do engenheiro: recebe todas as folhas (como o engenheiro Gestor).
      if (role === "analista" && profileKey === "engenheiro" && window.portalAuthDemo?.isEngineerLike?.()) return sheets;
      if (role === "dp" || role === "administrador-analista" || window.portalAuthDemo?.isDpDelegate?.()) return sheets;
      // Engenheiro Gestor recebe todas as folhas, mesmo as enviadas a outro engenheiro.
      if (role === "engenheiro" && window.portalAuthDemo?.isManager?.()) return sheets;
      if (role === "engenheiro") return sheets.filter((sheet) => !sheet.targetEngineer || same(sheet.targetEngineer, session.name));
      // Portaria: só o que o DP autorizou (aguardando saída ou saída já confirmada).
      if (role === "porteiro") return sheets.filter((sheet) => ["gate", "exited"].includes(window.portalCollectiveSheet?.stageOf(sheet) ?? sheet.stage));
      return sheets.filter((sheet) => sheet.createdByUid === session?.uid);
    },
    // Lixeira de cada usuário (como nas liberações individuais): "hiddenFor" = está na lixeira de quem apagou,
    // "purgedFor" = apagada de vez só do histórico dele. Mexe só no id de quem está logado.
    myId: () => window.portalAuthDemo?.getSession()?.uid || "",
    visibleFor(sheets, profileKey) {
      const me = this.myId();
      return this.byRole(sheets, profileKey).filter((sheet) => !(sheet.hiddenFor || []).includes(me) && !(sheet.purgedFor || []).includes(me));
    },
    trashFor(sheets, profileKey) {
      const me = this.myId();
      return this.byRole(sheets, profileKey).filter((sheet) => (sheet.hiddenFor || []).includes(me) && !(sheet.purgedFor || []).includes(me));
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
