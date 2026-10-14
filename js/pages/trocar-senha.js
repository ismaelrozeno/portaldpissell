// Troca obrigatória da senha temporária dada pelo administrador (Senhas.html). O js/core/firebase-auth.js manda
// para cá quem entra com "mustChangePassword"; só depois de salvar a senha nova a pessoa usa o portal.
(async () => {
  const form = document.querySelector("#recovery-form");
  const password = document.querySelector("#recovery-password");
  const confirmation = document.querySelector("#recovery-confirmation");
  const submit = document.querySelector("#recovery-submit");
  const status = document.querySelector("#recovery-status");
  const passwordRequirements = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

  await window.portalAuthDemo?.ready();
  const session = window.portalAuthDemo?.getSession();
  if (!session) {
    window.location.replace("Acesso.html#login");
    return;
  }
  if (!session.mustChangePassword) {
    window.location.replace("Portal.html");
    return;
  }
  if (session.name) document.querySelector("#change-intro").textContent = `${session.name.split(" ")[0]}, você entrou com uma senha temporária. Antes de usar o portal, crie uma senha só sua.`;

  const showStatus = (text, isError) => {
    status.hidden = false;
    status.textContent = text;
    status.classList.toggle("is-error", !!isError);
  };
  const setState = (input, valid, showMessage) => {
    const help = document.getElementById(input.getAttribute("aria-describedby"));
    input.classList.toggle("recovery-invalid", showMessage && !valid);
    help?.classList.toggle("is-visible", showMessage && !valid);
  };
  const validatePassword = (showMessage) => {
    const valid = passwordRequirements.test(password.value);
    setState(password, valid, showMessage && password.value.length > 0);
    return valid;
  };
  const validateConfirmation = (showMessage) => {
    const valid = confirmation.value.length > 0 && confirmation.value === password.value;
    setState(confirmation, valid, showMessage && confirmation.value.length > 0);
    return valid;
  };

  document.querySelectorAll(".recovery-password-toggle").forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const input = document.getElementById(toggle.getAttribute("aria-controls"));
      const showing = input.type === "text";
      input.type = showing ? "password" : "text";
      toggle.setAttribute("aria-label", showing ? "Mostrar senha" : "Ocultar senha");
      toggle.setAttribute("aria-pressed", String(!showing));
      toggle.classList.toggle("is-visible", !showing);
    });
  });
  password.addEventListener("input", () => validatePassword(false));
  password.addEventListener("blur", () => validatePassword(true));
  confirmation.addEventListener("input", () => validateConfirmation(false));
  confirmation.addEventListener("blur", () => validateConfirmation(true));
  password.focus();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validatePassword(true)) {
      showStatus("A senha nova precisa ter pelo menos 8 caracteres, com letra maiúscula, minúscula, número e caractere especial.", true);
      return;
    }
    if (!validateConfirmation(true)) {
      showStatus("As duas senhas não estão iguais.", true);
      return;
    }
    submit.disabled = true;
    submit.textContent = "Salvando…";
    try {
      await window.portalAuthDemo.changeTemporaryPassword(password.value);
      showStatus("Senha nova salva! Abrindo o portal…");
      window.location.replace(session.roleValue === "administrador-analista" ? "Administrador-Portal.html" : "Portal.html");
    } catch (error) {
      console.error("Falha ao trocar a senha temporária.", error);
      const code = error?.code || "";
      if (code === "auth/requires-recent-login" || code === "auth/user-token-expired") {
        showStatus("Por segurança, entre de novo com a senha temporária e crie a senha nova logo em seguida.", true);
        setTimeout(() => window.portalAuthDemo.logout().then(() => window.location.replace("Acesso.html#login")), 2500);
        return;
      }
      showStatus(code === "auth/weak-password"
        ? "Essa senha é fraca demais. Escolha outra."
        : code === "auth/network-request-failed"
          ? "Sem conexão com a internet. Confira a conexão e tente de novo."
          : "Não foi possível salvar a senha nova. Tente de novo.", true);
      submit.disabled = false;
      submit.textContent = "Salvar senha nova e entrar";
    }
  });
})();
