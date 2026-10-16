
/*
 * TaskBoard — маршруты управления задачами.
 *
 * Файл отвечает за:
 * 1. Получение списка задач текущего пользователя.
 * 2. Создание новых задач.
 * 3. Редактирование существующих задач.
 * 4. Удаление задач.
 * 5. Проверку входных данных.
 * 6. Проверку принадлежности категорий и задач пользователю.
 * 7. Проверку срока выполнения: прошедшие даты запрещены.
 *
 * Все маршруты защищены middleware requireAuth.
 */

const express = require("express");

// Получаем пул подключений из модуля базы данных.
const { pool } = require("../db/pool");

// Middleware запрещает доступ к задачам без авторизации.
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

// =========================================================
// 1. Общие настройки и вспомогательные функции
// =========================================================

// Все маршруты этого файла требуют авторизации.
router.use(requireAuth);

// Допустимые статусы задач.
const ALLOWED_STATUSES = ["todo", "in_progress", "done"];

// Допустимые уровни приоритета.
const ALLOWED_PRIORITIES = ["low", "medium", "high"];

// Общий список полей задачи для SQL-запросов.
// Использование одной константы помогает избежать дублирования.
const TASK_FIELDS = `
    id,
    title,
    description,
    status,
    priority,
    due_date,
    category_id,
    created_at,
    updated_at
`;

// Проверяет, что идентификатор является положительным целым числом.
function isValidId(value) {
    return Number.isSafeInteger(value) && value > 0;
}

// Проверяет дату в формате YYYY-MM-DD.
// Проверяется не только формат, но и существование даты в календаре.
// Например, 30 февраля и 31 апреля будут отклонены.
function isValidDate(value) {
    if (typeof value !== "string") {
        return false;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const [year, month, day] = value.split("-").map(Number);

    // Исключаем некорректные значения года.
    if (year < 1) {
        return false;
    }

    const date = new Date(Date.UTC(year, month - 1, day));

    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
}

// Возвращает сегодняшнюю дату в формате YYYY-MM-DD
// по локальному времени сервера.
function getTodayDate() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// Проверяет срок выполнения задачи.
//
// Правила:
// - пустая дата разрешена;
// - несуществующая календарная дата запрещена;
// - вчерашние и более ранние даты запрещены;
// - сегодняшняя и будущие даты разрешены.
//
// Сравнение строк безопасно, поскольку даты предварительно
// проверяются и имеют одинаковый формат YYYY-MM-DD.
function validateDueDate(value) {
    if (value === undefined || value === null || value === "") {
        return { valid: true, value: null };
    }

    if (!isValidDate(value)) {
        return { valid: false, value: null };
    }

    const today = getTodayDate();

    if (value < today) {
        return { valid: false, value: null };
    }

    return { valid: true, value };
}

// Проверяет идентификатор категории.
// Пустое значение означает отсутствие категории.
function validateCategoryId(value) {
    if (value === undefined || value === null || value === "") {
        return { valid: true, value: null };
    }

    // HTML-формы могут передавать идентификаторы строками.
    const categoryId =
        typeof value === "number"
            ? value
            : typeof value === "string" && /^\d+$/.test(value)
                ? Number(value)
                : NaN;

    if (!isValidId(categoryId)) {
        return { valid: false, value: null };
    }

    return { valid: true, value: categoryId };
}

// Проверяет, что тело запроса является обычным объектом,
// а не массивом, null или другим типом значения.
function hasValidBody(body) {
    return (
        body !== null &&
        typeof body === "object" &&
        !Array.isArray(body)
    );
}

// Возвращает единообразный JSON-ответ с ошибкой.
function sendError(res, status, message) {
    return res.status(status).json({
        success: false,
        message
    });
}

// Проверяет существование категории и её принадлежность пользователю.
// Отсутствие категории разрешено.
async function categoryBelongsToUser(categoryId, userId) {
    if (categoryId === null) {
        return true;
    }

    const result = await pool.query(
        `SELECT id
         FROM categories
         WHERE id = $1 AND user_id = $2`,
        [categoryId, userId]
    );

    return result.rows.length > 0;
}

// =========================================================
// 2. Получение всех задач пользователя
// =========================================================

// GET /api/tasks
router.get("/", async (req, res) => {
    try {
        // Выбираем только задачи текущего пользователя.
        // Недавно созданные задачи отображаются первыми.
        const result = await pool.query(
            `SELECT ${TASK_FIELDS}
             FROM tasks
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [req.session.userId]
        );

        return res.json({
            success: true,
            tasks: result.rows
        });
    } catch (error) {
        console.error("Ошибка получения задач:", error.message);

        return sendError(res, 500, "Не удалось получить задачи");
    }
});

// =========================================================
// 3. Создание задачи
// =========================================================

// POST /api/tasks
router.post("/", async (req, res) => {
    try {
        // Проверяем структуру входных данных.
        if (!hasValidBody(req.body)) {
            return sendError(res, 400, "Некорректные данные запроса");
        }

        // Получаем поля задачи и значения по умолчанию.
        const {
            title,
            description,
            status = "todo",
            priority = "medium",
            due_date,
            category_id
        } = req.body;

        // Название обязательно и не может состоять только из пробелов.
        if (typeof title !== "string" || !title.trim()) {
            return sendError(res, 400, "Введите название задачи");
        }

        const cleanTitle = title.trim();

        if (cleanTitle.length > 200) {
            return sendError(
                res,
                400,
                "Название задачи не должно превышать 200 символов"
            );
        }

        // Описание необязательно, но должно быть строкой.
        if (
            description !== undefined &&
            typeof description !== "string"
        ) {
            return sendError(res, 400, "Некорректное описание задачи");
        }

        const cleanDescription = description ?? "";

        if (cleanDescription.length > 5000) {
            return sendError(
                res,
                400,
                "Описание не должно превышать 5000 символов"
            );
        }

        // Проверяем допустимые статус и приоритет.
        if (!ALLOWED_STATUSES.includes(status)) {
            return sendError(res, 400, "Недопустимый статус задачи");
        }

        if (!ALLOWED_PRIORITIES.includes(priority)) {
            return sendError(res, 400, "Недопустимый приоритет задачи");
        }

        // Проверяем срок выполнения, включая запрет прошедших дат.
        const dueDate = validateDueDate(due_date);

        if (!dueDate.valid) {
            return sendError(
                res,
                400,
                "Укажите корректную дату выполнения: сегодня или позже"
            );
        }

        // Проверяем идентификатор категории.
        const category = validateCategoryId(category_id);

        if (!category.valid) {
            return sendError(
                res,
                400,
                "Некорректный идентификатор категории"
            );
        }

        // Пользователь может назначить задаче только свою категорию.
        if (
            !(await categoryBelongsToUser(
                category.value,
                req.session.userId
            ))
        ) {
            return sendError(res, 400, "Категория не найдена");
        }

        // Создаём задачу и возвращаем сохранённую запись.
        const result = await pool.query(
            `INSERT INTO tasks (
                user_id,
                title,
                description,
                status,
                priority,
                due_date,
                category_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING ${TASK_FIELDS}`,
            [
                req.session.userId,
                cleanTitle,
                cleanDescription,
                status,
                priority,
                dueDate.value,
                category.value
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Задача создана",
            task: result.rows[0]
        });
    } catch (error) {
        console.error("Ошибка создания задачи:", error.message);

        return sendError(res, 500, "Не удалось создать задачу");
    }
});

// =========================================================
// 4. Редактирование задачи
// =========================================================

// PUT /api/tasks/:id
router.put("/:id", async (req, res) => {
    try {
        // Преобразуем идентификатор из URL в число и проверяем его.
        const taskId = Number(req.params.id);

        if (!isValidId(taskId)) {
            return sendError(
                res,
                400,
                "Некорректный идентификатор задачи"
            );
        }

        // Проверяем структуру тела запроса.
        if (!hasValidBody(req.body)) {
            return sendError(res, 400, "Некорректные данные запроса");
        }

        const {
            title,
            description,
            status,
            priority,
            due_date,
            category_id
        } = req.body;

        // Название обязательно при полном обновлении задачи.
        if (
            typeof title !== "string" ||
            !title.trim() ||
            title.trim().length > 200
        ) {
            return sendError(
                res,
                400,
                "Введите название задачи длиной до 200 символов"
            );
        }

        // Проверяем тип описания и ограничиваем его длину.
        if (
            description !== undefined &&
            typeof description !== "string"
        ) {
            return sendError(res, 400, "Некорректное описание задачи");
        }

        const cleanDescription = description ?? "";

        if (cleanDescription.length > 5000) {
            return sendError(
                res,
                400,
                "Описание не должно превышать 5000 символов"
            );
        }

        // Проверяем статус и приоритет.
        if (!ALLOWED_STATUSES.includes(status)) {
            return sendError(res, 400, "Недопустимый статус задачи");
        }

        if (!ALLOWED_PRIORITIES.includes(priority)) {
            return sendError(res, 400, "Недопустимый приоритет задачи");
        }

        // Проверяем срок выполнения.
        // Прошедшую дату нельзя установить и при редактировании.
        const dueDate = validateDueDate(due_date);

        if (!dueDate.valid) {
            return sendError(
                res,
                400,
                "Укажите корректную дату выполнения: сегодня или позже"
            );
        }

        // Проверяем категорию, если она назначена задаче.
        const category = validateCategoryId(category_id);

        if (!category.valid) {
            return sendError(
                res,
                400,
                "Некорректный идентификатор категории"
            );
        }

        // Нельзя назначить задаче категорию другого пользователя.
        if (
            !(await categoryBelongsToUser(
                category.value,
                req.session.userId
            ))
        ) {
            return sendError(res, 400, "Категория не найдена");
        }

        // Обновляем только задачу текущего пользователя.
        // updated_at фиксирует время последнего изменения.
        const result = await pool.query(
            `UPDATE tasks
             SET title = $1,
                 description = $2,
                 status = $3,
                 priority = $4,
                 due_date = $5,
                 category_id = $6,
                 updated_at = NOW()
             WHERE id = $7 AND user_id = $8
             RETURNING ${TASK_FIELDS}`,
            [
                title.trim(),
                cleanDescription,
                status,
                priority,
                dueDate.value,
                category.value,
                taskId,
                req.session.userId
            ]
        );

        if (result.rows.length === 0) {
            return sendError(res, 404, "Задача не найдена");
        }

        return res.json({
            success: true,
            message: "Задача обновлена",
            task: result.rows[0]
        });
    } catch (error) {
        console.error("Ошибка редактирования задачи:", error.message);

        return sendError(res, 500, "Не удалось обновить задачу");
    }
});

// =========================================================
// 5. Удаление задачи
// =========================================================

// DELETE /api/tasks/:id
router.delete("/:id", async (req, res) => {
    try {
        // Проверяем идентификатор задачи из URL.
        const taskId = Number(req.params.id);

        if (!isValidId(taskId)) {
            return sendError(
                res,
                400,
                "Некорректный идентификатор задачи"
            );
        }

        // Удалять можно только задачу текущего пользователя.
        const result = await pool.query(
            `DELETE FROM tasks
             WHERE id = $1 AND user_id = $2
             RETURNING id`,
            [taskId, req.session.userId]
        );

        if (result.rows.length === 0) {
            return sendError(res, 404, "Задача не найдена");
        }

        return res.json({
            success: true,
            message: "Задача удалена"
        });
    } catch (error) {
        console.error("Ошибка удаления задачи:", error.message);

        return sendError(res, 500, "Не удалось удалить задачу");
    }
});

// =========================================================
// 6. Экспорт маршрутов
// =========================================================

// server.js подключает маршрутизатор по адресу /api/tasks.
module.exports = router;
