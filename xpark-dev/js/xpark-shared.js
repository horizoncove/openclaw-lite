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

  function initNav() {
    document.querySelectorAll('.nav-toggle').forEach((toggle) => {
      const links = toggle.closest('.nav')?.querySelector('.nav-links');
      if (!links) return;
      toggle.addEventListener('click', () => links.classList.toggle('open'));
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
