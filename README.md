# ForkIt — Decentralized Food Delivery on Solana

Landing site for [ForkIt](https://github.com/douglasdemaio/forkit) — the decentralized food delivery protocol on Solana. Built with [Zola](https://www.getzola.org/) and deployed via GitHub Pages.

**Live:** [douglasdemaio.github.io/forkit-site](https://douglasdemaio.github.io/forkit-site/)

---

## Stack

- **Zola** — fast Rust-based static site generator
- **Sass** — compiled natively by Zola (split into `sass/` partials)
- **Tera Templates** — Zola's template engine
- **Vanilla JS** — cursor, scroll reveal, animated escrow progress bar, stat count-ups
- **GitHub Actions** — automatic build + deploy to GitHub Pages on every push to `main`

---

## Local Development

### Prerequisites

- [Zola](https://www.getzola.org/documentation/getting-started/installation/) ≥ 0.19

### Setup

```bash
git clone https://github.com/douglasdemaio/forkit-site.git
cd forkit-site
```

### Run dev server

```bash
zola serve
```

Open http://127.0.0.1:1111 in your browser. The site auto-reloads on any file change.

### Build for production

```bash
zola build
# Output is in public/
```

---

## Project Structure

```
forkit-site/
├── config.toml             # Zola config (base_url, title, sass, etc.)
├── content/
│   └── _index.md           # Main page content entry point
│
├── templates/
│   ├── base.html           # Base HTML shell (head, nav, footer)
│   ├── index.html          # Main page template (extends base)
│   └── partials/
│       ├── nav.html        # Navigation bar
│       └── footer.html     # Site footer
│
├── sass/                   # Sass partials (compiled → public/main.css)
│   ├── main.scss           # Sass entry point
│   ├── _variables.scss     # Design tokens, breakpoints
│   ├── _base.scss          # Reset, typography, keyframes
│   ├── _nav.scss           # Navigation styles
│   ├── _hero.scss          # Hero + phone mockup
│   ├── _sections.scss      # How It Works, Roles, Split Pay, Architecture, etc.
│   ├── _components.scss    # Reusable utilities
│   └── _responsive.scss    # Mobile breakpoints
│
├── static/
│   └── js/
│       └── main.js         # Cursor, nav scroll, reveal, progress bar, contrib bars
│
└── .github/
    └── workflows/
        └── deploy.yml      # GitHub Actions: build Zola → deploy to Pages
```

---

## Deployment (GitHub Pages)

The included GitHub Actions workflow handles everything automatically:

1. Push to `main`
2. Action installs Zola 0.19.2, runs `zola build`
3. Built `public/` is deployed to GitHub Pages

To enable GitHub Pages for the repo:

1. Go to **Settings → Pages**
2. Set **Source** to **GitHub Actions**
3. That's it — the workflow takes over on the next push

---

## Related Repos

| Repo | Description |
|------|-------------|
| [forkit](https://github.com/douglasdemaio/forkit) | Protocol — Solana programs, Express backend, Next.js frontend |
| [forkme](https://github.com/douglasdemaio/forkme) | Mobile companion — React Native (Expo), iOS/Android/Seeker |

---

## License

MIT
