# CA Companion

A personal CA Intermediate study manager: subjects and chapters, lecture tracking, daily tasks, revision schedule, mistake log, mock tests, weekly review, and JSON backup.

It is a **personal-use** app. All data is stored in your browser (`localStorage`). There is no server, login, or AI service.

## Run it locally

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install        # download dependencies (first time only)
npm run dev        # start the app, then open the link it prints (usually http://localhost:5173)
```

Other commands:

| Command | What it does |
|---|---|
| `npm test` | Runs the automated logic tests |
| `npm run build` | Creates the production build in `dist/` (what Vercel runs) |
| `npm run preview` | Serves the production build locally |
| `npm run lint` | Checks code for common mistakes |

## Deploy on Vercel

1. Push this repository to GitHub.
2. On vercel.com choose **Add New → Project** and import the repository.
3. Framework preset: **Vite**. Build command `npm run build`, output directory `dist` (both are auto-detected).
4. Deploy. `vercel.json` makes page refreshes work on routes like `/revisions`.

## Folder structure

```
src/
  pages/        one file per screen (Dashboard, Subjects, Tasks, ...)
  features/     forms and modals for each feature
  components/   shared pieces (layout, modal, form field, ...)
  services/     rules and calculations (revision schedule, weekly review, validators)
  data/         storage, backup/import, data functions (repositories), store
  utils/        dates, ids, numbers
  styles/       CSS
tests/          automated tests (vitest)
docs/           data model notes
```

Rule of thumb: screens show things; `services/` decide things; `data/` saves things. Only `data/storage.js` touches `localStorage`.

## Important limitations

- **Data lives only in one browser on one device.** Clearing site data, using a private window, or Safari cleaning unused site data can erase it. Laptop and iPad do **not** sync. Use **Settings → Export** regularly and keep the file somewhere safe.
- `localStorage` is not a secure or multi-user database. Anyone using the same browser profile can read it. Do not store passwords or secrets in this app.
- The starter subject list (six papers) is only a suggestion. **Verify the syllabus and papers for your attempt on icai.org.** No chapters, amendments or exam rules are built into the app.
- Revision gaps (1 / 3 / 7 / 14 days by default) are a simple, editable planning rule. They do not guarantee retention or exam results.
- Weekly-review recommendations are simple rules over your own records, not AI advice.
- Task time and lecture time in the weekly review can overlap if you log the same lecture in both places.
- Mock-test trends appear only with 3 or more saved tests.
- Chapter "questions practised outside lectures" has no date, so it is not counted in weekly question totals.
- Tested in desktop Chromium (including an iPad-width layout). It has not been tested on a physical iPad or in Safari.

## Features deliberately not included

AI chatbot or AI answers, lecture downloading, notifications, accounts, payments, cloud sync.
