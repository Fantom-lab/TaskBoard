
/*
 * TaskBoard — маршруты авторизации и пользовательских настроек.
 *
 * Файл отвечает за:
 * 1. Регистрацию пользователей и вход в аккаунт.
 * 2. Создание и завершение пользовательских сессий.
 * 3. Получение данных профиля.
 * 4. Сохранение темы и языка интерфейса.
 * 5. Изменение имени пользователя и пароля.
 * 6. Загрузку, получение и удаление фотографии профиля.
 * 7. Проверку входных данных и обработку ошибок API.
 */

const express = require("express");
const bcrypt = require("bcrypt");
const multer = require("multer");

// Получаем пул подключений из обновлённого модуля базы данных.
const { pool } = require("../db/pool");

const router = express.Router();

// =========================================================
// 1. Настройка загрузки фотографий
// =========================================================

// Храним загружаемый файл в памяти до сохранения в PostgreSQL.
// Максимальный размер фотографии — 2 МБ.
const avatarUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 2 * 1024 * 1024
    },
    fileFilter: (req, file, callback) => {
        // Разрешаем только поддерживаемые форматы изображений.
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!allowedTypes.includes(file.mimetype)) {
            return callback(
                new Error("Разрешены только JPG, PNG и WEBP")
            );
        }

        callback(null, true);
    }
});

// =========================================================
// 2. Общие константы и вспомогательные функции
// =========================================================

// Количество раундов bcrypt при создании хеша пароля.
const BCRYPT_ROUNDS = 12;

// Проверяет, что значение является непустой строкой.
function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
}

// Возвращает единообразный JSON-ответ с ошибкой.
function sendError(res, status, message) {
    return res.status(status).json({
        success: false,
        message
    });
}

// Создаёт новую сессию после успешной авторизации.
// Перегенерация идентификатора помогает защититься от фиксации сессии.
function createUserSession(req, userId) {
    return new Promise((resolve, reject) => {
        req.session.regenerate((regenerateError) => {
            if (regenerateError) {
                return reject(regenerateError);
            }

            // Сохраняем ID авторизованного пользователя в сессии.
            req.session.userId = userId;

            // Дожидаемся сохранения сессии перед ответом клиенту.
            req.session.save((saveError) => {
                if (saveError) {
                    return reject(saveError);
                }

                resolve();
            });
        });
    });
}

// Проверяет наличие авторизованной сессии.
// Используется в маршрутах, доступных только вошедшему пользователю.
function requireUserSession(req, res) {
    if (!req.session?.userId) {
        sendError(res, 401, "Необходимо войти в аккаунт");
        return false;
    }

    return true;
}

// =========================================================
// 3. Регистрация нового пользователя
// =========================================================

// POST /api/auth/register
router.post("/register", async (req, res) => {
    try {
        const { username, email, password } = req.body || {};

        // Проверяем наличие обязательных полей.
        if (
            !isNonEmptyString(username) ||
            !isNonEmptyString(email) ||
            typeof password !== "string" ||
            password.length === 0
        ) {
            return sendError(res, 400, "Заполните все поля");
        }

        // Нормализуем имя и электронную почту.
        const cleanUsername = username.trim();
        const cleanEmail = email.trim().toLowerCase();

        // Проверяем допустимую длину имени пользователя.
        if (cleanUsername.length < 2 || cleanUsername.length > 50) {
            return sendError(
                res,
                400,
                "Имя должно содержать от 2 до 50 символов"
            );
        }

        // Проверяем длину и базовый формат электронной почты.
        if (
            cleanEmail.length > 255 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
        ) {
            return sendError(
                res,
                400,
                "Введите корректный адрес электронной почты"
            );
        }

        // bcrypt учитывает максимум 72 байта пароля.
        // Поэтому проверяем именно размер UTF-8-представления.
        const passwordBytes = Buffer.byteLength(password, "utf8");

        if (passwordBytes < 8 || passwordBytes > 72) {
            return sendError(
                res,
                400,
                "Пароль должен занимать от 8 до 72 байт в UTF-8"
            );
        }

        // Проверяем, не зарегистрированы ли такие имя или почта.
        const existingUser = await pool.query(
            `SELECT id
             FROM users
             WHERE username = $1 OR email = $2
             LIMIT 1`,
            [cleanUsername, cleanEmail]
        );

        if (existingUser.rows.length > 0) {
            return sendError(
                res,
                409,
                "Такое имя или электронная почта уже заняты"
            );
        }

        // Сохраняем только хеш пароля, а не исходный пароль.
        const passwordHash = await bcrypt.hash(
            password,
            BCRYPT_ROUNDS
        );

        let result;

        try {
            // Параметризованный запрос защищает значения от SQL-инъекций.
            // RETURNING возвращает данные созданной учётной записи.
            result = await pool.query(
                `INSERT INTO users (
                    username,
                    email,
                    password_hash
                )
                VALUES ($1, $2, $3)
                RETURNING id, username, email`,
                [cleanUsername, cleanEmail, passwordHash]
            );
        } catch (error) {
            // Уникальные ограничения БД защищают и от одновременных регистраций.
            if (error.code === "23505") {
                return sendError(
                    res,
                    409,
                    "Такое имя или электронная почта уже заняты"
                );
            }

            throw error;
        }

        const user = result.rows[0];

        // После регистрации автоматически выполняем вход.
        try {
            await createUserSession(req, user.id);
        } catch (error) {
            console.error(
                "Ошибка создания сессии после регистрации:",
                error.message
            );

            return sendError(
                res,
                500,
                "Аккаунт создан, но не удалось выполнить вход. Попробуйте войти."
            );
        }

        return res.status(201).json({
            success: true,
            message: "Регистрация прошла успешно",
            user
        });
    } catch (error) {
        console.error("Ошибка регистрации:", error.message);

        return sendError(
            res,
            500,
            "Ошибка сервера при регистрации"
        );
    }
});

// =========================================================
// 4. Вход в аккаунт
// =========================================================

// POST /api/auth/login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body || {};

        // Проверяем наличие электронной почты и пароля.
        if (
            !isNonEmptyString(email) ||
            typeof password !== "string" ||
            password.length === 0
        ) {
            return sendError(
                res,
                400,
                "Введите электронную почту и пароль"
            );
        }

        const cleanEmail = email.trim().toLowerCase();

        // Получаем учётную запись по нормализованной почте.
        const result = await pool.query(
            `SELECT id, username, email, password_hash
             FROM users
             WHERE email = $1
             LIMIT 1`,
            [cleanEmail]
        );

        // Не раскрываем, существует ли аккаунт с такой почтой.
        if (result.rows.length === 0) {
            return sendError(
                res,
                401,
                "Неверная электронная почта или пароль"
            );
        }

        const user = result.rows[0];

        // Сравниваем введённый пароль с хешем из базы данных.
        const passwordMatches = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatches) {
            return sendError(
                res,
                401,
                "Неверная электронная почта или пароль"
            );
        }

        // Обновляем идентификатор сессии после проверки пароля.
        try {
            await createUserSession(req, user.id);
        } catch (error) {
            console.error(
                "Ошибка создания сессии при входе:",
                error.message
            );

            return sendError(res, 500, "Не удалось выполнить вход");
        }

        return res.json({
            success: true,
            message: "Вход выполнен успешно",
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error("Ошибка входа:", error.message);

        return sendError(res, 500, "Ошибка сервера при входе");
    }
});

// =========================================================
// 5. Выход из аккаунта
// =========================================================

// POST /api/auth/logout
router.post("/logout", (req, res) => {
    // Если сессии нет, удаляем cookie и завершаем выход.
    if (!req.session) {
        res.clearCookie("connect.sid");

        return res.json({
            success: true,
            message: "Вы вышли из аккаунта"
        });
    }

    // Удаляем серверную сессию.
    req.session.destroy((error) => {
        if (error) {
            console.error(
                "Ошибка завершения сессии:",
                error.message
            );

            return sendError(
                res,
                500,
                "Не удалось выйти из аккаунта"
            );
        }

        // Удаляем cookie с идентификатором сессии в браузере.
        res.clearCookie("connect.sid", {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production"
        });

        return res.json({
            success: true,
            message: "Вы вышли из аккаунта"
        });
    });
});

// =========================================================
// 6. Получение данных текущего пользователя
// =========================================================

// GET /api/auth/me
router.get("/me", async (req, res) => {
    if (!requireUserSession(req, res)) {
        return;
    }

    try {
        // Возвращаем только публичные данные профиля.
        // Хеш пароля и содержимое фотографии не передаём.
        const result = await pool.query(
            `SELECT id, username, email, theme, language
             FROM users
             WHERE id = $1`,
            [req.session.userId]
        );

        if (result.rows.length === 0) {
            return sendError(res, 401, "Пользователь не найден");
        }

        return res.json({
            success: true,
            user: result.rows[0]
        });
    } catch (error) {
        console.error("Ошибка получения профиля:", error.message);

        return sendError(
            res,
            500,
            "Не удалось получить данные пользователя"
        );
    }
});

// =========================================================
// 7. Сохранение темы и языка интерфейса
// =========================================================

// PUT /api/auth/settings
router.put("/settings", async (req, res) => {
    if (!requireUserSession(req, res)) {
        return;
    }

    const { theme, language } = req.body || {};

    // Разрешаем только предусмотренные приложением темы.
    if (
        typeof theme !== "string" ||
        !["dark", "light"].includes(theme)
    ) {
        return sendError(res, 400, "Недопустимая тема");
    }

    // Разрешаем только поддерживаемые языки.
    if (
        typeof language !== "string" ||
        !["ru", "en"].includes(language)
    ) {
        return sendError(res, 400, "Недопустимый язык");
    }

    try {
        // ID пользователя берём из сессии, а не из запроса клиента.
        const result = await pool.query(
            `UPDATE users
             SET theme = $1,
                 language = $2
             WHERE id = $3
             RETURNING id, username, email, theme, language`,
            [theme, language, req.session.userId]
        );

        if (result.rows.length === 0) {
            return sendError(res, 404, "Пользователь не найден");
        }

        return res.json({
            success: true,
            message: "Настройки сохранены",
            user: result.rows[0]
        });
    } catch (error) {
        console.error("Ошибка сохранения настроек:", error.message);

        return sendError(
            res,
            500,
            "Не удалось сохранить настройки"
        );
    }
});

// =========================================================
// 8. Изменение имени пользователя
// =========================================================

// PUT /api/auth/username
router.put("/username", async (req, res) => {
    if (!requireUserSession(req, res)) {
        return;
    }

    const username = req.body?.username;

    // Проверяем, что новое имя передано в виде непустой строки.
    if (!isNonEmptyString(username)) {
        return sendError(res, 400, "Введите новое имя пользователя");
    }

    const cleanUsername = username.trim();

    if (cleanUsername.length < 2 || cleanUsername.length > 50) {
        return sendError(
            res,
            400,
            "Имя должно содержать от 2 до 50 символов"
        );
    }

    try {
        // Изменяем только имя пользователя текущей сессии.
        const result = await pool.query(
            `UPDATE users
             SET username = $1
             WHERE id = $2
             RETURNING id, username, email, theme, language`,
            [cleanUsername, req.session.userId]
        );

        if (result.rows.length === 0) {
            return sendError(res, 404, "Пользователь не найден");
        }

        return res.json({
            success: true,
            message: "Имя пользователя изменено",
            user: result.rows[0]
        });
    } catch (error) {
        // PostgreSQL 23505 означает нарушение уникального ограничения.
        if (error.code === "23505") {
            return sendError(res, 409, "Это имя пользователя уже занято");
        }

        console.error(
            "Ошибка изменения имени пользователя:",
            error.message
        );

        return sendError(
            res,
            500,
            "Не удалось изменить имя пользователя"
        );
    }
});

// =========================================================
// 9. Изменение пароля
// =========================================================

// PUT /api/auth/password
router.put("/password", async (req, res) => {
    if (!requireUserSession(req, res)) {
        return;
    }

    const { currentPassword, newPassword } = req.body || {};

    // Для смены пароля нужны текущий и новый пароли.
    if (
        typeof currentPassword !== "string" ||
        !currentPassword ||
        typeof newPassword !== "string" ||
        !newPassword
    ) {
        return sendError(
            res,
            400,
            "Заполните текущий и новый пароль"
        );
    }

    // Проверяем допустимую длину нового пароля в байтах.
    const passwordBytes = Buffer.byteLength(newPassword, "utf8");

    if (passwordBytes < 8 || passwordBytes > 72) {
        return sendError(
            res,
            400,
            "Новый пароль должен занимать от 8 до 72 байт в UTF-8"
        );
    }

    try {
        // Получаем хеш пароля текущего пользователя.
        const found = await pool.query(
            "SELECT password_hash FROM users WHERE id = $1",
            [req.session.userId]
        );

        if (found.rows.length === 0) {
            return sendError(res, 404, "Пользователь не найден");
        }

        // Не разрешаем сменить пароль без проверки текущего пароля.
        const matches = await bcrypt.compare(
            currentPassword,
            found.rows[0].password_hash
        );

        if (!matches) {
            return sendError(res, 400, "Текущий пароль указан неверно");
        }

        // Создаём хеш нового пароля и сохраняем его вместо старого.
        const passwordHash = await bcrypt.hash(
            newPassword,
            BCRYPT_ROUNDS
        );

        await pool.query(
            "UPDATE users SET password_hash = $1 WHERE id = $2",
            [passwordHash, req.session.userId]
        );

        return res.json({
            success: true,
            message: "Пароль успешно изменён"
        });
    } catch (error) {
        console.error("Ошибка изменения пароля:", error.message);

        return sendError(
            res,
            500,
            "Не удалось изменить пароль"
        );
    }
});

// =========================================================
// 10. Загрузка фотографии профиля
// =========================================================

// POST /api/auth/avatar
// Файл передаётся в поле FormData с именем avatar.
router.post(
    "/avatar",

    // Сначала проверяем авторизацию, не принимая файл от гостя.
    (req, res, next) => {
        if (!requireUserSession(req, res)) {
            return;
        }

        next();
    },

    // Обрабатываем файл отдельно, чтобы вернуть понятную ошибку.
    (req, res, next) => {
        avatarUpload.single("avatar")(req, res, (error) => {
            if (error) {
                if (error instanceof multer.MulterError) {
                    return sendError(
                        res,
                        error.code === "LIMIT_FILE_SIZE" ? 413 : 400,
                        error.code === "LIMIT_FILE_SIZE"
                            ? "Фотография не должна превышать 2 МБ"
                            : "Не удалось загрузить фотографию"
                    );
                }

                return sendError(
                    res,
                    400,
                    error.message || "Ошибка загрузки фотографии"
                );
            }

            next();
        });
    },

    // Сохраняем фотографию в базе данных.
    async (req, res) => {
        if (!req.file) {
            return sendError(res, 400, "Выберите фотографию");
        }

        try {
            const result = await pool.query(
                `UPDATE users
                 SET avatar_data = $1,
                     avatar_mime_type = $2
                 WHERE id = $3
                 RETURNING id`,
                [
                    req.file.buffer,
                    req.file.mimetype,
                    req.session.userId
                ]
            );

            if (result.rows.length === 0) {
                return sendError(res, 404, "Пользователь не найден");
            }

            return res.json({
                success: true,
                message: "Фотография сохранена"
            });
        } catch (error) {
            console.error(
                "Ошибка сохранения фотографии:",
                error.message
            );

            return sendError(
                res,
                500,
                "Не удалось сохранить фотографию"
            );
        }
    }
);

// =========================================================
// 11. Получение фотографии профиля
// =========================================================

// GET /api/auth/avatar
// Возвращает изображение только текущего авторизованного пользователя.
router.get("/avatar", async (req, res) => {
    if (!req.session?.userId) {
        return res.sendStatus(401);
    }

    try {
        const result = await pool.query(
            `SELECT avatar_data, avatar_mime_type
             FROM users
             WHERE id = $1`,
            [req.session.userId]
        );

        // Если фото отсутствует, возвращаем HTTP 404.
        if (
            result.rows.length === 0 ||
            !result.rows[0].avatar_data
        ) {
            return res.sendStatus(404);
        }

        const user = result.rows[0];

        // Не позволяем браузеру сохранять приватное изображение в кэше.
        res.set("Cache-Control", "no-store");
        res.type(user.avatar_mime_type);

        return res.send(user.avatar_data);
    } catch (error) {
        console.error(
            "Ошибка получения фотографии:",
            error.message
        );

        return res.sendStatus(500);
    }
});

// =========================================================
// 12. Удаление фотографии профиля
// =========================================================

// DELETE /api/auth/avatar
router.delete("/avatar", async (req, res) => {
    if (!requireUserSession(req, res)) {
        return;
    }

    try {
        // Удаляем фото только у пользователя текущей сессии.
        const result = await pool.query(
            `UPDATE users
             SET avatar_data = NULL,
                 avatar_mime_type = NULL
             WHERE id = $1
             RETURNING id`,
            [req.session.userId]
        );

        if (result.rows.length === 0) {
            return sendError(res, 404, "Пользователь не найден");
        }

        return res.json({
            success: true,
            message: "Фотография удалена"
        });
    } catch (error) {
        console.error(
            "Ошибка удаления фотографии:",
            error.message
        );

        return sendError(
            res,
            500,
            "Не удалось удалить фотографию"
        );
    }
});

// =========================================================
// 13. Экспорт маршрутов
// =========================================================

// В server.js маршрутизатор подключается по адресу /api/auth.
module.exports = router;
