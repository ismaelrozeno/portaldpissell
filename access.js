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

  if (loginForm && loginIdentifier && loginPassword) {
    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();

      if (!loginForm.checkValidity()) {
        loginForm.reportValidity();
        return;
      }

      const loginError = document.querySelector("#login-error");
      window.portalAuthDemo.login(loginIdentifier.value, loginPassword.value).then((success) => {
        if (!success) {
          loginError.textContent = "Identificador ou senha inválidos.";
          loginError.classList.add("is-visible");
          return;
        }
        window.location.href = window.portalAuthDemo.getSession()?.roleValue === "administrador-analista"
          ? "Administrador-Portal.html"
          : "Portal.html";
      }).catch((error) => {
        console.error("Falha no login demonstrativo.", error);
        loginError.textContent = "Não foi possível concluir o acesso.";
        loginError.classList.add("is-visible");
      });
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
  const registrationName = document.querySelector("#nome-registro");
  const registrationRole = document.querySelector("#funcao-registro");
  const foremanSpecialtyGroup = document.querySelector("#encarregado-especialidade-group");
  const foremanSpecialty = document.querySelector("#encarregado-especialidade");
  const registrationEnrollment = document.querySelector("#matricula-registro");
  const enrollmentGroup = document.querySelector("#matricula-registro-group");
  const registrationEmail = document.querySelector("#email-registro");
  const registrationPassword = document.querySelector("#senha-registro");
  const passwordConfirmation = document.querySelector("#senha-confirmacao-registro");
  const developmentModal = document.querySelector("#registration-development-modal");
  const normalizeIdentity = window.portalAuthDemo?.normalizeIdentity || ((value) => value.trim().toUpperCase());
  const normalizeIdentityWhileTyping = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/^\s+/, "");

  if (registrationForm && registrationName && registrationRole && foremanSpecialtyGroup && foremanSpecialty && registrationEnrollment && enrollmentGroup && registrationEmail && registrationPassword && passwordConfirmation) {
    const updateEnrollmentVisibility = () => {
      const isGatekeeper = registrationRole.value === "porteiro";
      enrollmentGroup.hidden = isGatekeeper;
      registrationEnrollment.required = !isGatekeeper;
      if (isGatekeeper) registrationEnrollment.value = "";
    };
    const updateForemanSpecialtyVisibility = () => {
      const isForeman = registrationRole.value === "encarregado";
      foremanSpecialtyGroup.hidden = !isForeman;
      foremanSpecialty.required = isForeman;
      if (!isForeman) foremanSpecialty.value = "";
    };
    registrationRole.addEventListener("change", updateEnrollmentVisibility);
    registrationRole.addEventListener("change", updateForemanSpecialtyVisibility);
    const clearRegistrationFeedback = () => {
      registrationEnrollment.setCustomValidity("");
      registrationName.setCustomValidity("");
      const message = document.querySelector("#registration-message");
      message.textContent = "";
      message.classList.remove("is-visible");
    };
    registrationName.addEventListener("input", () => {
      registrationName.value = normalizeIdentityWhileTyping(registrationName.value);
      registrationName.setCustomValidity("");
      clearRegistrationFeedback();
    });
    registrationEnrollment.addEventListener("input", clearRegistrationFeedback);
    registrationRole.addEventListener("change", clearRegistrationFeedback);
    updateEnrollmentVisibility();
    updateForemanSpecialtyVisibility();
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

    registrationForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const message = document.querySelector("#registration-message");
      message.textContent = "";
      message.classList.remove("is-visible");
      [registrationName, registrationRole, foremanSpecialty, registrationEnrollment, registrationEmail, registrationPassword, passwordConfirmation]
        .forEach((input) => input.setCustomValidity(""));
      updateEmailState(true);
      validatePasswordConfirmation(true);

      if (!registrationForm.checkValidity()) {
        const invalidField = [registrationName, registrationRole, foremanSpecialty, registrationEnrollment, registrationEmail, registrationPassword, passwordConfirmation]
          .find((input) => !input.validity.valid);
        message.textContent = invalidField?.validationMessage || "Confira os campos obrigatórios antes de continuar.";
        message.classList.add("is-visible");
        registrationForm.reportValidity();
        return;
      }

      const isPorter = registrationRole.value === "porteiro";
      if (!isPorter && !(await window.portalEmployeeStore.isRegistrationAllowed(registrationEnrollment.value))) {
        message.textContent = "Essa matrícula não está liberada para cadastro. Confira com o Administrador Analista.";
        message.classList.add("is-visible");
        registrationEnrollment.setCustomValidity("Matrícula não liberada para cadastro.");
        registrationEnrollment.focus();
        return;
      }
      if (!isPorter && !(await window.portalAuthDemo.isRegistrationAllowedForRole(registrationEnrollment.value, registrationRole.value))) {
        message.textContent = "Esta matrícula não está autorizada para o perfil selecionado. No Administrador, confira se a matrícula foi liberada para a mesma função.";
        message.classList.add("is-visible");
        registrationEnrollment.setCustomValidity("Matrícula não autorizada para este perfil.");
        registrationEnrollment.focus();
        return;
      }
      if (!isPorter && !(await window.portalAuthDemo.isRegistrationIdentityAllowed(
        registrationEnrollment.value,
        registrationName.value,
        registrationRole.value
      ))) {
        message.textContent = "O nome completo não corresponde à matrícula autorizada. Confira os dados com o Administrador Analista.";
        registrationName.setCustomValidity("Nome não corresponde à matrícula autorizada.");
        registrationName.focus();
        return;
      }
      registrationName.setCustomValidity("");

      const submitButton = registrationForm.querySelector('button[type="submit"]');
      if (submitButton) submitButton.disabled = true;
      try {
        const registrationResult = await window.portalAuthDemo.register({
          name: normalizeIdentity(registrationName.value),
          email: registrationEmail.value.trim(),
          role: registrationRole.options[registrationRole.selectedIndex].textContent,
          roleValue: registrationRole.value,
          especialidade: foremanSpecialty.value,
          matricula: registrationEnrollment.value
        }, registrationPassword.value);
        if (registrationResult === "pending-dp") {
          message.textContent = "Cadastro enviado para aprovação do Departamento Pessoal.";
          message.classList.add("is-visible");
          registrationForm.reset();
          updateEnrollmentVisibility();
          updateForemanSpecialtyVisibility();
          return;
        }
        window.location.href = "Portal.html";
      } catch (error) {
        message.textContent = error?.code === "auth/email-already-in-use"
          ? "Já existe um cadastro com este e-mail."
          : "Não foi possível concluir o cadastro. Tente novamente.";
        message.classList.add("is-visible");
        console.error("Falha no cadastro.", error);
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });
  }

  const activateFromHash = () => {
    activateTab(window.location.hash === "#registro" ? "registro" : "login");
  };

  window.addEventListener("hashchange", activateFromHash);
  activateFromHash();
})();
