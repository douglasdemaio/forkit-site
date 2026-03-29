# forkit-sol

Landing site for [ForkIt](https://github.com/douglasdemaio/forkit) — the decentralized food delivery protocol on Solana. Built with [Jekyll](https://jekyllrb.com/) and deployed via GitHub Pages.

**Live:** https://forkit.sol

---

## Stack

- **Jekyll 4** — static site generator
- **Sass** — compiled via Jekyll's built-in pipeline (split into `_sass/` partials)
- **Vanilla JS** — cursor, scroll reveal, animated escrow progress bar
- **GitHub Actions** — automatic build + deploy to GitHub Pages on every push to `main`

---

## Local Development

### Prerequisites

- Ruby ≥ 3.0 ([rbenv](https://github.com/rbenv/rbenv) recommended)
- Bundler (`gem install bundler`)

### Setup

```bash
git clone https://github.com/douglasdemaio/forkit-sol.git
cd forkit-sol
bundle install
```

### Run dev server

```bash
bundle exec jekyll serve --livereload
```

Open http://localhost:4000 in your browser. The site auto-reloads on any file change.

### Build for production

```bash
JEKYLL_ENV=production bundle exec jekyll build
# Output is in _site/
```

---

## Project Structure

```
forkit-sol/
├── _config.yml             # Jekyll config (title, plugins, etc.)
├── Gemfile                 # Ruby dependencies
├── index.html              # Main page (Jekyll front matter + HTML)
│
├── _layouts/
│   └── default.html        # Base HTML shell (head, nav, footer)
│
├── _includes/
│   ├── nav.html            # Navigation bar
│   └── footer.html         # Site footer
│
├── _sass/                  # Sass partials (compiled → assets/css/main.css)
│   ├── _variables.scss     # Design tokens, breakpoints
│   ├── _base.scss          # Reset, typography, keyframes
│   ├── _nav.scss           # Navigation styles
│   ├── _hero.scss          # Hero + phone mockup
│   ├── _sections.scss      # How It Works, Roles, Split Pay, Architecture, etc.
│   ├── _components.scss    # Reusable utilities
│   └── _responsive.scss    # Mobile breakpoints
│
├── assets/
│   ├── css/
│   │   └── main.scss       # Sass entry point (Jekyll processes this)
│   └── js/
│       └── main.js         # Cursor, nav scroll, reveal, progress bar, contrib bars
│
└── .github/
    └── workflows/
        └── deploy.yml      # GitHub Actions: build Jekyll → deploy to Pages
```

---

## Deployment (GitHub Pages)

The included GitHub Actions workflow handles everything automatically:

1. Push to `main`
2. Action installs Ruby + Bundler, runs `bundle exec jekyll build`
3. Built `_site/` is deployed to GitHub Pages

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
