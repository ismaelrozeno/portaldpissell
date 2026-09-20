(function setupAccessTabs() {
  const matriculaInputs = Array.from(document.querySelectorAll('[name="matricula"]'));

  matriculaInputs.forEach((input) => {
    input.addEventListener("input", () => {
      const numericValue = input.value.replace(/\D/g, "").slice(0, 7);
      if (input.value !== numericValue) {
        input.value = numericValue;
      }
    });
  });

  const loginIdentifier = document.querySelector("#identificador-login");
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (loginIdentifier) {
    const updateLoginIdentifier = (showMessage) => {
      const value = loginIdentifier.value.trim();
      const valid = /^\d{7}$/.test(value) || emailPattern.test(value);
      const help = document.getElementById("identificador-login-ajuda");

      loginIdentifier.setCustomValidity("");
      if (help) {
        help.classList.toggle("is-visible", showMessage && value.length > 0 && !valid);
      }
      loginIdentifier.classList.toggle("password-invalid", showMessage && value.length > 0 && !valid);
      loginIdentifier.classList.toggle("password-valid", showMessage && valid);
      loginIdentifier.setCustomValidity(
        value.length === 0 || valid
          ? ""
          : "Digite uma matrícula com 7 números ou um e-mail válido."
      );
    };

    loginIdentifier.addEventListener("input", () => updateLoginIdentifier(false));
    loginIdentifier.addEventListener("blur", () => updateLoginIdentifier(true));
  }

  document.querySelectorAll(".password-toggle").forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const input = document.getElementById(toggle.getAttribute("aria-controls"));
      const showing = input.type === "text";

      input.type = showing ? "password" : "text";
      toggle.setAttribute("aria-label", showing ? "Mostrar senha" : "Ocultar senha");
      toggle.setAttribute("aria-pressed", String(!showing));
      toggle.classList.toggle("is-visible", !showing);
    });
  });

  const passwordRequirements = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
  const passwordHelp = (input) => {
    const helpId = input.getAttribute("aria-describedby");
    return helpId ? document.getElementById(helpId) : null;
  };

  const updatePasswordMessage = (input, showMessage) => {
    const help = passwordHelp(input);
    if (!help) {
      return;
    }

    const invalid = input.value.length > 0 && !passwordRequirements.test(input.value);
    help.classList.toggle("is-visible", showMessage && invalid);
    input.classList.toggle("password-invalid", showMessage && invalid);
    input.classList.toggle("password-valid", showMessage && !invalid && input.value.length > 0);
  };

  const loginPassword = document.querySelector("#senha-login");
  const loginForm = document.querySelector("#login-form");
  const loginDevelopmentModal = document.querySelector("#login-development-modal");
  if (loginPassword) {
    loginPassword.addEventListener("input", () => updatePasswordMessage(loginPassword, false));
    loginPassword.addEventListener("blur", () => {
      if (loginPassword.value.length > 0) {
        loginPassword.classList.remove("password-invalid");
      }
    });
  }

  if (loginForm && loginDevelopmentModal) {
    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();

      if (!loginForm.checkValidity()) {
        loginForm.reportValidity();
        return;
      }

      if (!window.bootstrap) {
        throw new Error("Modal de login indisponível.");
      }

      bootstrap.Modal.getOrCreateInstance(loginDevelopmentModal).show();
    });
  }

  const tabs = Array.from(document.querySelectorAll(".access-tab"));
  const panels = Array.from(document.querySelectorAll(".access-panel"));

  const activateTab = (id) => {
    tabs.forEach((tab) => {
      const active = tab.getAttribute("aria-controls") === id;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });

    panels.forEach((panel) => {
      panel.hidden = panel.id !== id;
    });
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => activateTab(tab.getAttribute("aria-controls")));
  });

  const registrationForm = document.querySelector("#registro form");
  const registrationEmail = document.querySelector("#email-registro");
  const registrationPassword = document.querySelector("#senha-registro");
  const passwordConfirmation = document.querySelector("#senha-confirmacao-registro");
  const developmentModal = document.querySelector("#registration-development-modal");

  if (registrationForm && registrationEmail && registrationPassword && passwordConfirmation) {
    const updateEmailState = (showMessage) => {
      const hasValue = registrationEmail.value.length > 0;
      const help = passwordHelp(registrationEmail);

      registrationEmail.setCustomValidity("");
      const invalid = hasValue && !registrationEmail.validity.valid;
      if (help) {
        help.classList.toggle("is-visible", showMessage && invalid);
      }
      registrationEmail.classList.toggle("password-invalid", showMessage && invalid);
      registrationEmail.classList.toggle("password-valid", showMessage && hasValue && !invalid);
      registrationEmail.setCustomValidity(
        invalid ? "Digite um e-mail válido, como usuario@exemplo.com." : ""
      );
    };

    const updatePasswordState = (showMessage) => {
      const valid = passwordRequirements.test(registrationPassword.value);
      const hasValue = registrationPassword.value.length > 0;
      updatePasswordMessage(registrationPassword, showMessage);
      registrationPassword.setCustomValidity(
        valid || !hasValue
          ? ""
          : "A senha deve ter no mínimo 8 caracteres, com letra maiúscula, minúscula, número e caractere especial."
      );
      return valid;
    };

    const validatePasswordConfirmation = (showMessage) => {
      const passwordValid = updatePasswordState(showMessage);
      const hasConfirmation = passwordConfirmation.value.length > 0;
      const confirmationMatches =
        hasConfirmation && passwordConfirmation.value === registrationPassword.value;

        const confirmationHelp = passwordHelp(passwordConfirmation);
        if (confirmationHelp) {
          confirmationHelp.classList.toggle(
            "is-visible",
            showMessage && hasConfirmation && !confirmationMatches
          );
        }
      passwordConfirmation.classList.toggle(
        "password-invalid",
        showMessage && hasConfirmation && !confirmationMatches
      );
      passwordConfirmation.classList.toggle(
        "password-valid",
        showMessage && confirmationMatches && passwordValid
      );
      passwordConfirmation.setCustomValidity(
        !hasConfirmation || confirmationMatches
          ? ""
          : "As senhas precisam ser iguais."
      );
    };

    registrationPassword.addEventListener("input", () => validatePasswordConfirmation(false));
    passwordConfirmation.addEventListener("input", () => validatePasswordConfirmation(false));
    registrationPassword.addEventListener("blur", () => validatePasswordConfirmation(true));
    passwordConfirmation.addEventListener("blur", () => validatePasswordConfirmation(true));
    registrationEmail.addEventListener("input", () => updateEmailState(false));
    registrationEmail.addEventListener("blur", () => updateEmailState(true));

    registrationForm.addEventListener("submit", (event) => {
      event.preventDefault();
      updateEmailState(true);
      validatePasswordConfirmation(true);

      if (!registrationForm.checkValidity()) {
        registrationForm.reportValidity();
        return;
      }

      if (!window.bootstrap || !developmentModal) {
        throw new Error("Modal de cadastro indisponível.");
      }

      bootstrap.Modal.getOrCreateInstance(developmentModal).show();
    });
  }

  const activateFromHash = () => {
    activateTab(window.location.hash === "#registro" ? "registro" : "login");
  };

  window.addEventListener("hashchange", activateFromHash);
  activateFromHash();
})();
