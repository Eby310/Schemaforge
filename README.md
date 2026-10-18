# SchemaForge — Visual Database Schema Designer

SchemaForge is a client-side visual database schema designer built with vanilla HTML, CSS, and modern JavaScript. It has zero external library dependencies, requires no compilation or build step to run statically, and deploys directly to Vercel, GitHub Pages, or any static hosting provider.

## Key Features

- **Infinite Canvas & Touch Controls**: Pan smoothly by dragging or holding Space, zoom from 25% to 200% centered on cursor/pinch with mouse wheel or touch gestures, and jump around with the interactive minimap.
- **Table & Column Management**: Draggable cards with 8-color theme headers, inline double-click renaming, custom types mapped across dialects, Primary Key, Foreign Key, Auto-increment, Unique, Nullable, Default values, and descriptions.
- **Relationships & Crow's Foot Notation**: Drag or tap connector dots to create relationships with live curved Bézier paths. Supports One-to-Many (`1:N`), One-to-One (`1:1`), and Many-to-Many (`N:M`) with 1-click junction table generation, configurable `ON DELETE` and `ON UPDATE` actions, and type compatibility checking.
- **Multi-Dialect SQL Export & Import**:
  - Full support for **PostgreSQL**, **MySQL**, and **SQLite**.
  - Dependency-ordered DDL generation using topological sorting.
  - SQL DDL parser to import existing databases directly onto the canvas.
  - Export as high-resolution PNG, infinite-zoom SVG, and JSON project files.
- **Productivity & Safety**:
  - Over 50 steps of undo/redo history (`Ctrl/Cmd + Z`, `Ctrl/Cmd + Shift + Z`).
  - Automated hierarchical graph layout algorithm.
  - Schema health inspection warning about missing primary keys, unindexed relations, or type mismatches.
  - URL hash sharing: diagrams are compressed directly into the shareable link with no backend required.
  - Command palette (`Ctrl/Cmd + K`) for keyboard-driven workflows.
  - Dark mode first with light mode toggle and mobile responsive bottom sheets.

## Running Locally

Because SchemaForge uses vanilla HTML, CSS, and JavaScript with standard ES modules, you can serve it with any local static server:

```bash
# Option 1: Python
python3 -m http.server 3000

# Option 2: Node.js (npx serve)
npx serve .

# Option 3: Vite Dev Server (already configured)
npm run dev
```

Then open `http://localhost:3000` in your web browser.

## Deploying to Vercel

### Deploy from GitHub (Zero Build Step)
1. Push this repository to GitHub.
2. In the [Vercel Dashboard](https://vercel.com/new), import your GitHub repository.
3. In **Project Settings**:
   - **Framework Preset**: Select **Other** (or leave default).
   - **Root Directory**: `./`
   - **Build Command**: Leave empty (or override with no command).
   - **Output Directory**: Leave empty.
4. Click **Deploy**. Vercel will serve `index.html`, `style.css`, and `app.js` directly on its global edge network.

### Deploy with Vercel CLI
```bash
npx vercel
```
