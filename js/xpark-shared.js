(function () {
  const html = document.documentElement;

  function initTheme() {
    const saved = localStorage.getItem('xpark-theme');
    if (saved === 'dark') html.classList.add('dark');

    document.querySelectorAll('.theme-toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        html.classList.toggle('dark');
        localStorage.setItem('xpark-theme', html.classList.contains('dark') ? 'dark' : 'light');
        btn.textContent = html.classList.contains('dark') ? '☀️' : '🌙';
      });
      btn.textContent = html.classList.contains('dark') ? '☀️' : '🌙';
    });
  }

  function closeNav(nav, toggle) {
    nav?.classList.remove('open');
    toggle?.classList.remove('open');
    document.body.classList.remove('nav-open');
  }

  function initNav() {
    document.querySelectorAll('.nav').forEach((navEl) => {
      const toggle = navEl.querySelector('.nav-toggle');
      const links = navEl.querySelector('.nav-links');
      if (!toggle || !links) return;

      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = links.classList.toggle('open');
        toggle.classList.toggle('open', isOpen);
        document.body.classList.toggle('nav-open', isOpen);
      });

      links.querySelectorAll('a').forEach((a) => {
        a.addEventListener('click', () => closeNav(links, toggle));
      });
    });

    document.addEventListener('click', (e) => {
      if (e.target.closest('.nav')) return;
      document.querySelectorAll('.nav-links.open').forEach((nav) => {
        const toggle = nav.closest('.nav')?.querySelector('.nav-toggle');
        closeNav(nav, toggle);
      });
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 1024) {
        document.querySelectorAll('.nav-links.open').forEach((nav) => {
          const toggle = nav.closest('.nav')?.querySelector('.nav-toggle');
          closeNav(nav, toggle);
        });
      }
    });

    const path = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a').forEach((a) => {
      const href = a.getAttribute('href');
      if (href === path || (path === '' && href === 'index.html')) {
        a.classList.add('active');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNav();
  });
})();
