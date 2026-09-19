# SAFROSE — safrose.tj

Сайт натуральных гидролатов: React + Vite, каталог, RU/TJ, админка.
Живая версия: https://safrose.vercel.app

## Запуск локально

```bash
npm install
npm run build
npm start        # http://localhost:4173 (сайт + API + админка)
```

`npm run dev` запускает только фронтенд (без API/админки).

## Админка

Вход: замок в шапке (компьютер) или бургер-меню (телефон), либо `/#admin`.
Первый пароль задаётся переменной окружения `ADMIN_PASSWORD` (на Vercel: Settings → Environment Variables;
локально: строка `ADMIN_PASSWORD=...` в файле `.env.local`, он не попадает в git). При первом входе пароль
сохраняется в базе в виде хеша, дальше его меняют во вкладке «Пароль» (переменная после этого уже не нужна).
Если переменная не задана и пароль ещё не сохранён — войти нельзя.
Можно менять: продукты (фото, тексты RU/TJ, порядок, скрыть/показать, добавить/удалить), контакты, пароль.

## Где что лежит

- `src/` — сайт (`App.jsx`, `Admin.jsx`, тексты интерфейса в `i18n.js`, стартовый контент в `content.default.js`)
- `lib/` — серверная логика (`handlers.js` — API, `store.js` — хранилище)
- `api/` — функции Vercel (тонкие обёртки над `lib/handlers.js`)
- `server.mjs` — локальный сервер (то же API, данные в `data/store.json`)
- `public/images/` — фото и логотип

## Деплой на Vercel

```bash
npx vercel deploy --prod
```

Для сохранения правок из админки нужна база **Upstash Redis**, подключённая к проекту
(переменные `KV_REST_API_URL` и `KV_REST_API_TOKEN` добавляются автоматически через
Vercel → Storage → Upstash for Redis → Connect to Project). Без неё админка откажется
сохранять изменения.

Домен `safrose.tj`: Vercel → проект → Settings → Domains, затем записи DNS у регистратора.
