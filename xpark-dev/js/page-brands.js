(function () {
  const BRANDS = window.XPARK_BRANDS || [];
  let activeTier = '全部';
  let activeCat = '全部';
  let searchQuery = '';

  const tierLabels = { A: 'A档 · 锚点', B: 'B档 · 主力', C: 'C档 · 填铺', D: 'D档 · 机会' };

  function renderSummary() {
    const el = document.getElementById('brands-summary');
    if (!el || !BRANDS.length) return;
    const tiers = ['A', 'B', 'C', 'D'].map((t) => ({
      t,
      n: BRANDS.filter((b) => b.tier === t).length,
    }));
    el.innerHTML = tiers
      .map(({ t, n }) => `<span class="tier-pill tier-${t.toLowerCase()}">${tierLabels[t]} <strong>${n}</strong></span>`)
      .join('');
  }

  function renderFilters() {
    const tierWrap = document.getElementById('tier-filter');
    const catWrap = document.getElementById('cat-filter');
    if (!tierWrap || !catWrap) return;

    const tiers = ['全部', 'A', 'B', 'C', 'D'];
    tierWrap.innerHTML = tiers
      .map((t) => {
        const label = t === '全部' ? '全部分档' : tierLabels[t] || t;
        return `<span class="badge ${t === '全部' ? 'lime active' : 'ink-outline'}" data-tier="${t}">${label}</span>`;
      })
      .join('');

    const cats = ['全部', ...new Set(BRANDS.map((b) => b.cat))];
    catWrap.innerHTML = cats
      .map((c) => `<span class="badge ${c === '全部' ? 'lime active' : 'ink-outline'}" data-cat="${c}">${c}</span>`)
      .join('');

    tierWrap.querySelectorAll('.badge').forEach((badge) => {
      badge.addEventListener('click', () => {
        tierWrap.querySelectorAll('.badge').forEach((b) => b.classList.remove('active', 'lime'));
        badge.classList.add('active', 'lime');
        activeTier = badge.dataset.tier;
        applyFilters();
      });
    });

    catWrap.querySelectorAll('.badge').forEach((badge) => {
      badge.addEventListener('click', () => {
        catWrap.querySelectorAll('.badge').forEach((b) => b.classList.remove('active', 'lime'));
        badge.classList.add('active', 'lime');
        activeCat = badge.dataset.cat;
        applyFilters();
      });
    });
  }

  function renderBrands() {
    const grid = document.getElementById('brands-grid');
    if (!grid) return;

    grid.innerHTML = BRANDS.map((b) => `
      <article class="card card-vert brand-card" data-tier="${b.tier}" data-category="${b.cat}" data-search="${[b.name, b.cat, b.subcat, b.probDesc, b.tier].join(' ').toLowerCase()}">
        <div class="card-media photo-media">
          <img class="photo-bg" src="../assets/images/${b.photo}" alt="${b.name}" loading="lazy">
          <div class="logo-overlay brand-logo-box">
            <img src="../assets/${b.logo}" alt="${b.name} logo">
          </div>
        </div>
        <div class="card-body">
          <div class="brand-meta">
            <h3 class="xpark-h4">${b.name}</h3>
            <span class="badge ${b.tierTag} tier-badge">${b.tier}档</span>
          </div>
          <div class="brand-tags">
            <span class="badge ink-outline">${b.cat}</span>
            <span class="badge ${b.probTag}">招商${b.prob}</span>
          </div>
          <p class="xpark-caption brand-floor mono">${b.floor} · ${b.area}</p>
          <p class="xpark-caption brand-desc">${b.probDesc}</p>
        </div>
      </article>
    `).join('');

    applyFilters();
    updateCount();
  }

  function applyFilters() {
    document.querySelectorAll('.brand-card').forEach((card) => {
      const tier = card.dataset.tier;
      const cat = card.dataset.category;
      const searchText = card.dataset.search || '';
      const matchTier = activeTier === '全部' || tier === activeTier;
      const matchCat = activeCat === '全部' || cat === activeCat;
      const q = searchQuery;
      const matchSearch = !q || searchText.includes(q);
      card.classList.toggle('is-hidden', !(matchTier && matchCat && matchSearch));
    });
    updateCount();
  }

  function updateCount() {
    const el = document.getElementById('brand-count');
    if (!el) return;
    const visible = document.querySelectorAll('.brand-card:not(.is-hidden)').length;
    el.textContent = `显示 ${visible} / ${BRANDS.length} 个品牌`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderSummary();
    renderFilters();
    renderBrands();

    document.getElementById('brand-search')?.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      applyFilters();
    });
  });
})();
