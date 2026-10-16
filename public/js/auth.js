/* TaskBoard — перевод входа и регистрации; язык сохраняется между страницами. */
const authTranslations = {
  ru: {
    pageTitle: "Вход — TaskBoard", titleLogin: "Вход в TaskBoard", titleRegister: "Создание аккаунта TaskBoard",
    descLogin: "Войдите в свой аккаунт, чтобы продолжить.", descRegister: "Создайте аккаунт, чтобы начать пользоваться TaskBoard.",
    email: "Электронная почта", password: "Пароль", passwordMin: "Пароль (минимум 8 символов)", username: "Имя пользователя",
    login: "Войти", register: "Создать аккаунт", noAccount: "Нет аккаунта?", haveAccount: "Уже есть аккаунт?",
    switchToRegister: "Зарегистрироваться", switchToLogin: "Войти", loginError: "Не удалось войти. Проверьте почту и пароль.",
    registerError: "Не удалось зарегистрировать аккаунт.", networkError: "Не удалось связаться с сервером. Попробуйте ещё раз.",
    required: "Заполните все обязательные поля.", language: "Язык интерфейса", wait: "Подождите..."
  },
  en: {
    pageTitle: "Sign in — TaskBoard", titleLogin: "Sign in to TaskBoard", titleRegister: "Create a TaskBoard account",
    descLogin: "Sign in to your account to continue.", descRegister: "Create an account to start using TaskBoard.",
    email: "Email address", password: "Password", passwordMin: "Password (at least 8 characters)", username: "Username",
    login: "Sign in", register: "Create account", noAccount: "Don't have an account?", haveAccount: "Already have an account?",
    switchToRegister: "Create an account", switchToLogin: "Sign in", loginError: "Sign-in failed. Check your email and password.",
    registerError: "Could not create the account.", networkError: "Could not connect to the server. Please try again.",
    required: "Complete all required fields.", language: "Interface language", wait: "Please wait..."
  }
};
const byId = id => document.getElementById(id);
const loginForm = byId("loginForm");
const registerForm = byId("registerForm");
const authTitle = byId("authTitle");
const authDescription = byId("authDescription");
const authMessage = byId("authMessage");
const switchText = byId("switchText");
const switchButton = byId("switchButton");
const authLanguageSelect = byId("authLanguage");
let authLanguage = localStorage.getItem("taskboardLanguage") === "en" ? "en" : "ru";
let registerMode = false;
const tr = key => authTranslations[authLanguage]?.[key] ?? authTranslations.ru[key] ?? key;

function applyAuthTranslations() {
  document.documentElement.lang = authLanguage;
  document.title = registerMode ? tr("titleRegister") : tr("pageTitle");
  if (authTitle) authTitle.textContent = registerMode ? tr("titleRegister") : tr("titleLogin");
  if (authDescription) authDescription.textContent = registerMode ? tr("descRegister") : tr("descLogin");
  const text = (id, key) => { const element = byId(id); if (element) element.textContent = tr(key); };
  text("loginEmailLabel", "email");
  text("registerEmailLabel", "email");
  text("loginPasswordLabel", "password");
  text("registerPasswordLabel", "passwordMin");
  text("registerUsernameLabel", "username");
  text("loginSubmit", "login");
  text("registerSubmit", "register");
  text("authLanguageLabel", "language");
  if (switchText) switchText.textContent = tr(registerMode ? "haveAccount" : "noAccount");
  if (switchButton) switchButton.textContent = tr(registerMode ? "switchToLogin" : "switchToRegister");
  if (authLanguageSelect) authLanguageSelect.value = authLanguage;
  if (loginForm) loginForm.setAttribute("aria-label", authLanguage === "ru" ? "Вход в аккаунт" : "Sign-in form");
  if (registerForm) registerForm.setAttribute("aria-label", authLanguage === "ru" ? "Регистрация нового аккаунта" : "New account registration");
}
function setAuthMessage(message, type = "error") {
  if (!authMessage) return;
  authMessage.textContent = message || "";
  authMessage.className = `auth-message${message ? ` ${type}` : ""}`;
}
function setMode(register) {
  registerMode = register;
  if (loginForm) loginForm.hidden = register;
  if (registerForm) registerForm.hidden = !register;
  setAuthMessage("");
  applyAuthTranslations();
}
authLanguageSelect?.addEventListener("change", () => {
  authLanguage = authLanguageSelect.value === "en" ? "en" : "ru";
  localStorage.setItem("taskboardLanguage", authLanguage);
  applyAuthTranslations();
});
switchButton?.addEventListener("click", () => setMode(!registerMode));

async function sendAuth(event, mode) {
  event.preventDefault();
  const form = mode === "login" ? loginForm : registerForm;
  const button = form?.querySelector('button[type="submit"]');
  if (!form) return;
  const payload = Object.fromEntries(new FormData(form).entries());
  setAuthMessage("");
  if (Object.values(payload).some(value => typeof value !== "string" || !value.trim())) {
    setAuthMessage(tr("required"));
    return;
  }
  if (button) { button.disabled = true; button.dataset.originalText = button.textContent; button.textContent = tr("wait"); }
  try {
    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(payload)
    });
    let result = {};
    try { result = await response.json(); } catch (_) {}
    if (!response.ok || result.success === false) {
      setAuthMessage(result.message || tr(mode === "login" ? "loginError" : "registerError"));
      return;
    }
    window.location.href = "/";
  } catch (error) {
    console.error("Authentication request failed:", error);
    setAuthMessage(tr("networkError"));
  } finally {
    if (button) { button.disabled = false; button.textContent = button.dataset.originalText || tr(mode === "login" ? "login" : "register"); }
  }
}
loginForm?.addEventListener("submit", event => sendAuth(event, "login"));
registerForm?.addEventListener("submit", event => sendAuth(event, "register"));
applyAuthTranslations();
