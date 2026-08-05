(function () {
  const BRANDS = window.XPARK_BRANDS || [];
  let activeMacro = '全部';
  let searchQuery = '';

  const MACRO_ORDER = [
    '娱乐 Hub',
    '办公商务',
    '酒店生活',
    '中央连接',
    '方形广场',
    '地标广场',
    '西侧配套',
  ];

  const MACRO_COLORS = {
    '娱乐 Hub': '#FF8C42',
    '办公商务': '#2D8CFF',
    '酒店生活': '#22B43C',
    '中央连接': '#94A3B8',
    '方形广场': '#FF5436',
    '地标广场': '#F5C518',
    '西侧配套': '#6B7280',
  };

  function init() {
    renderMeta();
    renderFilters();
    render();
    document.getElementById('btn-print')?.addEventListener('click', () => window.print());
    document.getElementById('placement-search')?.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      render();
    });
  }

  function renderMeta() {
    const el = document.getElementById('placement-meta');
    if (!el) return;
    const street = BRANDS.filter((b) => !b.zone?.includes('非街铺')).length;
    el.innerHTML = `
      <span>项目体量 <strong>8000㎡ 街铺（1F–2F）</strong></span>
      <span>品牌总数 <strong>${BRANDS.length}</strong></span>
      <span>街铺招商 <strong>${street}</strong></span>
      <span>更新日期 <strong>${new Date().toLocaleDateString('zh-CN')}</strong></span>`;
  }

  function renderFilters() {
    const el = document.getElementById('placement-filters');
    if (!el) return;
    const labels = ['全部', ...MACRO_ORDER.filter((m) => BRANDS.some((b) => b.macroLabel === m))];
    el.innerHTML = labels.map((label) =>
      `<span class="badge ${label === '全部' ? 'lime active' : 'ink-outline'}" data-macro="${label}">${label}</span>`
    ).join('');
    el.querySelectorAll('.badge').forEach((badge) => {
      badge.addEventListener('click', () => {
        el.querySelectorAll('.badge').forEach((b) => b.classList.remove('active', 'lime'));
        badge.classList.add('active', 'lime');
        activeMacro = badge.dataset.macro;
        render();
      });
    });
  }

  function filteredBrands() {
    return BRANDS.filter((b) => {
      const matchMacro = activeMacro === '全部' || b.macroLabel === activeMacro
        || (activeMacro === '方形广场' && b.macroLabel === '中央连接');
      const text = [b.name, b.cat, b.subcat, b.tier, b.zone, b.building, b.macroLabel, b.area, b.floor].join(' ').toLowerCase();
      const matchSearch = !searchQuery || text.includes(searchQuery);
      return matchMacro && matchSearch;
    });
  }

  function renderSummary(list) {
    const el = document.getElementById('placement-summary');
    if (!el) return;
    const tiers = ['A', 'B', 'C', 'D'].map((t) => ({
      t,
      n: list.filter((b) => b.tier === t).length,
    }));
    el.innerHTML = `
      <p class="xpark-caption">当前显示 <strong>${list.length}</strong> / ${BRANDS.length} 个品牌</p>
      <div class="placement-tier-pills">${tiers.map(({ t, n }) => `<span class="tier-pill tier-${t.toLowerCase()}">${t}档 ${n}</span>`).join('')}</div>`;
  }

  function render() {
    const list = filteredBrands();
    renderSummary(list);
    const content = document.getElementById('placement-content');
    if (!content) return;

    const groups = {};
    list.forEach((b) => {
      const key = b.macroLabel || '待定';
      groups[key] = groups[key] || [];
      groups[key].push(b);
    });

    const order = activeMacro === '全部'
      ? MACRO_ORDER.filter((m) => groups[m]?.length)
      : [activeMacro];

    content.innerHTML = order.map((macro) => {
      const brands = (groups[macro] || []).sort((a, b) => {
        const zb = (a.building || '').localeCompare(b.building || '', 'zh-CN');
        if (zb !== 0) return zb;
        return (a.zone || '').localeCompare(b.zone || '', 'zh-CN');
      });
      const byZone = {};
      brands.forEach((b) => {
        const z = b.zone || '待定';
        byZone[z] = byZone[z] || [];
        byZone[z].push(b);
      });
      const color = MACRO_COLORS[macro] || '#94A3B8';

      return `
        <section class="placement-section" style="--section-color:${color}">
          <header class="placement-section-head">
            <span class="placement-section-dot"></span>
            <h2 class="xpark-h3">${macro}</h2>
            <span class="badge ink-outline">${brands.length} 个品牌</span>
          </header>
          ${Object.entries(byZone).map(([zone, zoneBrands]) => `
            <div class="placement-zone-block">
              <h3 class="placement-zone-title">${zone} <span class="xpark-caption">(${zoneBrands.length})</span></h3>
              <div class="data-table-wrap">
                <table class="data-table placement-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>品牌</th>
                      <th>分档</th>
                      <th>业态</th>
                      <th>细分</th>
                      <th>楼栋</th>
                      <th>面积</th>
                      <th>招商</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${zoneBrands.map((b, i) => `
                      <tr>
                        <td class="mono">${String(i + 1).padStart(2, '0')}</td>
                        <td><strong>${b.name}</strong></td>
                        <td><span class="badge ${b.tierTag}">${b.tier}</span></td>
                        <td>${b.cat}</td>
                        <td class="text-muted">${b.subcat || '—'}</td>
                        <td>${b.building || '—'}${b.side && b.side !== '—' ? ` · ${b.side}` : ''}</td>
                        <td class="mono">${b.area}</td>
                        <td><span class="badge ${b.probTag}">${b.prob}</span></td>
                      </tr>`).join('')}
                  </tbody>
                </table>
              </div>
            </div>`).join('')}
        </section>`;
    }).join('');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
