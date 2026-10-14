// Funções do servidor do Portal DP. O site é estático (GitHub Pages); só o servidor pode trocar a senha de outra
// pessoa no Firebase Authentication, por isso esta parte mora aqui. Publicar: firebase deploy --only functions
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
const { randomInt } = require("node:crypto");

initializeApp();

const ADMIN_EMAIL = "admin@admdf.site";
const ROLE_LABELS = {
  "administrador-analista": "Administrador Analista", dp: "Departamento Pessoal", encarregado: "Encarregado",
  estagiario_engenharia: "Estagiário de Engenharia", analista: "Analista", seguranca_trabalho: "Segurança do trabalho",
  engenheiro: "Engenheiro", porteiro: "Portaria"
};

// Senha temporária fácil de ditar por telefone, e que já cumpre a regra do portal (maiúscula, minúscula, número e
// caractere especial): "Laje-4827-Tk". A pessoa é obrigada a trocar no primeiro login.
const WORDS = ["Obra", "Laje", "Viga", "Torre", "Ponte", "Bloco", "Areia", "Telha", "Pedra", "Prumo", "Trena", "Nivel", "Tijolo", "Cimento", "Martelo", "Andaime"];
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnpqrstuvwxyz";
function temporaryPassword() {
  const digits = String(randomInt(0, 10000)).padStart(4, "0");
  return `${WORDS[randomInt(WORDS.length)]}-${digits}-${UPPER[randomInt(UPPER.length)]}${LOWER[randomInt(LOWER.length)]}`;
}

// Só a conta do administrador redefine senhas.
function canReset(profile, email) {
  return !!profile && profile.status === "approved" && profile.roleValue === "administrador-analista" &&
    String(email || "").toLowerCase() === ADMIN_EMAIL;
}

// Busca a pessoa pela matrícula (índice do login) ou pelo e-mail.
async function findUser(db, identifier) {
  const value = String(identifier || "").trim();
  if (/^\d{7}$/.test(value)) {
    const index = await db.doc(`matriculaIndex/${value}`).get();
    return index.exists ? index.data().uid || "" : "";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new HttpsError("invalid-argument", "Digite uma matrícula de 7 números ou um e-mail.");
  try {
    return (await getAuth().getUserByEmail(value)).uid;
  } catch (error) {
    if (error.code === "auth/user-not-found") return "";
    throw error;
  }
}

// data: { identifier: "1234567" ou "email", action: "lookup" (só mostra quem é) | "reset" (redefine) }
exports.resetUserPassword = onCall({ region: "southamerica-east1" }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Entre no portal para redefinir senhas.");
  const db = getFirestore();
  const caller = (await db.doc(`users/${request.auth.uid}`).get()).data();
  if (!canReset(caller, request.auth.token.email)) throw new HttpsError("permission-denied", "Só o administrador redefine senhas.");

  const uid = await findUser(db, request.data?.identifier);
  if (!uid) throw new HttpsError("not-found", "Não encontramos cadastro com essa matrícula ou e-mail.");
  if (uid === request.auth.uid) throw new HttpsError("failed-precondition", "Para trocar a sua própria senha, use \"Alterar senha\" no seu perfil.");
  const account = await getAuth().getUser(uid);
  const profile = (await db.doc(`users/${uid}`).get()).data() || {};
  if (profile.roleValue === "administrador-analista" || String(account.email || "").toLowerCase() === ADMIN_EMAIL) {
    throw new HttpsError("permission-denied", "A senha do Administrador Analista não pode ser redefinida por aqui.");
  }

  const person = {
    name: profile.name || account.displayName || "",
    email: account.email || profile.email || "",
    matricula: profile.matricula || "",
    role: ROLE_LABELS[profile.roleValue] || profile.role || "",
    lastResetAt: profile.passwordResetAt || "",
    lastResetBy: profile.passwordResetBy || ""
  };
  if (request.data?.action !== "reset") return { person };

  const password = temporaryPassword();
  const at = new Date().toISOString();
  await getAuth().updateUser(uid, { password });
  // Desconecta a conta dos outros aparelhos (quem estava usando a senha antiga precisa entrar de novo).
  await getAuth().revokeRefreshTokens(uid);
  await db.doc(`users/${uid}`).set({ mustChangePassword: true, passwordResetBy: caller.name || "", passwordResetAt: at }, { merge: true });
  await db.collection("passwordResets").add({
    uid, name: person.name, matricula: person.matricula, role: person.role,
    byUid: request.auth.uid, byName: caller.name || "", at
  });
  return { person, password };
});
