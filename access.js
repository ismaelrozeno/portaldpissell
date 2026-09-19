(function setupAccessTabs() {
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
  const registrationPassword = document.querySelector("#senha-registro");
  const passwordConfirmation = document.querySelector("#senha-confirmacao-registro");
  const developmentModal = document.querySelector("#registration-development-modal");

  if (registrationForm && registrationPassword && passwordConfirmation) {
    const passwordRequirements = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

    const updatePasswordState = () => {
      const valid = passwordRequirements.test(registrationPassword.value);
      const hasValue = registrationPassword.value.length > 0;
      registrationPassword.classList.toggle("password-invalid", hasValue && !valid);
      registrationPassword.classList.toggle("password-valid", hasValue && valid);
      return valid;
    };

    const validatePasswordConfirmation = () => {
      const passwordValid = updatePasswordState();
      const hasConfirmation = passwordConfirmation.value.length > 0;
      const confirmationValid =
        hasConfirmation && passwordConfirmation.value !== registrationPassword.value;

      passwordConfirmation.classList.toggle("password-invalid", confirmationValid);
      passwordConfirmation.classList.toggle(
        "password-valid",
        hasConfirmation && !confirmationValid && passwordValid
      );
      passwordConfirmation.setCustomValidity(
        !passwordValid
          ? "A senha deve ter no mínimo 8 caracteres, com letra maiúscula, minúscula, número e caractere especial."
          : registrationPassword.value === passwordConfirmation.value
            ? ""
            : "As senhas precisam ser iguais."
      );
    };

    registrationPassword.addEventListener("input", validatePasswordConfirmation);
    passwordConfirmation.addEventListener("input", validatePasswordConfirmation);

    registrationForm.addEventListener("submit", (event) => {
      event.preventDefault();

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
