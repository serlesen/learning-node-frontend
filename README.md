# Brick Shop API

A browser-only playground where students learn backend development with Node.js and Express by writing the API of
a toy brick shop. The lesson and the `server.js` editor are on the left; on the right are an HTTP client (a small
Postman), the database tables, the server log and the list of checks. Each of the 20 steps explains one idea, runs
the code as a live server, checks it with real requests and offers hints.

It is the backend companion of [Brick Shop](https://learning-js.sergiolema.dev) (JavaScript) and
[Brick by Brick SQL](https://learning-sql.sergiolema.dev), with the same design and the same shop database.

| Steps | Concept | What the student builds |
| --- | --- | --- |
| 1–2 | routes, `res.json` | `GET /hello`, then `GET /shop` answering JSON |
| 3–5 | `GET`, `req.query`, `req.params` | the list of bricks, a color filter, one brick (`'2'` vs `2`) |
| 6 | status codes | `404` for a missing brick, and `return` so only one answer is sent |
| 7–8 | `POST`, validation | create a brick (`express.json()`, `201`), refuse a bad one (`400`) |
| 9–11 | `PUT`, `PATCH`, `DELETE` | replace, merge, remove (`204`) |
| 12 | REST | `/getOrdersOfBrick?brickId=1` becomes `/bricks/1/orders` |
| 13–15 | middleware | a request logger (`next()`), an API key (`401` / `403`), an error handler (`500`) |
| 16–19 | SQL | `await db.all`, `?` placeholders against SQL injection, `INSERT`, `UPDATE` / `DELETE` with `WHERE` |
| 20 | `fetch` | the shop page calls the API: the student fulfils its contract |

Steps 1 to 15 keep the data in an array, steps 16 to 20 in SQLite: the `bricks` and `orders` tables of the SQL
playground, shown in the database panel.

The interface and the lessons are available in English (default), French, Spanish, Italian and German, picked
from the selector at the right of the top bar. The code, the API (paths, JSON fields, messages) and the shop page
stay in English.

There is no backend: progress, code, hints and the chosen language are saved in the browser's `localStorage`.

## Run it

Requires Node.js 20.19+ (or 22.12+).

```sh
npm install
npm run dev        # http://localhost:5173 (also exposed on the network)
npm test           # unit and component tests (vitest + Testing Library, jsdom)
npm run lint       # eslint
npm run build      # static files in dist/
npm run preview    # serves dist/ on http://localhost:4173
```

`dist/` is a static site: it can be served by any web server, no runtime configuration needed.

## Deployment

Every push to `main` runs `.github/workflows/deploy.yml`: lint, tests and build, then `dist/` is published to
GitHub Pages at https://learning-node.sergiolema.dev.

One-time setup:

- DNS: a `CNAME` record `learning-node` → `thedevworldsergiolema.github.io.`
- GitHub, repo **Settings → Pages**: source **GitHub Actions**, custom domain `learning-node.sergiolema.dev`,
  then **Enforce HTTPS** once the certificate is issued

## Stack

- React 19, built with Vite
- CodeMirror 6 (`@uiw/react-codemirror`) for `server.js` and the read-only `shop.js`
- sql.js (SQLite compiled to WebAssembly) for the database of steps 16 to 20
- zustand for the application state
- i18next / react-i18next for every user-facing text (English, French, Spanish, Italian, German)
- SCSS for the styles, with the design tokens in `src/styles`
- Vitest, Testing Library and jsdom for the tests

## Architecture

```
src/
├── main.jsx            entry point: loads i18n and the global styles, renders the view
├── components/         root components, shared by every feature
│   ├── button/         Button (primary, secondary, quiet)
│   ├── icons/          SVG icons as React components, drawn with currentColor
│   ├── language-select/ LanguageSelect: switches and saves the interface language
│   ├── rich-text/      RichText: text where `backticks` mark inline code
├── hooks/              useDebounced (restart once typing stops), useErrorText (translated run errors),
│                       useCodeComments (translated code comments), useSqlEngine (loads sql.js),
│                       useLiveServer (the running server), useChecks (runs the checks of the step)
├── i18n/               i18next setup and locales/<en|fr|es|it|de>/translation.json
├── layout/             PublicLayout: top bar with the brand, the step strip and the language selector; Footer
├── services/           progressService and languageService (localStorage), sqlEngine (loads SQLite once)
├── stores/             progressStore (zustand): current step, completed steps, code and hints per step
├── styles/             _config.scss (tokens), _typography.scss, _mixins.scss, global.scss
├── test/               shared test setup, render helper, loadTestEngine (sql.js from node_modules)
├── types/              enums (HttpMethod, Outcome, LogKind, LogLevel, Notice, RunError, CheckStatus, EditorTab,
│                       ClientTab, CharKind, ButtonVariant, Language, FooterLink) and JSDoc entities
├── utils/              express (the Express-style app and router), request and response (req, res), server
│                       (runs server.js), database (the db the code requires), checks, body, statusText, host,
│                       loopGuard and scan (stop endless loops), formatValue (console output), codeComments
└── views/
    └── playground/     the only page, its components grouped by feature
        ├── PlaygroundView.jsx
        ├── levels.js   the 20 steps: starter code, solution, example, ready-made requests, checks
        ├── shopDatabase.js the bricks and orders tables
        ├── check/      CheckList: passed checks, errors, success
        ├── client/     HttpClient: method, URL, body, headers, ready-made requests, the response
        ├── database/   DatabasePanel and ResultTable: the tables of the running server
        ├── editor/     CodeEditor: server.js (and shop.js in the last step), Run and Start over
        ├── lesson/     LessonPanel: explanation, goal, hints, solution
        ├── log/        ServerLog: restarts, requests and their status, console output, errors
        ├── shop/       BrowserWindow, ShopPreview and shopPage (shop.js and its texts) for the last step
        └── steps/      StepStrip: the 20 steps in the top bar
```

### Data flow

```
progressStore ──► PlaygroundView ──► LessonPanel, CodeEditor ──(edits)──► progressStore ──► progressService (localStorage)
                        │
                        │  code, 600ms after the last keystroke (or on Run / Ctrl+Enter)
                        ├──► startServer ──► live server ◄── HttpClient, ShopPreview ──► ServerLog, DatabasePanel
                        └──► runChecks (a fresh server per check) ──► CheckResult[] ──► CheckList (+ step completed)
```

### How the student's server runs

There is no Node.js in the browser: `src/utils/express.js` implements the part of Express the lessons use, with
the same API and the same behavior.

- `startServer` (`src/utils/server.js`) runs `server.js` once with `new Function`, giving it `require`
  (`'express'` and `'./db'` only, anything else throws `Cannot find module` like Node), `module`, `console` (sent
  to the server log) and `process.env`. Browser globals (`window`, `document`, `localStorage`, `fetch`…) are
  hidden, as in Node. Loops are guarded (`src/utils/loopGuard.js`): one running more than 100,000 turns is stopped
  with a `RunError.InfiniteLoop` instead of freezing the tab.
- The app is the one `listen` was called on (or the first one created). `app.get/post/put/patch/delete/all/use`,
  `express.json()`, `express.Router()`, route-level middleware and error handlers (four parameters) work as in
  Express 5: thrown errors and rejected promises go to the error handlers, the default one answers `500` with the
  error, an unknown route answers `404 Cannot GET /path`.
- `req` has `method`, `path`, `params`, `query`, `body` (only after `express.json()`), `headers` and `get()`;
  `res` has `status`, `json`, `send`, `sendStatus`, `set`, `end`… Sending a second answer throws
  `Cannot set headers after they are sent to the client`, which goes to the log.
- A handler that neither answers nor calls `next()` ends the request with `Outcome.NoResponse`, and an `async`
  one that takes more than 2 seconds with `Outcome.Timeout`: the client explains why, instead of waiting forever.
- `require('./db')` gives a fresh copy of the shop database (`src/utils/database.js`), opened on the first query
  and closed when the server restarts, with a promise-based API:
  `all`, `get` and `run` (which resolves with `changes` and `lastInsertRowid`), values in `?` placeholders.

The live server keeps its state (the arrays, the database) between the requests of the client, until the code
changes or Run restarts it.

### How a step is checked

Each check of the step (`levels.js`) starts a fresh server from the code, with fresh data, then sends it requests
through a `CheckContext` (`get`, `post`, `put`, `patch`, `delete`, `request`) and reads the answers (`status`,
`headers`, `body`, `json`), what the code logged, the errors Express reported, the database (`query`) and the code
without its comments. A failed check shows the first error the server logged.

Because checks look at the answers, any code that produces them passes, except where a step asks for a given
technique (a `?` placeholder).

### Styles

Every color, spacing, radius, shadow and breakpoint is a token in `src/styles/_config.scss`, every font
family, size, weight and line height in `src/styles/_typography.scss`. Each component has its own
`.scss` file next to it, which `@use`s them (Vite adds `src/styles` to the SCSS load paths, so
`@use 'config' as *;` works from anywhere). The CodeMirror theme is defined in JS, so the few tokens
it needs are exposed as CSS custom properties in `global.scss`.

## Adding or changing a step

- Code lives in `src/views/playground/levels.js`: the starter `js`, the `solution`, an optional `example`, the
  `concept` (a key of `concepts` in the translations), `database` when the code uses `require('./db')`, `shop` for
  the shop page, the ready-made `requests` of the client and the `checks`: `{ key, test(ctx) }`, async.
- Texts live in every `src/i18n/locales/<language>/translation.json` under `levels.<id>`: `title`, `intro`
  (paragraphs), `goal`, progressive `hints`, the `recap` shown on success and one label per check under `checks`.
  They accept `` `inline code` ``, which must stay identical in every language.
- Comments in the code are written as `// {{key}}` placeholders and translated under `codeComments.<key>`
  (`fillComments` in `src/utils/codeComments.js`), so the starter code, examples and solutions follow the
  chosen language.

`levels.test.js` runs every step: the solution must pass every check, the starter must fail at least one
without crashing, and every text must exist in every language. `locales.test.js` checks that every language has the
same keys, placeholders, inline code and tags as English.

## Contributing

Contributions are welcome: see [CONTRIBUTING.md](CONTRIBUTING.md). To report a vulnerability, see
[SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © Sergio Lema
