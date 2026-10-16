
/*
 * TaskBoard — настройка пользовательских сессий.
 *
 * Этот файл:
 * 1. Создаёт middleware для управления сессиями.
 * 2. Сохраняет идентификатор пользователя между запросами.
 * 3. Настраивает параметры безопасности cookie.
 * 4. Проверяет наличие секрета сессии в production.
 * 5. Экспортирует middleware для подключения в server.js.
 */

const session = require("express-session");

// Определяем, запущено ли приложение в production.
const isProduction = process.env.NODE_ENV === "production";

// Секрет используется для подписи идентификатора сессии.
// В production он должен быть задан через SESSION_SECRET.
// Запасное значение применяется только при локальной разработке.
const sessionSecret = process.env.SESSION_SECRET;

// Запрещаем запуск production-приложения без секретного ключа.
if (isProduction && !sessionSecret) {
    throw new Error(
        "Для production необходимо задать переменную SESSION_SECRET."
    );
}

// Создаём middleware управления пользовательскими сессиями.
const sessionMiddleware = session({
    // Секрет для подписи идентификатора сессии.
    secret: sessionSecret || "taskboard-local-development-secret",

    // Не сохраняем сессию повторно, если она не изменялась.
    resave: false,

    // Не создаём пустые сессии для неавторизованных посетителей.
    saveUninitialized: false,

    // Настраиваем cookie, через которую браузер передаёт сессию.
    cookie: {
        // Запрещаем доступ к cookie через JavaScript.
        httpOnly: true,

        // Ограничиваем отправку cookie при межсайтовых запросах.
        sameSite: "lax",

        // Cookie действует 24 часа.
        maxAge: 1000 * 60 * 60 * 24,

        // Cookie доступна на всех маршрутах приложения.
        path: "/",

        // В production cookie передаётся только через HTTPS.
        // За обратным прокси может понадобиться настройка trust proxy.
        secure: isProduction
    }
});

// Экспортируем middleware для подключения в server.js.
module.exports = sessionMiddleware;
