(function () {
  const SCALES = {
    primary: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900],
    coral: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900],
    ink: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900],
    cream: [50, 100, 200, 300],
    success: [50, 500, 900],
    warning: [50, 500, 900],
    error: [50, 500, 900],
    info: [50, 500, 900],
  };

  function renderScale(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const family = containerId.replace('scale-', '');
    const weights = SCALES[family];
    if (!weights) return;

    el.innerHTML = weights.map((w) => {
      const token = `--xpark-${family}-${w}`;
      const style = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
      return `
        <div class="scale-swatch">
          <div class="chip" style="background:var(${token})"></div>
          <div class="meta">
            <div class="weight">${w}</div>
            <div class="token">${token}</div>
            <div class="hex">${style || ''}</div>
          </div>
        </div>`;
    }).join('');
  }

  function renderSpacing() {
    const el = document.getElementById('token-spacing');
    if (!el) return;
    const items = [
      [1, 4], [2, 8], [3, 12], [4, 16], [5, 24], [6, 32], [7, 48], [8, 64],
    ];
    el.innerHTML = items.map(([n, px]) => `
      <div class="spacing-row">
        <span class="spacing-label">--space-${n}</span>
        <div class="spacing-bar" style="width:${px}px"></div>
        <span class="spacing-label">${px}px</span>
      </div>
    `).join('');
  }

  document.addEventListener('DOMContentLoaded', () => {
    ['primary', 'coral', 'ink', 'cream', 'success', 'warning', 'error', 'info'].forEach((name) => {
      renderScale(`scale-${name}`);
    });
    renderSpacing();
  });
})();
