(function () {
  const BRANDS = window.XPARK_BRANDS || [];
  const grid = document.getElementById('home-brand-preview');
  if (!grid || !BRANDS.length) return;

  const featured = BRANDS.filter((b) => b.tier === 'A').slice(0, 4);
  grid.innerHTML = featured
    .map(
      (b) => `
      <a href="brands.html" class="card card-vert brand-card brand-card--preview">
        <div class="brand-logo-panel">
          <img src="../assets/${b.logo}" alt="${b.name}" loading="lazy">
        </div>
        <div class="card-body">
          <span class="badge ${b.tierTag}">${b.tier}档 · ${b.cat}</span>
          <h3 class="xpark-h4" style="margin:8px 0 4px">${b.name}</h3>
          <p class="xpark-caption mono">${b.floor} · ${b.area}</p>
        </div>
      </a>`
    )
    .join('');
})();
