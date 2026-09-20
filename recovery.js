(function setupPasswordRecovery() {
  const form = document.querySelector("#recovery-form");
  if (!form) {
    return;
  }

  const email = document.querySelector("#recovery-email");
  const code = document.querySelector("#recovery-code");
  const verification = document.querySelector("#recovery-verification");
  const submit = document.querySelector("#recovery-submit");
  const password = document.querySelector("#recovery-password");
  const confirmation = document.querySelector("#recovery-confirmation");
  const status = document.querySelector("#recovery-status");
  const passwordRequirements = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

  const setState = (input, valid, showMessage) => {
    const help = document.getElementById(input.getAttribute("aria-describedby"));
    input.classList.toggle("recovery-invalid", showMessage && !valid);
    if (help) {
      help.classList.toggle("is-visible", showMessage && !valid);
    }
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

  const validateEmail = (showMessage) => {
    const valid = email.validity.valid && email.value.trim().length > 0;
    setState(email, valid, showMessage && email.value.length > 0);
    return valid;
  };

  const validateCode = (showMessage) => {
    const valid = /^\d{6}$/.test(code.value.trim());
    setState(code, valid, showMessage && code.value.length > 0);
    return valid;
  };

  const validatePassword = (showMessage) => {
    const valid = passwordRequirements.test(password.value);
    setState(password, password.value.length > 0 && valid, showMessage && password.value.length > 0);
    return password.value.length > 0 && valid;
  };

  const validateConfirmation = (showMessage) => {
    const valid = confirmation.value.length > 0 && confirmation.value === password.value;
    setState(confirmation, valid, showMessage && confirmation.value.length > 0);
    return valid;
  };

  email.addEventListener("input", () => validateEmail(false));
  email.addEventListener("blur", () => validateEmail(true));
  code.addEventListener("input", () => {
    code.value = code.value.replace(/\D/g, "").slice(0, 6);
    validateCode(false);
  });
  code.addEventListener("blur", () => validateCode(true));
  password.addEventListener("input", () => validatePassword(false));
  password.addEventListener("blur", () => validatePassword(true));
  confirmation.addEventListener("input", () => validateConfirmation(false));
  confirmation.addEventListener("blur", () => validateConfirmation(true));

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (verification.hidden) {
      if (!validateEmail(true)) {
        return;
      }

      verification.hidden = false;
      email.readOnly = true;
      submit.textContent = "Confirmar código e alterar senha";
      status.hidden = false;
      status.textContent = "Se o e-mail estiver cadastrado, um código de verificação será enviado. Nesta versão de demonstração, informe um código de 6 números.";
      code.focus();
      return;
    }

    const valid = validateEmail(true) && validateCode(true) && validatePassword(true) && validateConfirmation(true);
    if (!valid) {
      return;
    }

    status.hidden = false;
    status.textContent = "Código validado visualmente. A gravação da nova senha será conectada ao sistema em uma próxima etapa.";
  });
})();
