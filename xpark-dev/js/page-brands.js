(function () {
  const BRANDS = [
    { id: '01', name: 'NORI', cat: '餐饮', floor: 'L1 · A01', desc: '日式轻食 · 餐饮', img: 'brand-01-nori.svg', tag: 'lime', label: '餐饮' },
    { id: '02', name: 'PIXEL', cat: '零售', floor: 'L2 · B03', desc: '独立游戏 · 零售', img: 'brand-02-pixel.svg', tag: 'lime', label: '零售' },
    { id: '03', name: 'ROAST', cat: '餐饮', floor: 'L1 · A05', desc: '精品咖啡 · 餐饮', img: 'brand-03-roast.svg', tag: 'coral', label: '热门' },
    { id: '04', name: 'LOOM', cat: '零售', floor: 'L2 · B01', desc: '可持续服饰 · 零售', img: 'brand-04-loom.svg', tag: 'lime', label: '零售' },
    { id: '05', name: 'WAVE', cat: '生活方式', floor: 'L3 · C02', desc: '冲浪生活 · 生活方式', img: 'brand-05-wave.svg', tag: 'lime', label: '生活方式' },
    { id: '06', name: 'ATELIER', cat: '设计', floor: 'L2 · B08', desc: '设计工作室 · 设计', img: 'brand-06-atelier.svg', tag: 'lime', label: '设计' },
    { id: '07', name: 'BLOOM', cat: '零售', floor: 'L1 · A12', desc: '花艺美学 · 零售', img: 'brand-07-bloom.svg', tag: 'lime', label: '零售' },
    { id: '08', name: 'VINYL', cat: '零售', floor: 'L2 · B15', desc: '黑胶唱片 · 零售', img: 'brand-08-vinyl.svg', tag: 'coral', label: 'NEW' },
    { id: '09', name: 'GRAIN', cat: '餐饮', floor: 'L1 · A08', desc: '天然面包 · 餐饮', img: 'brand-09-grain.svg', tag: 'lime', label: '餐饮' },
    { id: '10', name: 'ARC', cat: '设计', floor: 'L3 · C05', desc: '建筑画廊 · 设计', img: 'brand-10-arc.svg', tag: 'lime', label: '设计' },
    { id: '11', name: 'KITE', cat: '生活方式', floor: 'L3 · C08', desc: '户外装备 · 生活方式', img: 'brand-11-kite.svg', tag: 'lime', label: '生活方式' },
  ];

  let activeCat = '全部';
  let searchQuery = '';

  function renderBrands() {
    const grid = document.getElementById('brands-grid');
    if (!grid) return;

    grid.innerHTML = BRANDS.map((b) => `
      <article class="card card-vert brand-card" data-category="${b.cat}" data-name="${b.name.toLowerCase()}">
        <div class="card-media"><img src="../assets/${b.img}" alt="${b.name}"></div>
        <div class="card-body">
          <div class="brand-meta">
            <h3 class="xpark-h4">${b.name}</h3>
            <span class="brand-floor mono">${b.floor}</span>
          </div>
          <div style="display:flex;gap:8px;align-items:center;margin:8px 0 4px">
            <span class="badge ${b.tag}">${b.label}</span>
          </div>
          <p class="xpark-caption">${b.desc}</p>
          <a href="#" class="cta-link" style="margin-top:12px;display:inline-flex">查看详情</a>
        </div>
      </article>
    `).join('');

    applyFilters();
  }

  function applyFilters() {
    document.querySelectorAll('.brand-card').forEach((card) => {
      const cat = card.dataset.category;
      const name = card.dataset.name;
      const matchCat = activeCat === '全部' || cat === activeCat;
      const matchSearch = !searchQuery || name.includes(searchQuery) || cat.includes(searchQuery);
      card.classList.toggle('is-hidden', !(matchCat && matchSearch));
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderBrands();

    document.querySelectorAll('.brands-filter .badge').forEach((badge) => {
      badge.addEventListener('click', () => {
        document.querySelectorAll('.brands-filter .badge').forEach((b) => b.classList.remove('active'));
        badge.classList.add('active');
        activeCat = badge.textContent.trim();
        applyFilters();
      });
    });

    document.getElementById('brand-search')?.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      applyFilters();
    });
  });
})();
