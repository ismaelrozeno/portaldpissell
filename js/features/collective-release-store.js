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
      const key = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
      const same = (a, b) => key(a) === key(b);
      // Do engenheiro: enviada a ele, ou enviada a todos e ainda não assinada/recusada por OUTRO engenheiro
      // (quem assina primeiro fica com ela; assinatura do Administrador não conta).
      const forEngineer = (sheet, name) => {
        if (sheet.targetEngineer) return same(sheet.targetEngineer, name);
        const by = sheet.bonusStatus ? sheet.engineer : sheet.refusedBy;
        return !by || /administrador/i.test(`${by} ${sheet.engineerRole || ""}`) || same(by, name);
      };
      if (role === "administrador-analista" && profileKey) {
        // Simulador: com uma pessoa escolhida (window.portalViewAs), vê exatamente o que ela vê.
        const viewAs = window.portalViewAs;
        if (["encarregado", "estagiario_engenharia", "analista", "seguranca_trabalho"].includes(profileKey)) return sheets.filter((sheet) => sheet.createdByUid === (viewAs?.uid || session.uid));
        if (profileKey === "engenheiro" && viewAs) {
          return (viewAs.privileges || []).includes("gestor") ? sheets : sheets.filter((sheet) => forEngineer(sheet, viewAs.name));
        }
        if (profileKey === "portaria") return sheets.filter((sheet) => ["gate", "exited"].includes(window.portalCollectiveSheet?.stageOf(sheet) ?? sheet.stage));
      }
      // Analista com acesso de engenheiro, no painel do engenheiro: igual ao engenheiro
      // (só o Gestor recebe todas; o comum, o que foi enviado a ele ou a todos — igual ao engenheiro).
      if (role === "analista" && profileKey === "engenheiro" && window.portalAuthDemo?.isEngineerLike?.()) {
        return window.portalAuthDemo?.isManager?.() ? sheets : sheets.filter((sheet) => forEngineer(sheet, session.name));
      }
      if (role === "dp" || role === "administrador-analista" || window.portalAuthDemo?.isDpDelegate?.()) return sheets;
      // Engenheiro Gestor recebe todas as folhas, mesmo as enviadas a outro engenheiro.
      if (role === "engenheiro" && window.portalAuthDemo?.isManager?.()) return sheets;
      if (role === "engenheiro") return sheets.filter((sheet) => forEngineer(sheet, session.name));
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
