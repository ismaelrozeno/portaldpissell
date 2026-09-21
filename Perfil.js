(async () => {
  await window.portalAuthDemo.ready();
  const session = window.portalAuthDemo.getSession();
  if (!session) {
    window.location.href = "Acesso.html#login";
    return;
  }
  const name = document.querySelector("#profile-name");
  const email = document.querySelector("#profile-email");
  const role = document.querySelector("#profile-role");
  const avatar = document.querySelector("#profile-avatar");
  const message = document.querySelector("#profile-message");
  name.value = session.name || "";
  email.value = session.email || "";
  role.value = session.role || "";
  const isFixedAdministrator = session.roleValue === "administrador-analista"
    || session.role === "Administrador Analista";
  if (isFixedAdministrator) {
    email.readOnly = true;
    email.disabled = true;
  }
  function showMessage(text) { message.textContent = text; message.hidden = false; }
  document.querySelector("#profile-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    await window.portalAuthDemo.updateProfile({ name: name.value.trim() });
    showMessage("Perfil atualizado.");
  });
  document.querySelector("#profile-photo").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", async () => {
      avatar.innerHTML = `<img src="${reader.result}" alt="Foto do perfil">`;
      await window.portalAuthDemo.updateProfile({ photo: reader.result });
      showMessage("Foto atualizada.");
    });
    reader.readAsDataURL(file);
  });
  if (session.photo) avatar.innerHTML = `<img src="${session.photo}" alt="Foto do perfil">`;
  const changePassword = document.querySelector("#change-password");
  if (isFixedAdministrator) {
    changePassword.hidden = true;
  } else {
    changePassword.addEventListener("click", async () => {
      try {
        await window.portalFirebaseAuth.sendPasswordResetEmail(session.email);
        showMessage(`Enviamos um link de redefinição de senha para ${session.email}.`);
      } catch (error) {
        console.error("Não foi possível enviar o e-mail de redefinição de senha.", error);
        showMessage("Não foi possível enviar o e-mail de redefinição de senha. Tente novamente mais tarde.");
      }
    });
  }
  document.querySelector("#logout").addEventListener("click", () => {
    window.portalOpenLogoutModal();
  });
})();
