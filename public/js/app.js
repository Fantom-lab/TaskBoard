/*
 * TaskBoard — клиентская логика приложения.
 *
 * Разделы:
 * 1. Элементы страницы и состояние приложения.
 * 2. Переводы интерфейса.
 * 3. Модальные окна.
 * 4. Карточки и счётчики задач.
 * 5. Работа с API.
 * 6. Настройки пользователя.
 */

// =========================================================
// 1. Элементы страницы
// =========================================================

const addButton = document.querySelector("#addTaskButton, #addButton");
const modal = document.querySelector("#taskModal");
const closeButton = document.querySelector("#closeModal");
const cancelButton = document.querySelector("#cancelModal");
const taskForm = document.querySelector("#taskForm");
const modalTitle = document.querySelector("#modalTitle");
const submitButton = taskForm?.querySelector('button[type="submit"]');

const titleInput = document.querySelector("#taskTitle");
const descriptionInput = document.querySelector("#taskDescription");
const priorityInput = document.querySelector("#taskPriority");
const columnInput = document.querySelector("#taskColumn");
const deadlineInput = document.querySelector("#taskDeadline");

// Колонки доски.
const columns = Array.from(document.querySelectorAll(".column"));

// Контейнеры карточек из обновлённого index.html.
const taskContainers = [
    document.querySelector("#todoTasks"),
    document.querySelector("#progressTasks"),
    document.querySelector("#doneTasks")
];

// Счётчики задач.
const counterElements = [
    document.querySelector("#todoCounter"),
    document.querySelector("#progressCounter"),
    document.querySelector("#doneCounter")
];

// Окно подтверждения удаления.
const deleteModal = document.querySelector("#deleteModal");
const closeDeleteModalButton =
    document.querySelector("#closeDeleteModal");
const cancelDeleteButton =
    document.querySelector("#cancelDelete");
const confirmDeleteButton =
    document.querySelector("#confirmDelete");

// Кнопки настроек.
const themeToggle = document.querySelector("#themeToggle");
const languageSelect = document.querySelector("#languageSelect");
const profileButton = document.querySelector("#profileButton");
const logoutButton = document.querySelector("#logoutButton");

// Состояние текущих операций.
let editingTask = null;
let taskToDelete = null;
let currentTheme = "dark";
let currentLanguage = "ru";

// Соответствие колонок статусам в PostgreSQL.
const statusByColumn = ["todo", "in_progress", "done"];

const columnByStatus = {
    todo: 0,
    in_progress: 1,
    done: 2
};

// Названия приоритетов.
const priorityNames = {
    ru: {
        low: "Низкий",
        medium: "Средний",
        high: "Высокий приоритет"
    },
    en: {
        low: "Low",
        medium: "Medium",
        high: "High priority"
    }
};

// =========================================================
// 2. Переводы интерфейса
// =========================================================

const translations = {
    ru: {
        pageTitle: "TaskBoard — Планировщик задач",
        subtitle: "Твои задачи — под контролем",
        lightTheme: "☀️ Светлая тема",
        darkTheme: "🌙 Тёмная тема",
        profile: "Мой профиль",
        logout: "Выйти",
        addTask: "+ Добавить задачу",
        todo: "К выполнению",
        progress: "В процессе",
        done: "Выполнено",
        newTask: "Новая задача",
        editTask: "Редактирование задачи",
        createTask: "Создать задачу",
        saveChanges: "Сохранить изменения",
        titleLabel: "Название задачи",
        titlePlaceholder: "Например, подготовить проект",
        descriptionLabel: "Описание",
        descriptionPlaceholder: "Что необходимо сделать?",
        priorityLabel: "Приоритет",
        low: "Низкий",
        medium: "Средний",
        high: "Высокий",
        statusLabel: "Статус задачи",
        deadlineLabel: "Срок выполнения",
        cancel: "Отмена",
        deleteTitle: "Удаление задачи",
        deleteQuestion:
            "Ты действительно хочешь удалить эту задачу? Это действие нельзя отменить.",
        delete: "Удалить",
        noDeadline: "Без срока",
        edit: "Изменить",
        invalidColumn: "Выбрана некорректная колонка.",
        invalidDeadline: "Срок выполнения должен быть сегодня или позже.",
        taskIdMissing:
            "У задачи отсутствует ID в базе данных. Обнови страницу и попробуй снова.",
        loadTasksError:
            "Не удалось загрузить задачи из базы данных.",
        saveTaskError: "Не удалось сохранить задачу.",
        deleteTaskError: "Не удалось удалить задачу.",
        saveSettingsError:
            "Не удалось сохранить настройки. Попробуй ещё раз.",
        loadSettingsError:
            "Не удалось загрузить настройки пользователя.",
        profileTitle: "Мой профиль",
		profileUsername: "Имя пользователя",
		profileEmail: "Электронная почта",
		profileTheme: "Тема оформления",
		profileLanguage: "Язык интерфейса",
		profileLight: "Светлая",
		profileDark: "Тёмная",
		profileClose: "Закрыть",
        usernameNewLabel: "Новое имя пользователя",
        usernameSave: "Сохранить имя",
        usernameSaved: "Имя пользователя изменено.",
        usernameChangeError: "Не удалось изменить имя.",
        passwordTitle: "Изменить пароль",
        currentPassword: "Текущий пароль",
        newPassword: "Новый пароль",
        passwordHint: "Не менее 8 символов.",
        passwordSave: "Изменить пароль",
        passwordSaved: "Пароль успешно изменён.",
        passwordChangeError: "Не удалось изменить пароль.",
        avatarChooseFile: "Выбрать файл",
        avatarNoFile: "Файл не выбран",
        avatarRemove: "Удалить фотографию",
        avatarDeleteTitle: "Удалить фотографию?",
        avatarDeleteText: "Вместо фотографии будет отображаться стандартный аватар.",
        avatarInvalidType: "Выбери изображение JPG, PNG или WEBP.",
        avatarTooLarge: "Размер фотографии не должен превышать 2 МБ.",
        avatarSaved: "Фотография сохранена.",
        avatarDeleted: "Фотография удалена.",
        avatarUploadError: "Не удалось сохранить фотографию.",
        avatarDeleteError: "Не удалось удалить фотографию.",
        avatarConfirmDelete: "Удалить",
        avatarCancel: "Отмена",
        genericError: "Произошла ошибка.",
        themeLabel: "Тема оформления",
        languageLabel: "Язык интерфейса",
        openProfile: "Открыть профиль",
        avatarAlt: "Аватар пользователя",
        taskBoardLabel: "Доска задач",
        taskFormLabel: "Форма задачи",
        deleteDialogLabel: "Подтверждение удаления задачи",
        profileDialogLabel: "Мой профиль",
        avatarDeleteDialogLabel: "Подтверждение удаления фотографии",
        profileLoading: "Загрузка...",
        usernameInvalid: "Имя должно содержать от 2 до 50 символов.",
        passwordBytesInvalid: "Новый пароль должен содержать от 8 до 72 байт в UTF-8.",
        passwordSame: "Новый пароль должен отличаться от текущего.",
        logoutError: "Не удалось выйти из аккаунта.",
        avatarDeletedMessage: "Фотография удалена.",
        fileInputLabel: "Выбрать файл",
        passwordMin: "Пароль (минимум 8 символов)",
        authEmail: "Электронная почта",
        authPassword: "Пароль",
        authUsername: "Имя пользователя",
        authLogin: "Войти",
        authRegister: "Создать аккаунт",
        authCancel: "Отмена",
        },

    en: {
        pageTitle: "TaskBoard — Task Planner",
        subtitle: "Keep your tasks under control",
        lightTheme: "☀️ Light theme",
        darkTheme: "🌙 Dark theme",
        profile: "My profile",
        logout: "Log out",
        addTask: "+ Add task",
        todo: "To do",
        progress: "In progress",
        done: "Completed",
        newTask: "New task",
        editTask: "Edit task",
        createTask: "Create task",
        saveChanges: "Save changes",
        titleLabel: "Task title",
        titlePlaceholder: "For example, prepare a project",
        descriptionLabel: "Description",
        descriptionPlaceholder: "What needs to be done?",
        priorityLabel: "Priority",
        low: "Low",
        medium: "Medium",
        high: "High",
        statusLabel: "Task status",
        deadlineLabel: "Due date",
        cancel: "Cancel",
        deleteTitle: "Delete task",
        deleteQuestion:
            "Are you sure you want to delete this task? This action cannot be undone.",
        delete: "Delete",
        noDeadline: "No due date",
        edit: "Edit",
        invalidColumn: "The selected column is invalid.",
        invalidDeadline: "The due date must be today or later.",
        taskIdMissing:
            "This task has no database ID. Refresh the page and try again.",
        loadTasksError: "Could not load tasks from the database.",
        saveTaskError: "Could not save the task.",
        deleteTaskError: "Could not delete the task.",
        saveSettingsError: "Could not save settings. Please try again.",
        loadSettingsError: "Could not load user settings.",
        profileTitle: "My profile",
		profileUsername: "Username",
		profileEmail: "Email address",
		profileTheme: "Appearance",
		profileLanguage: "Interface language",
		profileLight: "Light",
		profileDark: "Dark",
		profileClose: "Close",
        usernameNewLabel: "New username",
        usernameSave: "Save username",
        usernameSaved: "Username updated.",
        usernameChangeError: "Could not update username.",
        passwordTitle: "Change password",
        currentPassword: "Current password",
        newPassword: "New password",
        passwordHint: "At least 8 characters.",
        passwordSave: "Change password",
        passwordSaved: "Password changed successfully.",
        passwordChangeError: "Could not change password.",
        avatarChooseFile: "Choose file",
        avatarNoFile: "No file selected",
        avatarRemove: "Remove photo",
        avatarDeleteTitle: "Delete photo?",
        avatarDeleteText: "Your default avatar will be shown instead.",
        avatarInvalidType: "Choose a JPG, PNG, or WEBP image.",
        avatarTooLarge: "The photo must not exceed 2 MB.",
        avatarSaved: "Photo saved.",
        avatarDeleted: "Photo deleted.",
        avatarUploadError: "Could not save the photo.",
        avatarDeleteError: "Could not delete the photo.",
        avatarConfirmDelete: "Delete",
        avatarCancel: "Cancel",
        genericError: "Something went wrong.",
        themeLabel: "Appearance",
        languageLabel: "Interface language",
        openProfile: "Open profile",
        avatarAlt: "User avatar",
        taskBoardLabel: "Task board",
        taskFormLabel: "Task form",
        deleteDialogLabel: "Confirm task deletion",
        profileDialogLabel: "My profile",
        avatarDeleteDialogLabel: "Confirm photo deletion",
        profileLoading: "Loading...",
        usernameInvalid: "Username must contain 2–50 characters.",
        passwordBytesInvalid: "The new password must be 8–72 bytes in UTF-8.",
        passwordSame: "The new password must differ from the current password.",
        logoutError: "Could not log out.",
        avatarDeletedMessage: "Photo deleted.",
        fileInputLabel: "Choose file",
        passwordMin: "Password (at least 8 characters)",
        authEmail: "Email address",
        authPassword: "Password",
        authUsername: "Username",
        authLogin: "Sign in",
        authRegister: "Create account",
        authCancel: "Cancel",
        }
};

// Возвращает текст на текущем языке.
function t(key) {
    return translations[currentLanguage]?.[key]
        ?? translations.ru[key]
        ?? key;
}

// Собственные уведомления вместо стандартных окон браузера.
let notificationTimer = null;
function showNotification(message, type = "error") {
    let box = document.getElementById("appNotification");
    if (!box) {
        box = document.createElement("div");
        box.id = "appNotification";
        box.className = "app-notification";
        box.setAttribute("role", "status");
        box.setAttribute("aria-live", "polite");
        document.body.appendChild(box);
    }
    box.textContent = String(message || t("genericError"));
    box.className = `app-notification ${type}`;
    box.classList.add("visible");
    if (notificationTimer) clearTimeout(notificationTimer);
    notificationTimer = setTimeout(() => box.classList.remove("visible"), 4500);
}

// =========================================================
// 3. Применение переводов
// =========================================================

function applyTranslations() {
    document.documentElement.lang = currentLanguage;
    document.title = t("pageTitle");

    const textById = {
        siteSubtitle: "subtitle",
        profileButton: "profile",
        logoutButton: "logout",
        addButton: "addTask",
        profileThemeLabel: "profileTheme",
        profileLanguageLabel: "profileLanguage",
        profileUsernameLabel: "profileUsername",
        profileEmailLabel: "profileEmail",
        profileModalTitle: "profileTitle",
        changePasswordTitle: "passwordTitle",
        newUsernameLabel: "usernameNewLabel",
        currentPasswordLabel: "currentPassword",
        newPasswordLabel: "newPassword",
        passwordHint: "passwordHint",
        saveUsernameButton: "usernameSave",
        savePasswordButton: "passwordSave",
        closeProfileButton: "profileClose",
        avatarDeleteTitle: "avatarDeleteTitle",
        todoTitle: "todo",
        progressTitle: "progress",
        doneTitle: "done",
        deleteModalTitle: "deleteTitle"
    };

    Object.entries(textById).forEach(([id, key]) => {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = t(key);
        }
    });

    const profileHeading = document.getElementById("profileModalTitle");
    if (profileHeading) profileHeading.textContent = t("profileTitle");
    const profileCloseTop = document.getElementById("closeProfileModal");
    if (profileCloseTop) profileCloseTop.setAttribute("aria-label", currentLanguage === "ru" ? "Закрыть профиль" : "Close profile");
    if (profileButton) profileButton.title = t("profileTitle");
    const headerAvatarButton = document.getElementById("headerAvatarButton");
    if (headerAvatarButton) {
        headerAvatarButton.setAttribute("aria-label", t("openProfile"));
        headerAvatarButton.title = t("profileTitle");
    }
    const board = document.querySelector("main.board");
    if (board) board.setAttribute("aria-label", t("taskBoardLabel"));
    if (modal) modal.setAttribute("aria-label", t("taskFormLabel"));
    if (deleteModal) deleteModal.setAttribute("aria-label", t("deleteDialogLabel"));
    if (profileModal) profileModal.setAttribute("aria-label", t("profileDialogLabel"));
    if (avatarDeleteModal) avatarDeleteModal.setAttribute("aria-label", t("avatarDeleteDialogLabel"));
    const usernameLabel = document.getElementById("newUsernameLabel");
    if (usernameLabel) usernameLabel.textContent = t("usernameNewLabel");
    const passwordTitleElement = document.getElementById("changePasswordTitle");
    if (passwordTitleElement) passwordTitleElement.textContent = t("passwordTitle");
    const currentPasswordLabelElement = document.getElementById("currentPasswordLabel");
    if (currentPasswordLabelElement) currentPasswordLabelElement.textContent = t("currentPassword");
    const newPasswordLabelElement = document.getElementById("newPasswordLabel");
    if (newPasswordLabelElement) newPasswordLabelElement.textContent = t("newPassword");
    const passwordHintElement = document.getElementById("passwordHint");
    if (passwordHintElement) passwordHintElement.textContent = t("passwordHint");
    const usernameSave = document.getElementById("saveUsernameButton");
    if (usernameSave) usernameSave.textContent = t("usernameSave");
    const passwordSave = document.getElementById("savePasswordButton");
    if (passwordSave) passwordSave.textContent = t("passwordSave");
    const profileCloseBottom = document.getElementById("closeProfileButton");
    if (profileCloseBottom) profileCloseBottom.textContent = t("profileClose");
    const profileThemeValue = document.getElementById("profileTheme");
    if (profileThemeValue && profileModal?.classList.contains("active")) profileThemeValue.textContent = currentTheme === "light" ? t("profileLight") : t("profileDark");
    const profileLanguageValue = document.getElementById("profileLanguage");
    if (profileLanguageValue && profileModal?.classList.contains("active")) profileLanguageValue.textContent = currentLanguage === "en" ? "English" : "Русский";
    const authPasswordLabel = document.getElementById("registerPasswordLabel");
    if (authPasswordLabel) authPasswordLabel.textContent = t("passwordMin");

    // Обновляем подписи полей формы.
    const labelTranslations = {
        taskTitle: "titleLabel",
        taskDescription: "descriptionLabel",
        taskPriority: "priorityLabel",
        taskColumn: "statusLabel",
        taskDeadline: "deadlineLabel"
    };

    Object.entries(labelTranslations).forEach(([id, key]) => {
        const label = document.querySelector(`label[for="${id}"]`);

        if (label) {
            label.textContent = t(key);
        }
    });

    if (titleInput) {
        titleInput.placeholder = t("titlePlaceholder");
    }

    if (descriptionInput) {
        descriptionInput.placeholder = t("descriptionPlaceholder");
    }

    // Переводим варианты выбора приоритета.
    if (priorityInput) {
        priorityInput.options[0].textContent = t("low");
        priorityInput.options[1].textContent = t("medium");
        priorityInput.options[2].textContent = t("high");
    }

    // Переводим варианты статуса задачи.
    if (columnInput) {
        columnInput.options[0].textContent = t("todo");
        columnInput.options[1].textContent = t("progress");
        columnInput.options[2].textContent = t("done");
    }

    // Учитываем, создаём мы задачу или редактируем существующую.
    if (modalTitle) {
        modalTitle.textContent = editingTask
            ? t("editTask")
            : t("newTask");
    }

    if (submitButton) {
        submitButton.textContent = editingTask
            ? t("saveChanges")
            : t("createTask");
    }

    const cancelTaskButton = document.querySelector("#cancelModal");
    const cancelDeletionButton = document.querySelector("#cancelDelete");
    const confirmDeletionButton = document.querySelector("#confirmDelete");
    const deleteMessage = document.querySelector(".delete-message");

    if (cancelTaskButton) cancelTaskButton.textContent = t("cancel");
    if (cancelDeletionButton) cancelDeletionButton.textContent = t("cancel");
    if (confirmDeletionButton) confirmDeletionButton.textContent = t("delete");
    if (deleteMessage) deleteMessage.textContent = t("deleteQuestion");

    // Переводим элементы управления аватаром и окно его удаления.
    const avatarChooseButton = document.querySelector(".avatar-select-button");
    const avatarRemoveButton = document.getElementById("removeAvatarButton");
    const avatarDeleteTitle = document.getElementById("avatarDeleteTitle");
    const avatarDeleteText = document.querySelector("#avatarDeleteModal .delete-message");
    const avatarDeleteCancel = document.getElementById("cancelAvatarDelete");
    const avatarDeleteConfirm = document.getElementById("confirmAvatarDelete");
    const avatarName = document.getElementById("avatarFileName");

    if (avatarChooseButton) avatarChooseButton.textContent = t("avatarChooseFile");
    if (avatarRemoveButton) avatarRemoveButton.textContent = t("avatarRemove");
    if (avatarDeleteTitle) avatarDeleteTitle.textContent = t("avatarDeleteTitle");
    if (avatarDeleteText) avatarDeleteText.textContent = t("avatarDeleteText");
    if (avatarDeleteCancel) avatarDeleteCancel.textContent = t("avatarCancel");
    if (avatarDeleteConfirm) avatarDeleteConfirm.textContent = t("avatarConfirmDelete");
    if (avatarName && (!document.getElementById("avatarInput")?.files?.length)) avatarName.textContent = t("avatarNoFile");

    updateThemeButton();
    refreshTaskText();
}

// Обновляет текст кнопки переключения темы.
function updateThemeButton() {
    if (!themeToggle) return;

    themeToggle.textContent = currentTheme === "light"
        ? t("darkTheme")
        : t("lightTheme");
}

// =========================================================
// 4. Вспомогательные функции
// =========================================================

// Возвращает сегодняшнюю дату в формате YYYY-MM-DD по локальному времени браузера.
function getTodayDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

// Устанавливает минимально допустимую дату в поле срока выполнения.
function updateDeadlineMinimum() {
    if (deadlineInput) {
        deadlineInput.min = getTodayDate();
    }
}

// Проверяет дату перед отправкой формы. Сервер также выполняет эту проверку,
// поэтому изменение значения в браузере не позволяет обойти ограничение.
function isDeadlineAllowed(value) {
    return !value || /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= getTodayDate();
}

// Форматирует дату для отображения в карточке.
function formatDeadline(value) {
    if (!value) return t("noDeadline");

    const parts = String(value).slice(0, 10).split("-");

    if (parts.length !== 3) {
        return String(value);
    }

    return currentLanguage === "ru"
        ? `${parts[2]}.${parts[1]}.${parts[0]}`
        : `${parts[0]}-${parts[1]}-${parts[2]}`;
}

// Переводит подписи уже отображаемых карточек.
function refreshTaskText() {
    document.querySelectorAll(".task").forEach((task) => {
        const data = task.taskData;

        if (!data) return;

        const priority = task.querySelector(".priority");
        const editButton = task.querySelector(".task-edit");
        const deleteButton = task.querySelector(".delete-task");
        const deadline = task.querySelector(".task-deadline");

        if (priority) {
            priority.textContent =
                priorityNames[currentLanguage]?.[data.priority]
                ?? data.priority;
        }

        if (editButton) editButton.textContent = t("edit");
        if (deleteButton) deleteButton.textContent = t("delete");

        if (deadline) {
            deadline.textContent = formatDeadline(data.deadline);
        }
    });
}
// =========================================================
// 5. Модальное окно создания и редактирования
// =========================================================

// Открывает пустую форму для создания новой задачи.
function openModal() {
    if (!modal || !taskForm) return;

    editingTask = null;
    taskForm.reset();
    updateDeadlineMinimum();

    modalTitle.textContent = t("newTask");
    submitButton.textContent = t("createTask");

    modal.classList.add("active");
    titleInput?.focus();
}

// Закрывает форму и сбрасывает её поля.
function closeModal() {
    modal?.classList.remove("active");
    taskForm?.reset();

    editingTask = null;

    if (modalTitle) {
        modalTitle.textContent = t("newTask");
    }

    if (submitButton) {
        submitButton.textContent = t("createTask");
    }
}

// Открывает форму с данными существующей задачи.
function editTask(task) {
    editingTask = task;

    const data = task.taskData;

    titleInput.value = data.title;
    descriptionInput.value = data.description || "";
    priorityInput.value = data.priority;
    updateDeadlineMinimum();
    deadlineInput.value = data.deadline || "";

    // Выбираем колонку по статусу задачи.
    const columnIndex = columnByStatus[data.status] ?? 0;
    columnInput.value = String(columnIndex);

    modalTitle.textContent = t("editTask");
    submitButton.textContent = t("saveChanges");

    modal.classList.add("active");
    titleInput.focus();
}

// =========================================================
// 6. Счётчики задач
// =========================================================

// Показывает количество карточек в выбранной колонке.
function updateCounter(columnIndex) {
    const container = taskContainers[columnIndex];
    const counter = counterElements[columnIndex];

    if (!container || !counter) return;

    counter.textContent =
        container.querySelectorAll(".task").length;
}

// =========================================================
// 7. Создание карточки задачи
// =========================================================

// Создаёт HTML-карточку из данных, полученных от сервера.
// Пользовательский текст вставляется через textContent,
// поэтому он не интерпретируется браузером как HTML.
function createTaskElement(data) {
    const task = document.createElement("article");

    task.className = "task";
    task.dataset.taskId = data.id || "";

    // Название задачи.
    const heading = document.createElement("h3");
    heading.textContent = data.title;

    // Описание задачи.
    const paragraph = document.createElement("p");
    paragraph.textContent = data.description || "";

    // Нижняя часть карточки: приоритет и срок.
    const footer = document.createElement("div");
    footer.className = "task-footer";

    const priorityLabel = document.createElement("span");
    priorityLabel.className = `priority ${data.priority}`;

    priorityLabel.textContent =
        priorityNames[currentLanguage]?.[data.priority]
        ?? data.priority;

    const deadlineLabel = document.createElement("span");
    deadlineLabel.className = "task-deadline";
    deadlineLabel.textContent = formatDeadline(data.deadline);

    footer.append(priorityLabel, deadlineLabel);

    // Контейнер кнопок управления карточкой.
    const actions = document.createElement("div");
    actions.className = "task-actions";

    // Кнопка редактирования.
    const editButton = document.createElement("button");

    editButton.type = "button";
    editButton.className = "task-edit";
    editButton.textContent = t("edit");

    editButton.addEventListener("click", () => {
        editTask(task);
    });

    // Кнопка удаления открывает окно подтверждения.
    const deleteButton = document.createElement("button");

    deleteButton.type = "button";
    deleteButton.className = "delete-task";
    deleteButton.textContent = t("delete");

    deleteButton.addEventListener("click", () => {
        taskToDelete = task;
        deleteModal?.classList.add("active");
    });

    // Собираем карточку из созданных элементов.
    actions.append(editButton, deleteButton);

    task.append(
        heading,
        paragraph,
        footer,
        actions
    );

    // Сохраняем данные карточки для последующего редактирования.
    task.taskData = { ...data };

    return task;
}

// Добавляет карточку в колонку согласно её статусу.
function placeTask(task) {
    const columnIndex = columnByStatus[task.taskData.status];

    if (
        columnIndex === undefined ||
        !taskContainers[columnIndex]
    ) {
        return;
    }

    taskContainers[columnIndex].appendChild(task);

    updateCounter(columnIndex);
}

// =========================================================
// 8. Общая функция запросов к серверу
// =========================================================

// Выполняет запрос к API, читает JSON и проверяет ошибки.
// Все операции с задачами и настройками используют эту функцию.
async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        credentials: "same-origin",
        ...options
    });

    let result;

    try {
        result = await response.json();
    } catch {
        throw new Error(
            "Сервер вернул ответ в неожиданном формате."
        );
    }

    // Если пользователь не авторизован, возвращаем его на вход.
    if (response.status === 401) {
        window.location.href = "/auth.html";

        throw new Error("Требуется войти в аккаунт.");
    }

    // Проверяем HTTP-ошибки и формат ответа API.
    if (!response.ok || result.success === false) {
        throw new Error(
            result.message || "Не удалось выполнить запрос."
        );
    }

    return result;
}
// =========================================================
// 9. Создание и редактирование задач
// =========================================================

// Обрабатывает отправку формы задачи.
taskForm?.addEventListener("submit", async (event) => {
    // Не перезагружаем страницу при отправке формы.
    event.preventDefault();

    const title = titleInput.value.trim();

    // Название обязательно.
    if (!title) {
        titleInput.focus();
        return;
    }

    // Преобразуем выбранную колонку в статус для PostgreSQL.
    const columnIndex = Number(columnInput.value);
    const status = statusByColumn[columnIndex];

    if (!status) {
        showNotification(t("invalidColumn"));
        return;
    }

    // Не разрешаем выбрать прошедший срок выполнения.
    if (!isDeadlineAllowed(deadlineInput?.value || "")) {
        showNotification(t("invalidDeadline"));
        deadlineInput?.focus();
        return;
    }

    // Подготавливаем данные для API.
    const data = {
        title,
        description: descriptionInput.value.trim(),
        priority: priorityInput.value,
        status,
        due_date: deadlineInput.value || null
    };

    const oldButtonText = submitButton.textContent;
    const wasEditing = Boolean(editingTask);

    submitButton.disabled = true;
    submitButton.textContent =
        currentLanguage === "ru" ? "Сохранение..." : "Saving...";

    try {
        if (editingTask) {
            // -------------------------------------------------
            // Обновление существующей задачи
            // -------------------------------------------------

            const taskId = editingTask.dataset.taskId;

            if (!taskId) {
                throw new Error(t("taskIdMissing"));
            }

            const result = await apiRequest(
                `/api/tasks/${taskId}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(data)
                }
            );

            const saved = result.task;

            // Запоминаем исходную колонку до замены карточки.
            const oldColumnIndex =
                columnByStatus[editingTask.taskData.status];

            // Создаём карточку из данных, подтверждённых сервером.
            const updatedTask = createTaskElement({
                id: saved.id,
                title: saved.title,
                description: saved.description || "",
                priority: saved.priority,
                status: saved.status,
                deadline: saved.due_date
                    ? String(saved.due_date).slice(0, 10)
                    : ""
            });

            // Заменяем старую карточку новой.
            editingTask.replaceWith(updatedTask);

            // Перемещаем карточку в колонку её нового статуса.
            placeTask(updatedTask);

            // Пересчитываем исходную колонку.
            if (oldColumnIndex !== undefined) {
                updateCounter(oldColumnIndex);
            }
        } else {
            // -------------------------------------------------
            // Создание новой задачи
            // -------------------------------------------------

            const result = await apiRequest(
                "/api/tasks",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(data)
                }
            );

            const saved = result.task;

            // Используем ID, который вернул сервер.
            const task = createTaskElement({
                id: saved.id,
                title: saved.title,
                description: saved.description || "",
                priority: saved.priority,
                status: saved.status,
                deadline: saved.due_date
                    ? String(saved.due_date).slice(0, 10)
                    : ""
            });

            placeTask(task);
        }

        // Закрываем форму после успешного сохранения.
        closeModal();
    } catch (error) {
        console.error("Ошибка сохранения задачи:", error);

        showNotification(error.message || t("saveTaskError"));
    } finally {
        // Возвращаем кнопку в исходное состояние.
        submitButton.disabled = false;

        submitButton.textContent = wasEditing
            ? t("saveChanges")
            : oldButtonText;
    }
});

// =========================================================
// 10. Удаление задач
// =========================================================

// Закрывает окно подтверждения удаления.
function closeDeleteModal() {
    deleteModal?.classList.remove("active");
    taskToDelete = null;
}

// Удаляем задачу из базы и интерфейса только после ответа сервера.
confirmDeleteButton?.addEventListener("click", async () => {
    if (!taskToDelete) return;

    const taskId = taskToDelete.dataset.taskId;

    if (!taskId) {
        showNotification(t("taskIdMissing"));
        return;
    }

    // Сохраняем номер колонки до удаления карточки.
    const columnIndex =
        columnByStatus[taskToDelete.taskData.status];

    confirmDeleteButton.disabled = true;

    try {
        await apiRequest(
            `/api/tasks/${taskId}`,
            {
                method: "DELETE"
            }
        );

        // Удаляем карточку только после успешного ответа API.
        taskToDelete.remove();

        if (columnIndex !== undefined) {
            updateCounter(columnIndex);
        }

        closeDeleteModal();
    } catch (error) {
        console.error("Ошибка удаления задачи:", error);

        showNotification(error.message || t("deleteTaskError"));
    } finally {
        confirmDeleteButton.disabled = false;
    }
});

// =========================================================
// 11. Загрузка задач
// =========================================================

// Получает список задач текущего пользователя из PostgreSQL.
async function loadTasks() {
    try {
        const result = await apiRequest("/api/tasks");

        if (!Array.isArray(result.tasks)) {
            throw new Error(
                "Сервер вернул некорректный список задач."
            );
        }

        // Убираем старые карточки перед загрузкой актуальных.
        taskContainers.forEach((container, index) => {
            if (container) {
                container.replaceChildren();
            }

            updateCounter(index);
        });

        // Создаём карточки по данным, полученным от сервера.
        result.tasks.forEach((item) => {
            if (!(item.status in columnByStatus)) {
                return;
            }

            const task = createTaskElement({
                id: item.id,
                title: item.title,
                description: item.description || "",
                priority: item.priority,
                status: item.status,
                deadline: item.due_date
                    ? String(item.due_date).slice(0, 10)
                    : ""
            });

            placeTask(task);
        });
    } catch (error) {
        console.error("Ошибка загрузки задач:", error);

        showNotification(error.message || t("loadTasksError"));
    }
}
// =========================================================
// 12. Загрузка настроек пользователя
// =========================================================

// Получаем настройки текущего пользователя с сервера.
// Настройки хранятся в таблице users базы данных PostgreSQL.
async function loadUserSettings() {
    const result = await apiRequest("/api/auth/me");
    const user = result.user || result;

    // Проверяем допустимые значения настроек.
    currentTheme = user.theme === "light" ? "light" : "dark";
    currentLanguage = user.language === "en" ? "en" : "ru";

    // Сохраняем тему и язык для страницы авторизации после выхода.
    localStorage.setItem("taskboardTheme", currentTheme);
    localStorage.setItem("taskboardLanguage", currentLanguage);

    // Применяем тему к странице.
    document.body.classList.toggle(
        "light-theme",
        currentTheme === "light"
    );

    // Устанавливаем выбранный язык.
    if (languageSelect) {
        languageSelect.value = currentLanguage;
    }

    // Переводим интерфейс после получения настроек.
    applyTranslations();
}

// =========================================================
// 13. Сохранение настроек пользователя
// =========================================================

// Отправляем тему и язык на сервер.
// Сервер сохраняет настройки для текущего аккаунта.
async function saveUserSettings(theme, language) {
    return apiRequest("/api/auth/settings", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            theme,
            language
        })
    });
}

// =========================================================
// 14. Переключение темы
// =========================================================

themeToggle?.addEventListener("click", async () => {
    const newTheme =
        currentTheme === "dark" ? "light" : "dark";

    themeToggle.disabled = true;

    try {
        // Сначала сохраняем настройку на сервере.
        await saveUserSettings(newTheme, currentLanguage);

        // Меняем тему только после успешного сохранения.
        currentTheme = newTheme;

        localStorage.setItem("taskboardTheme", currentTheme);

        document.body.classList.toggle(
            "light-theme",
            currentTheme === "light"
        );

        updateThemeButton();
    } catch (error) {
        console.error("Ошибка сохранения темы:", error);

        showNotification(error.message || t("saveSettingsError"));
    } finally {
        themeToggle.disabled = false;
    }
});

// =========================================================
// 15. Переключение языка
// =========================================================

languageSelect?.addEventListener("change", async () => {
    const newLanguage =
        languageSelect.value === "en" ? "en" : "ru";

    languageSelect.disabled = true;

    try {
        // Сохраняем язык вместе с текущей темой.
        await saveUserSettings(currentTheme, newLanguage);

        currentLanguage = newLanguage;
        localStorage.setItem("taskboardLanguage", currentLanguage);

        // Обновляем подписи интерфейса и карточек.
        applyTranslations();
    } catch (error) {
        console.error("Ошибка сохранения языка:", error);

        // При ошибке возвращаем прежнее значение.
        languageSelect.value = currentLanguage;

        showNotification(error.message || t("saveSettingsError"));
    } finally {
        languageSelect.disabled = false;
    }
});

// =========================================================
// 16. Управление модальными окнами
// =========================================================

// Открытие формы создания задачи.
addButton?.addEventListener("click", openModal);

// Закрытие формы задачи.
closeButton?.addEventListener("click", closeModal);
cancelButton?.addEventListener("click", closeModal);

// Закрытие формы нажатием на затемнённую область.
modal?.addEventListener("click", (event) => {
    if (event.target === modal) {
        closeModal();
    }
});

// Закрытие окна удаления.
closeDeleteModalButton?.addEventListener(
    "click",
    closeDeleteModal
);

cancelDeleteButton?.addEventListener(
    "click",
    closeDeleteModal
);

// Закрытие окна удаления нажатием на фон.
deleteModal?.addEventListener("click", (event) => {
    if (event.target === deleteModal) {
        closeDeleteModal();
    }
});

// Клавиша Escape закрывает открытые модальные окна.
document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    if (modal?.classList.contains("active")) {
        closeModal();
    }

    if (deleteModal?.classList.contains("active")) {
        closeDeleteModal();
    }
    if (avatarDeleteModal?.classList.contains("active")) {
        closeAvatarDeleteModal();
    }
});

// =========================================================
// 17. Кнопка профиля
// =========================================================

const profileModal = document.getElementById("profileModal");
const closeProfileModalButton =
    document.getElementById("closeProfileModal");
const closeProfileButton =
    document.getElementById("closeProfileButton");

const profileUsername =
    document.getElementById("profileUsername");
const profileEmail =
    document.getElementById("profileEmail");
const avatarInput = document.getElementById("avatarInput");
const profileAvatarImage = document.getElementById("profileAvatarImage");
const profileAvatarPlaceholder = document.getElementById("profileAvatarPlaceholder");
const removeAvatarButton = document.getElementById("removeAvatarButton");
const avatarFileName = document.getElementById("avatarFileName");
const avatarMessage = document.getElementById("avatarMessage");
const avatarDeleteModal = document.getElementById("avatarDeleteModal");
const cancelAvatarDeleteButton = document.getElementById("cancelAvatarDelete");
const confirmAvatarDeleteButton = document.getElementById("confirmAvatarDelete");

function setAvatarMessage(message = "", type = "") {
    if (!avatarMessage) return;
    avatarMessage.textContent = message;
    avatarMessage.className = `avatar-message${type ? ` ${type}` : ""}`;
}
function closeAvatarDeleteModal() {
    avatarDeleteModal?.classList.remove("active");
    if (avatarDeleteModal) avatarDeleteModal.hidden = true;
}
function openAvatarDeleteModal() {
    if (!avatarDeleteModal) {
        showNotification("Не найдено окно подтверждения удаления аватара.");
        return;
    }
    avatarDeleteModal.hidden = false;
    avatarDeleteModal.classList.add("active");
}

let selectedAvatarFile = null;
let avatarPreviewUrl = null;
const profileTheme =
    document.getElementById("profileTheme");
const profileLanguage =
    document.getElementById("profileLanguage");
const usernameForm = document.getElementById("usernameForm");
const newUsernameInput = document.getElementById("newUsername");
const usernameMessage = document.getElementById("usernameMessage");
const usernameSaveButton = document.getElementById("saveUsernameButton");
const passwordForm = document.getElementById("passwordForm");
const currentPasswordInput = document.getElementById("currentPassword");
const newPasswordInput = document.getElementById("newPassword");
const passwordMessage = document.getElementById("passwordMessage");
const passwordSaveButton = document.getElementById("savePasswordButton");


avatarInput?.addEventListener("change", async () => {
    const file = avatarInput.files?.[0];
    if (!file) {
        if (avatarFileName) avatarFileName.textContent = t("avatarNoFile");
        return;
    }

    if (avatarFileName) avatarFileName.textContent = file.name;
    setAvatarMessage();

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
        setAvatarMessage(t("avatarInvalidType"), "error");
        avatarInput.value = "";
        if (avatarFileName) avatarFileName.textContent = t("avatarNoFile");
        return;
    }
    if (file.size > 2 * 1024 * 1024) {
        setAvatarMessage(t("avatarTooLarge"), "error");
        avatarInput.value = "";
        if (avatarFileName) avatarFileName.textContent = t("avatarNoFile");
        return;
    }

    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    const previewUrl = URL.createObjectURL(file);
    avatarPreviewUrl = previewUrl;
    profileAvatarImage.src = previewUrl;
    profileAvatarImage.hidden = false;
    profileAvatarPlaceholder.hidden = true;
    avatarInput.disabled = true;
    if (removeAvatarButton) removeAvatarButton.disabled = true;

    try {
        const formData = new FormData();
        formData.append("avatar", file);
        const response = await fetch("/api/auth/avatar", {
            method: "POST", credentials: "same-origin", body: formData
        });
        let result = {};
        try { result = await response.json(); } catch { /* ответ может быть не JSON */ }
        if (!response.ok || !result.success) {
            if (response.status === 413) {
                throw new Error(t("avatarTooLarge"));
            }
            throw new Error(result.message || t("avatarUploadError"));
        }
        profileAvatarImage.src = "/api/auth/avatar?v=" + Date.now();
        refreshHeaderAvatar();
        if (removeAvatarButton) removeAvatarButton.hidden = false;
        setAvatarMessage(t("avatarSaved"), "success");
    } catch (error) {
        console.error("Ошибка загрузки фотографии:", error);
        setAvatarMessage(error.message || t("avatarUploadError"), "error");
        profileAvatarImage.src = "/api/auth/avatar?v=" + Date.now();
    } finally {
        if (avatarPreviewUrl === previewUrl) {
            URL.revokeObjectURL(previewUrl);
            avatarPreviewUrl = null;
        }
        avatarInput.disabled = false;
        if (removeAvatarButton) removeAvatarButton.disabled = false;
        avatarInput.value = "";
        if (avatarFileName) avatarFileName.textContent = t("avatarNoFile");
    }
});

// Загружает актуальные данные пользователя и открывает профиль.
async function openUserProfile() {
    if (!profileModal) {
        console.error("Не найдено окно profileModal в index.html");
        return;
    }

    try {
        const result = await apiRequest("/api/auth/me");
        const user = result.user || result;

        if (profileUsername) {
            profileUsername.textContent = user.username || "—";
        }
        if (newUsernameInput) newUsernameInput.value = user.username || "";

        if (profileEmail) {
            profileEmail.textContent = user.email || "—";
        }


        if (profileTheme) {
			profileTheme.textContent =
				user.theme === "light"
            ? t("profileLight")
            : t("profileDark");
		}

        if (profileLanguage) {
		profileLanguage.textContent =
        user.language === "en" ? "English" : "Русский";
		}
		
		profileAvatarImage.hidden = true;
		profileAvatarPlaceholder.hidden = false;
		removeAvatarButton.hidden = true;

		profileAvatarImage.onload = () => {
		profileAvatarImage.hidden = false;
		profileAvatarPlaceholder.hidden = true;
		removeAvatarButton.hidden = false;
		};

		profileAvatarImage.onerror = () => {
		profileAvatarImage.hidden = true;
		profileAvatarPlaceholder.hidden = false;
		removeAvatarButton.hidden = true;
		};

		profileAvatarImage.src = "/api/auth/avatar?v=" + Date.now();
		
		const profileTitle = document.getElementById("profileModalTitle");

		if (profileTitle) {
			profileTitle.textContent = t("profileTitle");
		}
		const profileThemeLabel =
		document.getElementById("profileThemeLabel");

		const profileLanguageLabel =
		document.getElementById("profileLanguageLabel");

		if (profileThemeLabel) {
			profileThemeLabel.textContent = t("profileTheme");
		}

		if (profileLanguageLabel) {
			profileLanguageLabel.textContent = t("profileLanguage");
		}
		const profileUsernameLabel =
		document.getElementById("profileUsernameLabel");

		if (profileUsernameLabel) {
			profileUsernameLabel.textContent = t("profileUsername");
		}
		
		const profileEmailLabel =
		document.getElementById("profileEmailLabel");

		if (profileEmailLabel) {
			profileEmailLabel.textContent = t("profileEmail");
		}
        if (closeProfileButton) closeProfileButton.textContent = t("profileClose");
        const usernameLabel = document.getElementById("newUsernameLabel");
        const passwordTitle = document.getElementById("changePasswordTitle");
        const currentPasswordLabel = document.getElementById("currentPasswordLabel");
        const newPasswordLabel = document.getElementById("newPasswordLabel");
        const passwordHint = document.getElementById("passwordHint");
        if (usernameLabel) usernameLabel.textContent = t("usernameNewLabel");
        if (usernameSaveButton) usernameSaveButton.textContent = t("usernameSave");
        if (passwordTitle) passwordTitle.textContent = t("passwordTitle");
        if (currentPasswordLabel) currentPasswordLabel.textContent = t("currentPassword");
        if (newPasswordLabel) newPasswordLabel.textContent = t("newPassword");
        if (passwordHint) passwordHint.textContent = t("passwordHint");
        if (passwordSaveButton) passwordSaveButton.textContent = t("passwordSave");
        profileModal.classList.add("active");
    } catch (error) {
        console.error("Ошибка открытия профиля:", error);
        showNotification(error.message || "Не удалось открыть профиль.");
    }
}

// Кнопка профиля и круглый аватар в шапке открывают одно окно.
profileButton?.addEventListener("click", openUserProfile);
document.getElementById("headerAvatarButton")?.addEventListener("click", openUserProfile);

function refreshHeaderAvatar() {
    const headerImage = document.getElementById("headerAvatarImage");
    const headerPlaceholder = document.getElementById("headerAvatarPlaceholder");
    if (!headerImage || !headerPlaceholder) return;
    headerImage.onload = () => { headerImage.hidden = false; headerPlaceholder.hidden = true; };
    headerImage.onerror = () => { headerImage.hidden = true; headerPlaceholder.hidden = false; };
    headerImage.src = "/api/auth/avatar?v=" + Date.now();
}

// Закрытие кнопкой в заголовке.
closeProfileModalButton?.addEventListener("click", () => {
    profileModal?.classList.remove("active");
});

// Закрытие нижней кнопкой.
closeProfileButton?.addEventListener("click", () => {
    profileModal?.classList.remove("active");
});

// Закрытие нажатием на затемнённый фон.
profileModal?.addEventListener("click", (event) => {
    if (event.target === profileModal) {
        profileModal.classList.remove("active");
    }
});

// =========================================================
// Изменение имени пользователя и пароля
// =========================================================

usernameForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    usernameMessage.textContent = "";
    const username = newUsernameInput.value.trim();
    if (username.length < 2 || username.length > 50) {
        usernameMessage.textContent = currentLanguage === "ru"
            ? t("usernameInvalid") : t("usernameInvalid");
        return;
    }
    usernameSaveButton.disabled = true;
    try {
        const result = await apiRequest("/api/auth/username", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username })
        });
        const user = result.user;
        if (profileUsername) profileUsername.textContent = user.username;
        usernameMessage.textContent = t("usernameSaved");
    } catch (error) {
        usernameMessage.textContent = error.message || t("usernameChangeError");
    } finally {
        usernameSaveButton.disabled = false;
    }
});

passwordForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    passwordMessage.textContent = "";
    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;
    if (new TextEncoder().encode(newPassword).length < 8 || new TextEncoder().encode(newPassword).length > 72) {
        passwordMessage.textContent = currentLanguage === "ru"
            ? t("passwordBytesInvalid") : t("passwordBytesInvalid");
        return;
    }
    if (currentPassword === newPassword) {
        passwordMessage.textContent = currentLanguage === "ru"
            ? t("passwordSame") : t("passwordSame");
        return;
    }
    passwordSaveButton.disabled = true;
    try {
        await apiRequest("/api/auth/password", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        passwordForm.reset();
        passwordMessage.textContent = t("passwordSaved");
    } catch (error) {
        passwordMessage.textContent = error.message || t("passwordChangeError");
    } finally {
        passwordSaveButton.disabled = false;
    }
});

removeAvatarButton?.addEventListener("click", openAvatarDeleteModal);
cancelAvatarDeleteButton?.addEventListener("click", closeAvatarDeleteModal);
avatarDeleteModal?.addEventListener("click", (event) => {
    if (event.target === avatarDeleteModal) closeAvatarDeleteModal();
});
confirmAvatarDeleteButton?.addEventListener("click", async () => {
    if (!removeAvatarButton) return;
    removeAvatarButton.disabled = true;
    confirmAvatarDeleteButton.disabled = true;
    try {
        const response = await fetch("/api/auth/avatar", {
            method: "DELETE", credentials: "same-origin"
        });
        let result = {};
        try { result = await response.json(); } catch { /* ответ может быть не JSON */ }
        if (!response.ok || !result.success) {
            throw new Error(result.message || t("avatarDeleteError"));
        }
        profileAvatarImage.removeAttribute("src");
        profileAvatarImage.hidden = true;
        profileAvatarPlaceholder.hidden = false;
        removeAvatarButton.hidden = true;
        refreshHeaderAvatar();
        if (avatarFileName) avatarFileName.textContent = t("avatarNoFile");
        setAvatarMessage(t("avatarDeletedMessage"), "success");
        closeAvatarDeleteModal();
    } catch (error) {
        console.error("Ошибка удаления фотографии:", error);
        closeAvatarDeleteModal();
        setAvatarMessage(error.message || t("avatarDeleteError"), "error");
    } finally {
        removeAvatarButton.disabled = false;
        confirmAvatarDeleteButton.disabled = false;
    }
});


// =========================================================
// 18. Выход из аккаунта
// =========================================================

logoutButton?.addEventListener("click", async () => {
    logoutButton.disabled = true;

    try {
        // Завершаем пользовательскую сессию на сервере.
        await apiRequest("/api/auth/logout", {
            method: "POST"
        });

        // Не удаляем taskboardTheme и taskboardLanguage:
        // тема и язык сохраняются после выхода.

        // Переходим на страницу авторизации.
        window.location.href = "/auth.html";
    } catch (error) {
        console.error("Ошибка выхода:", error);

        showNotification(
            error.message || t("logoutError")
        );
    } finally {
        logoutButton.disabled = false;
    }
});

// =========================================================
// 19. Запуск приложения
// =========================================================

// Сначала проверяем авторизацию и загружаем настройки.
// Затем загружаем задачи пользователя.
async function initializeApp() {
    try {
        await loadUserSettings();
        refreshHeaderAvatar();
        await loadTasks();
    } catch (error) {
        // Ошибка авторизации уже обрабатывается apiRequest().
        console.error("Не удалось запустить приложение:", error);
    }
}

// Устанавливаем минимальный срок и запускаем приложение.
// Скрипт подключён в конце index.html, поэтому элементы уже доступны.
updateDeadlineMinimum();
initializeApp();