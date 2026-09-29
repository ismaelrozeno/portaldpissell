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
  const profileForm = document.querySelector("#profile-form");
  profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const saveButton = profileForm.querySelector('button[type="submit"]');
    if (saveButton?.classList.contains("is-loading")) return;
    const stopLoading = window.portalButtonLoading(saveButton, "Salvando…");
    let updated;
    try {
      updated = await window.portalAuthDemo.updateProfile({ name: name.value.trim() });
    } catch (error) {
      console.error("Não foi possível salvar o perfil.", error);
      showMessage("Não foi possível salvar o perfil. Tente novamente.");
      return;
    } finally {
      stopLoading();
    }
    // Sem avatar escolhido, as iniciais acompanham o novo nome.
    renderAvatar(updated || { ...session, name: name.value.trim(), avatar: chosen });
    window.portalRenderHeaderAvatar?.(updated || { ...session, name: name.value.trim(), avatar: chosen });
    if (!picker.hidden) renderGrid();
    showMessage("Perfil atualizado.");
  });
  // Avatar: escolhido numa grade de imagens prontas (não há envio de foto própria).
  const avatars = window.portalAvatars;
  const toggle = document.querySelector("#profile-avatar-toggle");
  const picker = document.querySelector("#avatar-picker");
  const grid = document.querySelector("#avatar-grid");
  let chosen = session.avatar || "";
  function renderAvatar(profile) {
    avatars.render(avatar, profile, "Avatar do perfil");
  }
  function renderGrid() {
    // Primeira opção: as iniciais do nome (o padrão de toda conta). O id vazio significa "sem avatar".
    const currentName = name.value.trim() || session.name;
    const initialsOption = `
      <button type="button" class="avatar-option avatar-option-initials${!chosen ? " is-selected" : ""}" role="radio" aria-checked="${!chosen}" data-avatar="" title="Iniciais do nome">
        <span style="background:${avatars.color(currentName)}">${avatars.initials(currentName)}</span>
      </button>`;
    grid.innerHTML = initialsOption + avatars.list.map((item) => `
      <button type="button" class="avatar-option${item.id === chosen ? " is-selected" : ""}" role="radio" aria-checked="${item.id === chosen}" data-avatar="${item.id}" title="${item.label}">
        <img src="${avatars.url(item.id)}" alt="${item.label}" loading="lazy">
      </button>`).join("");
  }
  function setPickerOpen(open) {
    picker.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    if (open) renderGrid();
  }
  toggle.addEventListener("click", () => setPickerOpen(picker.hidden));
  // Clicar fora da grade (ou apertar Esc) fecha a escolha.
  document.addEventListener("click", (event) => {
    // composedPath: a grade é redesenhada no clique, então o alvo já pode ter saído da página.
    const path = event.composedPath();
    if (!picker.hidden && !path.includes(picker) && !path.includes(toggle)) setPickerOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !picker.hidden) setPickerOpen(false);
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
      if (changePassword.classList.contains("is-loading")) return;
      const stopLoading = window.portalButtonLoading(changePassword, "Enviando e-mail…");
      try {
        await window.portalFirebaseAuth.sendPasswordResetEmail(session.email);
        showMessage(`Enviamos um link de redefinição de senha para ${session.email}.`);
      } catch (error) {
        console.error("Não foi possível enviar o e-mail de redefinição de senha.", error);
        showMessage("Não foi possível enviar o e-mail de redefinição de senha. Tente novamente mais tarde.");
      } finally {
        stopLoading();
      }
    });
  }
  document.querySelector("#logout").addEventListener("click", () => {
    window.portalOpenLogoutModal();
  });
})();
