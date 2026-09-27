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
  // Avatar: escolhido numa grade de imagens prontas (não há envio de foto própria).
  const avatars = window.portalAvatars;
  const toggle = document.querySelector("#profile-avatar-toggle");
  const picker = document.querySelector("#avatar-picker");
  const grid = document.querySelector("#avatar-grid");
  let chosen = session.avatar || "";
  function renderAvatar(profile) {
    const src = avatars.url(profile.avatar);
    avatar.classList.toggle("has-image", !!src);
    if (src) avatar.innerHTML = `<img src="${src}" alt="Avatar do perfil">`;
    else avatar.textContent = (String(profile.name || "").trim().charAt(0) || "?").toUpperCase();
  }
  function renderGrid() {
    grid.innerHTML = avatars.list.map((item) => `
      <button type="button" class="avatar-option${item.id === chosen ? " is-selected" : ""}" role="radio" aria-checked="${item.id === chosen}" data-avatar="${item.id}" title="${item.label}">
        <img src="${avatars.url(item.id)}" alt="${item.label}" loading="lazy">
      </button>`).join("");
  }
  toggle.addEventListener("click", () => {
    picker.hidden = !picker.hidden;
    toggle.setAttribute("aria-expanded", String(!picker.hidden));
    if (!picker.hidden) renderGrid();
  });
  grid.addEventListener("click", async (event) => {
    const option = event.target.closest("[data-avatar]");
    if (!option || option.dataset.avatar === chosen) return;
    const previous = chosen;
    chosen = option.dataset.avatar;
    renderGrid();
    try {
      // Apaga a foto antiga enviada antes (era salva inteira no perfil).
      const updated = await window.portalAuthDemo.updateProfile({ avatar: chosen, photo: "" });
      renderAvatar(updated || { ...session, avatar: chosen });
      window.portalRenderHeaderAvatar?.(updated || { ...session, avatar: chosen });
      showMessage("Avatar atualizado.");
    } catch (error) {
      console.error("Não foi possível salvar o avatar.", error);
      chosen = previous;
      renderGrid();
      showMessage("Não foi possível salvar o avatar. Tente novamente.");
    }
  });
  renderAvatar(session);
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
