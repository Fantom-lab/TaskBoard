
/*
 * TaskBoard — структура базы данных PostgreSQL.
 *
 * Таблицы:
 * 1. users      — пользователи, настройки и фотография профиля.
 * 2. categories — категории задач отдельных пользователей.
 * 3. tasks      — задачи, их статусы, приоритеты и сроки.
 *
 * Внешние ключи обеспечивают целостность связей между таблицами.
 * Ограничения CHECK проверяют допустимые значения полей.
 * Индексы ускоряют часто используемые запросы.
 */


/* =========================================================
   1. Пользователи
   ========================================================= */

CREATE TABLE IF NOT EXISTS users (
    -- Уникальный идентификатор пользователя.
    id SERIAL PRIMARY KEY,

    -- Имя пользователя: обязательно и уникально.
    username VARCHAR(50) NOT NULL UNIQUE,

    -- Электронная почта для входа в аккаунт.
    email VARCHAR(255) NOT NULL UNIQUE,

    -- Хеш пароля, созданный с помощью bcrypt.
    -- Исходный пароль в базе данных не хранится.
    password_hash TEXT NOT NULL,

    -- Язык интерфейса: русский или английский.
    language VARCHAR(2) NOT NULL DEFAULT 'ru'
        CHECK (language IN ('ru', 'en')),

    -- Тема интерфейса: тёмная или светлая.
    theme VARCHAR(10) NOT NULL DEFAULT 'dark'
        CHECK (theme IN ('dark', 'light')),

    -- Двоичные данные фотографии профиля.
    -- NULL означает, что пользователь не загрузил фотографию.
    avatar_data BYTEA,

    -- MIME-тип фотографии, например image/jpeg.
    -- Должен соответствовать формату сохранённого изображения.
    avatar_mime_type VARCHAR(50),

    -- Дата и время создания аккаунта.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Фотография и её MIME-тип должны присутствовать вместе.
    CONSTRAINT users_avatar_data_pair
        CHECK (
            (avatar_data IS NULL AND avatar_mime_type IS NULL)
            OR
            (avatar_data IS NOT NULL AND avatar_mime_type IS NOT NULL)
        ),

    -- Разрешаем только форматы, поддерживаемые приложением.
    CONSTRAINT users_avatar_mime_type
        CHECK (
            avatar_mime_type IS NULL
            OR avatar_mime_type IN (
                'image/jpeg',
                'image/png',
                'image/webp'
            )
        )
);


/* =========================================================
   2. Категории задач
   ========================================================= */

CREATE TABLE IF NOT EXISTS categories (
    -- Уникальный идентификатор категории.
    id SERIAL PRIMARY KEY,

    -- Владелец категории.
    -- При удалении пользователя его категории удаляются.
    user_id INTEGER NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    -- Название категории.
    name VARCHAR(100) NOT NULL,

    -- Цвет категории в шестнадцатеричном формате HEX.
    color VARCHAR(7) NOT NULL DEFAULT '#6366f1',

    -- Дата и время создания категории.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Запрещаем одинаковые названия категорий у одного пользователя.
    CONSTRAINT categories_user_name_unique
        UNIQUE (user_id, name),

    -- Составной ключ для проверки владельца категории у задачи.
    CONSTRAINT categories_user_id_unique
        UNIQUE (user_id, id),

    -- Цвет должен содержать символ # и шесть HEX-цифр.
    CONSTRAINT categories_color_format
        CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);


/* =========================================================
   3. Задачи
   ========================================================= */

CREATE TABLE IF NOT EXISTS tasks (
    -- Уникальный идентификатор задачи.
    id SERIAL PRIMARY KEY,

    -- Владелец задачи.
    -- При удалении пользователя его задачи удаляются.
    user_id INTEGER NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    -- Необязательная категория задачи.
    category_id INTEGER,

    -- Название задачи.
    title VARCHAR(200) NOT NULL,

    -- Описание задачи. По умолчанию пустое.
    description TEXT NOT NULL DEFAULT '',

    -- Статус задачи на Kanban-доске.
    status VARCHAR(20) NOT NULL DEFAULT 'todo'
        CHECK (status IN ('todo', 'in_progress', 'done')),

    -- Приоритет задачи.
    priority VARCHAR(10) NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high')),

    -- Срок выполнения. Может отсутствовать.
    due_date DATE,

    -- Дата и время создания задачи.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Дата и время последнего изменения задачи.
    -- Обновляется запросом UPDATE в routes/tasks.js.
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Категория должна принадлежать тому же пользователю,
    -- которому принадлежит задача.
    -- При удалении категории задача сохраняется без категории.
    CONSTRAINT tasks_category_owner_fk
        FOREIGN KEY (user_id, category_id)
        REFERENCES categories(user_id, id)
        ON DELETE SET NULL (category_id),

    -- Название не должно быть пустым или состоять из пробелов.
    CONSTRAINT tasks_title_not_blank
        CHECK (LENGTH(TRIM(title)) > 0),

    -- Ограничиваем длину описания.
    CONSTRAINT tasks_description_length
        CHECK (LENGTH(description) <= 5000)
);


/* =========================================================
   4. Индексы для ускорения запросов
   ========================================================= */

-- Ускоряет выборку задач конкретного пользователя.
CREATE INDEX IF NOT EXISTS idx_tasks_user_id
    ON tasks(user_id);

-- Ускоряет выборку задач пользователя по статусу.
CREATE INDEX IF NOT EXISTS idx_tasks_user_status
    ON tasks(user_id, status);

-- Ускоряет поиск задач пользователя по сроку выполнения.
CREATE INDEX IF NOT EXISTS idx_tasks_due_date
    ON tasks(user_id, due_date);


/* =========================================================
   5. Описание таблиц для документации PostgreSQL
   ========================================================= */

COMMENT ON TABLE users IS
    'Пользователи TaskBoard, настройки и фотографии профиля';

COMMENT ON TABLE categories IS
    'Категории задач, принадлежащие отдельным пользователям';

COMMENT ON TABLE tasks IS
    'Задачи пользователей со статусами, приоритетами и сроками';


/* =========================================================
   6. Описание отдельных полей
   ========================================================= */

COMMENT ON COLUMN users.password_hash IS
    'Хеш пароля, созданный bcrypt; исходный пароль не хранится';

COMMENT ON COLUMN users.avatar_data IS
    'Двоичные данные фотографии профиля пользователя';

COMMENT ON COLUMN users.avatar_mime_type IS
    'MIME-тип фотографии профиля';

COMMENT ON COLUMN tasks.updated_at IS
    'Дата и время последнего изменения задачи';
