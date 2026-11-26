# Training Tracker

A personal gym log for iPhone. It runs as a web app that you add to your Home Screen. It has no backend and no account. Every workout stays in the phone's browser storage (IndexedDB).

- **Workouts.** Log a training day as exercises with sets of weight and reps. Check each set off as you finish it. Start a new day blank, or copy a previous day as the plan.
- **Rest timer.** Tap a preset (1:00, 1:30, 2:00, 3:00) or let it start when you check off a set. The countdown stays above the tab bar on every screen.
- **Dashboard.** See max weight and estimated one-rep max per exercise over time, your heaviest set, and your best estimated set. It also shows workouts and volume for each of the last 12 weeks, workouts this week, workouts in the last 30 days, and your weekly streak.
- **Backup.** Export all data as a JSON file and import it again.
- **Themes.** Settings → Appearance switches between Classic, which follows light or dark mode, and Pixel, a retro RPG look.

## Run it locally

You need Node.js 22 or later.

```sh
npm install
npm run dev
```

Open the URL that Vite prints.

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the dev server. |
| `npm run build` | Typechecks and writes the static site to `dist/`. |
| `npm run preview` | Serves `dist/` locally. |
| `npm test` | Runs the unit tests (Vitest). |
| `npm run test:e2e` | Builds, serves, and runs the Playwright tests in WebKit at iPhone 15 size. |
| `npm run typecheck` | Runs `tsc -b`. |
| `npm run lint` | Runs ESLint. |
| `npm run icons` | Renders `scripts/icon.svg` to the PNG icons in `public/`. |

Before the first `npm run test:e2e` or `npm run icons`, install the browser:

```sh
npx playwright install webkit
```

The screenshot test writes every screen, in light and dark mode and in the pixel theme, to `test-results/screens/`.

## Deploy it as a static site

`npm run build` writes a self-contained site to `dist/`. Asset paths are relative (`base: './'`), so the site works at a domain root or under a sub-path. Any static host works. These two are free.

### GitHub Pages

1. Push the repository to GitHub.
2. In the repository, open **Settings > Pages** and set **Source** to **GitHub Actions**.
3. Add `.github/workflows/pages.yml`:

   ```yaml
   name: Deploy
   on:
     push:
       branches: [main]
   permissions:
     contents: read
     pages: write
     id-token: write
   jobs:
     deploy:
       runs-on: ubuntu-latest
       environment: github-pages
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: 22
         - run: npm ci
         - run: npm run build
         - uses: actions/upload-pages-artifact@v3
           with:
             path: dist
         - uses: actions/deploy-pages@v4
   ```

4. Push to `main`. The site appears at `https://<user>.github.io/<repo>/`.

### Cloudflare Pages

1. In the Cloudflare dashboard, open **Workers & Pages > Create > Pages** and connect the repository.
2. Set **Build command** to `npm run build` and **Build output directory** to `dist`.
3. Save and deploy. The site appears at `https://<project>.pages.dev/`.

## Add it to your Home Screen

1. Open the site in Safari on your iPhone.
2. Tap **Share**, then **Add to Home Screen**.
3. Open the app from its icon. It runs full screen and works offline after the first load.

The rest timer counts from a stored end time. Its countdown stays correct after the phone locks or the app closes. iOS pauses web apps in the background, so the beep plays when you return to the app, not at the moment the rest ends. The beep also follows the silent switch. Wake Lock keeps the screen on while a rest runs, on iOS 16.4 and later.

## Back up your data

Your data exists only on the phone where you logged it. It is not synced anywhere.

- Deleting the Home Screen app, or clearing Safari website data, deletes your workouts.
- Safari can evict storage for sites you have not opened in weeks. The app asks for persistent storage, but Safari can refuse.
- Workouts logged in the Home Screen app and workouts logged in a Safari tab are stored separately.

Export a backup regularly. Open **Settings > Backup > Export backup (JSON)** and save the file to Files or iCloud Drive. To restore, tap **Import backup…** and pick the file. Import replaces all data on the phone. The app asks you to confirm first, and it rejects a file that does not validate.

## How the code is organized

- `src/domain/` holds pure TypeScript with no browser or React code. It has the data types, the reducer that makes every state change, the stats, the rest timer state machine, and backup validation. Unit tests live next to each file.
- `src/store/` loads and saves the app state in IndexedDB and keeps the rest timer in `localStorage`.
- `src/ui/` holds the React screens and components. Charts are hand-written SVG.
- `e2e/` holds the Playwright tests and the fixture that the screenshot test imports.
