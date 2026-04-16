// ── ForkIt.sol — main.js ─────────────────────────────────────────

// ── Custom Cursor ────────────────────────────────────────────────
(function initCursor() {
  const cursor = document.getElementById('cursor');
  const ring   = document.getElementById('cursorRing');
  if (!cursor || !ring) return;

  let mx = 0, my = 0, rx = 0, ry = 0;

  document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
    cursor.style.left = mx + 'px';
    cursor.style.top  = my + 'px';
  });

  (function animateRing() {
    rx += (mx - rx) * 0.12;
    ry += (my - ry) * 0.12;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(animateRing);
  })();
})();

// ── Nav scroll behaviour ─────────────────────────────────────────
(function initNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  });
})();

// ── Mobile menu ──────────────────────────────────────────────────
(function initMobileMenu() {
  const toggle = document.getElementById('mobileToggle');
  const menu   = document.getElementById('mobileMenu');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    menu.classList.toggle('open');
  });

  // Close on link click
  menu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => menu.classList.remove('open'));
  });
})();

// ── Scroll reveal ────────────────────────────────────────────────
(function initReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add('visible');
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
})();

// ── Escrow progress bar ──────────────────────────────────────────
(function initProgress() {
  const fill     = document.getElementById('progFill');
  const label    = document.getElementById('progLabel');
  const pctEl    = document.getElementById('progPct');
  const sentinel = document.getElementById('escrow-visual');
  if (!fill || !sentinel) return;

  let animated = false;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting && !animated) {
        animated = true;
        animateProgress();
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.4 });

  observer.observe(sentinel);

  function animateProgress() {
    const target   = 20.40;
    const duration = 2000;
    const start    = performance.now();

    function tick(now) {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);
      const current  = eased * target;

      fill.style.width = (eased * 100) + '%';
      if (label) label.textContent = current.toFixed(2) + ' / 20.40 USDC';
      if (pctEl)  pctEl.textContent = Math.round(eased * 100) + '%';

      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
})();

// ── Stat count-up animation ───────────────────────────────────────
(function initStatCountUp() {
  const stats = document.querySelectorAll('.stat-num');
  if (!stats.length) return;

  let animated = false;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting && !animated) {
        animated = true;
        stats.forEach(stat => {
          const text = stat.textContent;
          const match = text.match(/([\d.]+)/);
          if (!match) return;
          const target = parseFloat(match[1]);
          const suffix = stat.querySelector('span');
          const suffixText = suffix ? suffix.textContent : '';
          const isDecimal = text.includes('.');
          const duration = 1500;
          const start = performance.now();

          function tick(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = eased * target;
            const display = isDecimal ? current.toFixed(2) : Math.round(current);
            stat.innerHTML = display + '<span>' + suffixText + '</span>';
            if (progress < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        });
        observer.disconnect();
      }
    });
  }, { threshold: 0.4 });

  const statsContainer = document.querySelector('.hero-stats');
  if (statsContainer) observer.observe(statsContainer);
})();

// ── Contributor bars ─────────────────────────────────────────────
(function initContribs() {
  const container = document.getElementById('contribs');
  if (!container) return;

  const data = [
    { name: 'You',   pct: 70, amount: '14.28 USDC', color: '#ff6b35', emoji: '😊' },
    { name: 'Alice', pct: 20, amount: '4.08 USDC',  color: '#14f195', emoji: '👩' },
    { name: 'Bob',   pct: 10, amount: '2.04 USDC',  color: '#9945ff', emoji: '👨' },
  ];

  data.forEach(c => {
    const item = document.createElement('div');
    item.className = 'contrib-item';
    item.innerHTML = `
      <div class="contrib-avatar">${c.emoji}</div>
      <div class="contrib-name">${c.name}</div>
      <div class="contrib-bar-wrap">
        <div class="contrib-bar" style="width:0%;background:${c.color}" data-pct="${c.pct}"></div>
      </div>
      <div class="contrib-amount">${c.amount}</div>
    `;
    container.appendChild(item);
  });

  let animated = false;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting && !animated) {
        animated = true;
        setTimeout(() => {
          document.querySelectorAll('.contrib-bar').forEach(bar => {
            bar.style.width = bar.dataset.pct + '%';
          });
        }, 300);
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.4 });

  observer.observe(container);
})();
