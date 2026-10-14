(function setupPasswordRecovery() {
  const form = document.querySelector("#recovery-form");
  if (!form) {
    return;
  }

  const identifier = document.querySelector("#recovery-identifier");
  const submit = document.querySelector("#recovery-submit");
  const status = document.querySelector("#recovery-status");
  const help = document.getElementById(identifier.getAttribute("aria-describedby"));
  const submitText = submit.textContent;
  const fixedAdministratorMessage = "A senha do Administrador Analista só pode ser alterada diretamente no código.";
  // Espera entre um envio e outro (o Firebase também bloqueia muitos pedidos seguidos).
  const waitSeconds = 60;

  const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const isRegistration = (value) => /^\d{7}$/.test(value);

  const validate = (showMessage) => {
    const value = identifier.value.trim();
    const valid = isEmail(value) || isRegistration(value);
    const show = showMessage && value.length > 0 && !valid;
    identifier.classList.toggle("recovery-invalid", show);
    help?.classList.toggle("is-visible", show);
    return valid;
  };

  const showStatus = (text, isError) => {
    status.hidden = false;
    status.textContent = text;
    status.classList.toggle("is-error", !!isError);
  };

  // "joao.silva@gmail.com" -> "jo•••••••@gmail.com": quem digitou a matrícula sabe para onde o link foi, sem expor o e-mail inteiro.
  const maskEmail = (email) => {
    const [user, domain] = String(email).split("@");
    if (!domain) return "";
    return `${user.slice(0, 2)}${"•".repeat(Math.max(user.length - 2, 3))}@${domain}`;
  };

  const holdButton = () => {
    let left = waitSeconds;
    submit.disabled = true;
    const tick = () => {
      if (left <= 0) {
        submit.disabled = false;
        submit.textContent = "Enviar de novo";
        return;
      }
      submit.textContent = `Enviar de novo (${left}s)`;
      left -= 1;
      setTimeout(tick, 1000);
    };
    tick();
  };

  identifier.addEventListener("input", () => validate(false));
  identifier.addEventListener("blur", () => validate(true));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const value = identifier.value.trim();
    if (window.portalAuthDemo?.isFixedAdministratorIdentifier(value)) {
      showStatus(fixedAdministratorMessage, true);
      return;
    }
    if (!validate(true)) {
      identifier.focus();
      return;
    }
    submit.disabled = true;
    submit.textContent = "Enviando…";
    try {
      await window.portalAuthDemo.ready();
      const email = await window.portalAuthDemo.sendPasswordReset(value);
      if (!email) {
        showStatus("Não encontramos cadastro com essa matrícula. Confira os números ou tente pelo e-mail.", true);
        submit.disabled = false;
        submit.textContent = submitText;
        return;
      }
      const where = isRegistration(value) ? `o e-mail do seu cadastro (${maskEmail(email)})` : "esse e-mail, se ele estiver cadastrado";
      showStatus(`Pronto! Mandamos um link para ${where}. Abra o e-mail, toque no link e crie a senha nova. Se não aparecer em alguns minutos, olhe a caixa de Spam.`);
      holdButton();
    } catch (error) {
      console.error("Falha ao pedir o e-mail de nova senha.", error);
      const code = error?.code || "";
      const message = code === "auth/user-not-found"
        ? "Não encontramos cadastro com esse e-mail. Confira se digitou certo ou tente pela matrícula."
        : code === "auth/invalid-email"
          ? "Esse e-mail não é válido. Confira se digitou certo."
          : code === "auth/too-many-requests"
            ? "Foram muitos pedidos seguidos. Espere alguns minutos e tente de novo."
            : code === "auth/network-request-failed"
              ? "Sem conexão com a internet. Confira a conexão e tente de novo."
              : "Não foi possível mandar o e-mail agora. Tente de novo em alguns minutos ou peça ao administrador para redefinir a sua senha.";
      showStatus(message, true);
      submit.disabled = false;
      submit.textContent = submitText;
    }
  });
})();
