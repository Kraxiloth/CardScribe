# CardScribe

**Sorcery: Contested Realm — Discord Trade Ad Builder**

Live at [cardscribe.sorcery.no](https://cardscribe.sorcery.no)

CardScribe helps Sorcery: CR players build clean, consistent Discord trade listings in seconds. Paste your card list in any format, review and price your cards, fill in your seller info, and generate a ready-to-post Discord ad.

---

## Features

- Paste cards in freehand format — quantities, conditions, finishes, set names all parsed automatically
- Fuzzy card name matching against the full Sorcery card database (1,100+ cards)
- Review table with editable quantity, condition, finish, set, and price per card
- Selling, Buying, and Trading listing types with appropriate field sets
- One-click Discord-ready ad generation with raw + preview modes
- $250+ photo reminder (per community rules)
- Fully offline — no backend, card database embedded

## Development

```bash
npm install
npm run dev        # local dev server at localhost:5173
npm run build      # build to dist/
npm run typecheck  # TypeScript check without building
```

## Deployment

Build locally, then copy the contents of `dist/` to the repo root and push to `main`:

```bash
npm run build
cp -r dist/* .
git add -A
git commit -m "Deploy"
git push
```

## Stack

- React 19 + TypeScript
- Vite 6
- Tailwind CSS 3
- Zustand (state management)
- Fuse.js (fuzzy card matching)

## Card Database

The card database is sourced from the [Sorcery TCG public API](https://api.sorcerytcg.com/) and embedded at build time as `src/data/cards.json`. To refresh it against the latest API response, replace that file and rebuild.

## License

MIT
