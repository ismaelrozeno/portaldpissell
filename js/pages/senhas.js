// Redefinir senhas (só o administrador). Quem troca a senha é a Cloud Function "resetUserPassword"
// (functions/index.js): o site sozinho não pode mudar a senha de outra pessoa no Firebase.
(async () => {
  await window.portalAuthDemo?.ready();
  const session = window.portalAuthDemo?.getSession();
  const $ = (selector) => document.querySelector(selector);
  if (session?.roleValue !== "administrador-analista") {
    $("#pw-denied").hidden = false;
    return;
  }
  $("#pw-app").hidden = false;

  const callReset = firebase.app().functions("southamerica-east1").httpsCallable("resetUserPassword");
  const esc = window.escapeHtml;
  const when = (iso) => (iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "");
  let identifier = "";

  const showError = (text) => {
    $("#pw-error").textContent = text;
    $("#pw-error").hidden = !text;
  };
  const errorText = (error) => {
    const code = String(error?.code || "").replace("functions/", "");
    if (["not-found", "permission-denied", "failed-precondition", "invalid-argument"].includes(code)) return error.message;
    if (code === "unauthenticated") return "Sua sessão expirou. Entre de novo no portal.";
    if (code === "internal" || code === "unavailable") return "O serviço de senhas não respondeu. Confira a internet; se continuar, a função ainda não foi publicada no Firebase.";
    return "Não foi possível concluir. Tente de novo.";
  };
  const reset = () => {
    identifier = "";
    $("#pw-person").hidden = true;
    $("#pw-done").hidden = true;
    $("#pw-search").hidden = false;
    $("#pw-identifier").value = "";
    showError("");
    $("#pw-identifier").focus();
  };

  async function loadHistory() {
    const list = $("#pw-history");
    try {
      const snapshot = await window.portalFirebaseDb.collection("passwordResets").orderBy("at", "desc").limit(15).get();
      list.innerHTML = snapshot.empty
        ? "<li>Nenhuma senha redefinida ainda.</li>"
        : snapshot.docs.map((doc) => {
          const item = doc.data();
          return `<li><strong>${esc(item.name || "Sem nome")}</strong><small>${esc(item.role || "")}${item.matricula ? ` · ${esc(item.matricula)}` : ""}</small><small>Por ${esc(item.byName || "—")} em ${esc(when(item.at))}</small></li>`;
        }).join("");
    } catch (error) {
      console.warn("Não foi possível carregar o histórico.", error);
      list.innerHTML = "<li>Não foi possível carregar o histórico (as regras do Firebase podem estar desatualizadas).</li>";
    }
  }

  $("#pw-search").addEventListener("submit", async (event) => {
    event.preventDefault();
    const value = $("#pw-identifier").value.trim();
    if (!/^\d{7}$/.test(value) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      showError("Digite a matrícula (7 números) ou o e-mail da pessoa.");
      return;
    }
    showError("");
    const stop = window.portalButtonLoading?.($("#pw-find"), "Buscando…");
    try {
      const { data } = await callReset({ identifier: value, action: "lookup" });
      const person = data.person;
      identifier = value;
      $("#pw-person-name").textContent = person.name || "Nome não informado";
      $("#pw-person-info").innerHTML = [
        person.role && `Perfil: <strong>${esc(person.role)}</strong>`,
        person.matricula && `Matrícula: <strong>${esc(person.matricula)}</strong>`,
        person.email && `E-mail: ${esc(person.email)}`,
        person.lastResetAt && `Última senha redefinida em ${esc(when(person.lastResetAt))}${person.lastResetBy ? ` por ${esc(person.lastResetBy)}` : ""}`
      ].filter(Boolean).join("<br>");
      $("#pw-person").hidden = false;
    } catch (error) {
      console.error("Falha ao buscar a pessoa.", error);
      showError(errorText(error));
    } finally {
      stop?.();
    }
  });

  $("#pw-cancel").addEventListener("click", reset);
  $("#pw-again").addEventListener("click", reset);

  $("#pw-reset").addEventListener("click", async () => {
    const name = $("#pw-person-name").textContent;
    if (!identifier || !window.confirm(`Redefinir a senha de ${name}? A senha atual deixa de valer na hora.`)) return;
    const stop = window.portalButtonLoading?.($("#pw-reset"), "Redefinindo…");
    try {
      const { data } = await callReset({ identifier, action: "reset" });
      $("#pw-done-name").textContent = data.person.name || name;
      $("#pw-temp").textContent = data.password;
      $("#pw-person").hidden = true;
      $("#pw-search").hidden = true;
      $("#pw-done").hidden = false;
      loadHistory();
    } catch (error) {
      console.error("Falha ao redefinir a senha.", error);
      showError(errorText(error));
    } finally {
      stop?.();
    }
  });

  $("#pw-copy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($("#pw-temp").textContent);
      $("#pw-copy").textContent = "Copiada!";
    } catch (error) {
      $("#pw-copy").textContent = "Selecione e copie";
    }
    setTimeout(() => { $("#pw-copy").textContent = "Copiar"; }, 2000);
  });

  loadHistory();
  const preset = new URLSearchParams(window.location.search).get("q");
  if (preset) {
    $("#pw-identifier").value = preset;
    $("#pw-search").requestSubmit();
  } else {
    $("#pw-identifier").focus();
  }
})();
