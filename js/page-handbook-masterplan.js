(function () {
  const DATA = window.HANDBOOK_MASTERPLAN;
  const BRANDS = window.XPARK_BRANDS || [];
  if (!DATA) return;

  let activeZone = null;
  let activeMacro = '全部';

  const BUILDING_BY_ZONE = {
    b3: '3#',
    b7: '7#',
    b4: '4#',
    b5: '5#',
    b6: '6#',
    b8: '8#',
    'plaza-square': '方形广场',
    'plaza-landmark': '地标广场',
  };

  function init() {
    renderMethodology();
    renderSummary();
    renderMacroZones();
    renderFlow();
    renderSchematic();
    renderBrandMapping();
    renderBrandRoster();
    renderZoneCards();
    bindInteraction();
  }

  function brandsForBuilding(building) {
    return BRANDS.filter((b) => b.building === building);
  }

  function brandsForMacro(label) {
    if (label === '全部') return BRANDS;
    return BRANDS.filter((b) => b.macroLabel === label);
  }

  function streetBrands(list = BRANDS) {
    return list.filter((b) => !b.zone?.includes('非街铺'));
  }

  function renderMethodology() {
    const el = document.getElementById('masterplan-methodology');
    if (!el) return;
    el.innerHTML = `
      <p class="xpark-caption" style="margin-bottom:var(--space-2)"><strong>数据来源：</strong>${DATA.source || '项目方总平面'}</p>
      <ol class="mp-method-list">${(DATA.methodology || []).map((s) => `<li>${s}</li>`).join('')}</ol>
      <p class="mp-disclaimer xpark-caption">${DATA.disclaimer || ''}</p>`;
  }

  function renderSummary() {
    const el = document.getElementById('masterplan-summary');
    if (!el) return;
    const s = DATA.summary;
    const street = streetBrands().length;
    const topZones = [...new Set(BRANDS.map((b) => b.macroLabel))]
      .map((label) => ({ label, n: BRANDS.filter((b) => b.macroLabel === label).length }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 3)
      .map((z) => `${z.label} ${z.n}`)
      .join(' · ');
    el.innerHTML = `
      <article class="mp-summary-card">
        <span class="mp-summary-label">街铺范围</span>
        <strong>${s.totalArea}</strong>
        <p class="xpark-caption">${s.buildings}</p>
      </article>
      <article class="mp-summary-card">
        <span class="mp-summary-label">品牌落位</span>
        <strong>${street} / ${s.brandCount}</strong>
        <p class="xpark-caption">街铺招商 · 含 ${s.brandCount - street} 个上层/非街铺</p>
      </article>
      <article class="mp-summary-card">
        <span class="mp-summary-label">落位原则</span>
        <strong>${s.principle.split(' · ')[0]}</strong>
        <p class="xpark-caption">${topZones || s.principle.split(' · ').slice(1).join(' · ')}</p>
      </article>`;
  }

  function renderMacroZones() {
    const el = document.getElementById('masterplan-macro');
    if (!el || !DATA.macroZones) return;
    el.innerHTML = DATA.macroZones.map((m) => {
      const count = BRANDS.filter((b) => {
        if (m.id === 'hub-plaza') return b.macroLabel === '方形广场' || b.macroLabel === '中央连接';
        if (m.id === 'hub-hotel') return b.macro === 'hub-hotel';
        return b.macro === m.id;
      }).length;
      return `
      <article class="mp-macro-card mp-macro-filter" data-macro="${m.label}" style="--macro-color:${m.color}" role="button" tabindex="0">
        <span class="mp-macro-dot"></span>
        <div>
          <strong>${m.label}</strong>
          <p class="xpark-caption">${m.building} · ${m.desc}</p>
          <p class="xpark-caption mp-macro-count"><strong>${count}</strong> 个品牌</p>
        </div>
      </article>`;
    }).join('');

    el.querySelectorAll('.mp-macro-filter').forEach((card) => {
      const go = () => {
        activeMacro = activeMacro === card.dataset.macro ? '全部' : card.dataset.macro;
        el.querySelectorAll('.mp-macro-filter').forEach((c) => c.classList.toggle('is-active', activeMacro !== '全部' && c.dataset.macro === activeMacro));
        renderBrandRoster();
        document.getElementById('masterplan-brand-roster')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      };
      card.addEventListener('click', go);
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
  }

  function renderFlow() {
    const el = document.getElementById('masterplan-flow');
    if (!el || !DATA.flow) return;
    el.innerHTML = DATA.flow.map((f, i) => `
      <div class="mp-flow-step">
        <span class="mp-flow-num">${f.step}</span>
        <div><strong>${f.label}</strong><p class="xpark-caption">${f.desc}</p></div>
      </div>${i < DATA.flow.length - 1 ? '<span class="mp-flow-arrow">→</span>' : ''}`).join('');
  }

  function renderSchematic() {
    const svg = document.getElementById('masterplan-schematic');
    if (!svg) return;

    const macroMap = {};
    (DATA.macroZones || []).forEach((m) => { macroMap[m.id] = m.color; });

    const base = `
      <rect x="2" y="2" width="96" height="96" rx="4" fill="#F8F4EE" stroke="#E5E0D8"/>
      <text x="50" y="7" font-size="3" fill="#6B7280" text-anchor="middle">康定路</text>`;

    const zoneRects = DATA.zones.filter((z) => z.position && z.categories[0] !== '办公').map((z) => {
      const color = z.macro && macroMap[z.macro] ? macroMap[z.macro] : (DATA.categories[z.categories[0]] || '#94A3B8');
      const count = BUILDING_BY_ZONE[z.id] ? brandsForBuilding(BUILDING_BY_ZONE[z.id]).length : 0;
      return `
        <rect class="mp-zone" data-zone="${z.id}" x="${z.position.x}" y="${z.position.y}"
          width="${z.position.w}" height="${z.position.h}" rx="2"
          fill="${color}" opacity="0.65" stroke="#FEFCF8" stroke-width="0.8"/>
        ${count ? `<text x="${z.position.x + z.position.w / 2}" y="${z.position.y + z.position.h / 2 + 1}" font-size="3" fill="#fff" text-anchor="middle" opacity="0.9">${count}</text>` : ''}
        <title>${z.name}${count ? ` · ${count} 品牌` : ''}</title>`;
    }).join('');

    const labels = [
      { x: 15, y: 20, t: '9#' }, { x: 15, y: 42, t: '8#' },
      { x: 41, y: 20, t: '7#' }, { x: 80, y: 20, t: '3#' },
      { x: 69, y: 48, t: '4#' }, { x: 81, y: 48, t: '5#' },
      { x: 48, y: 42, t: '6#' }, { x: 50, y: 54, t: '方形' },
      { x: 89, y: 8, t: '地标', s: true },
    ].map((l) => `<text x="${l.x}" y="${l.y}" font-size="${l.s ? 2.2 : 2.8}" fill="#1A1918" text-anchor="middle" opacity="0.5">${l.t}</text>`).join('');

    svg.innerHTML = base + zoneRects + labels;
  }

  function renderBrandMapping() {
    const el = document.getElementById('masterplan-brand-map');
    if (!el || !DATA.brandMapping) return;
    el.innerHTML = `
      <h4 class="xpark-h4">123 品牌库 → 分区映射</h4>
      <div class="data-table-wrap">
        <table class="data-table">
          <thead><tr><th>业态</th><th>落位分区</th><th>代表品牌</th></tr></thead>
          <tbody>${DATA.brandMapping.map((r) => `
            <tr><td>${r.cat}</td><td>${r.zone}</td><td>${r.examples}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function renderBrandRoster() {
    const el = document.getElementById('masterplan-brand-roster');
    if (!el || !BRANDS.length) return;

    const labels = ['全部', ...DATA.macroZones.map((m) => m.label), '中央连接', '西侧配套'];
    const uniqueLabels = [...new Set(labels)];

    let list = brandsForMacro(activeMacro);
    if (activeMacro === '方形广场') {
      list = BRANDS.filter((b) => b.macroLabel === '方形广场' || b.macroLabel === '中央连接');
    }

    const grouped = {};
    list.forEach((b) => {
      const key = b.zone || b.macroLabel || '待定';
      grouped[key] = grouped[key] || [];
      grouped[key].push(b);
    });

    el.innerHTML = `
      <div class="mp-roster-head">
        <h4 class="xpark-h4">品牌落位清单</h4>
        <p class="xpark-caption">共 <strong>${list.length}</strong> 个品牌 · 点击上方板块卡片可筛选</p>
      </div>
      <div class="mp-roster-filters">
        ${uniqueLabels.map((label) => `
          <span class="badge ${activeMacro === label ? 'lime active' : 'ink-outline'} mp-roster-filter" data-macro="${label}">${label}</span>`).join('')}
      </div>
      <div class="mp-roster-groups">
        ${Object.entries(grouped).sort((a, b) => b[1].length - a[1].length).map(([zone, brands]) => `
          <section class="mp-roster-group">
            <h5 class="mp-roster-zone">${zone} <span class="xpark-caption">(${brands.length})</span></h5>
            <div class="mp-roster-brands">
              ${brands.map((b) => `
                <span class="mp-roster-chip" title="${b.cat} · ${b.tier}档">
                  <span class="badge ${b.tierTag} mp-roster-tier">${b.tier}</span>
                  ${b.name}
                </span>`).join('')}
            </div>
          </section>`).join('')}
      </div>`;

    el.querySelectorAll('.mp-roster-filter').forEach((badge) => {
      badge.addEventListener('click', () => {
        activeMacro = badge.dataset.macro;
        document.querySelectorAll('.mp-macro-filter').forEach((c) => {
          c.classList.toggle('is-active', activeMacro !== '全部' && (c.dataset.macro === activeMacro || (activeMacro === '方形广场' && c.dataset.macro === '方形广场')));
        });
        renderBrandRoster();
      });
    });
  }

  function renderZoneCards() {
    const el = document.getElementById('masterplan-zones');
    if (!el) return;
    el.innerHTML = DATA.zones
      .filter((z) => z.categories[0] !== '办公' || z.floors)
      .map((z) => {
        const macro = (DATA.macroZones || []).find((m) => m.id === z.macro);
        const color = macro?.color || DATA.categories[z.categories[0]] || '#94A3B8';
        const building = BUILDING_BY_ZONE[z.id];
        const zoneBrands = building ? brandsForBuilding(building) : [];
        const floorRows = (z.floors || []).map((fl) => `
          <div class="mp-floor-row">
            <span class="mp-floor-label">${fl.f}</span>
            <span class="mp-floor-items">${fl.items}</span>
          </div>`).join('');
        const anchorBlock = z.anchors?.length
          ? `<div class="mp-zone-anchors"><span class="xpark-caption">规划锚点</span><div>${z.anchors.map((a) => `<span class="badge coral">${a}</span>`).join('')}</div></div>`
          : '';
        const brandBlock = zoneBrands.length
          ? `<div class="mp-zone-brands"><span class="xpark-caption">品牌库落位 (${zoneBrands.length})</span><div class="mp-roster-brands">${zoneBrands.slice(0, 12).map((b) => `<span class="mp-roster-chip"><span class="badge ${b.tierTag} mp-roster-tier">${b.tier}</span>${b.name}</span>`).join('')}${zoneBrands.length > 12 ? `<span class="mp-roster-chip mp-roster-more">+${zoneBrands.length - 12}</span>` : ''}</div></div>`
          : '';
        return `
          <article class="mp-zone-card" data-zone="${z.id}" style="--zone-color:${color}">
            <div class="mp-zone-card-head">
              <span class="mp-zone-dot"></span>
              <div>
                <h4 class="xpark-h4">${z.name}</h4>
                <p class="xpark-caption">${z.building} · ${z.function}${zoneBrands.length ? ` · ${zoneBrands.length} 品牌` : ''}</p>
              </div>
              ${macro ? `<span class="badge" style="background:${macro.color};color:#fff;border:none">${macro.label}</span>` : `<span class="badge ink-outline">${z.phase}</span>`}
            </div>
            <p class="xpark-body mp-zone-logic">${z.logic}</p>
            <div class="mp-floor-table">${floorRows}</div>
            ${brandBlock}
            ${anchorBlock}
          </article>`;
      }).join('');
  }

  function bindInteraction() {
    const tip = document.getElementById('masterplan-tip');
    const defaultTip = '左侧为项目总平面 · 右侧为业态分区交互示意 · 悬停/点击卡片查看楼层明细';
    document.querySelectorAll('.mp-zone, .mp-zone-card').forEach((el) => {
      const id = el.dataset.zone;
      const zone = DATA.zones.find((z) => z.id === id);
      if (!zone) return;
      el.addEventListener('mouseenter', () => {
        const n = BUILDING_BY_ZONE[id] ? brandsForBuilding(BUILDING_BY_ZONE[id]).length : 0;
        if (tip) tip.textContent = `${zone.name} — ${zone.function}${n ? ` · ${n} 品牌` : ''}`;
        highlightZone(id);
      });
      el.addEventListener('mouseleave', () => {
        if (!activeZone && tip) tip.textContent = defaultTip;
        if (!activeZone) clearHighlight();
      });
      el.addEventListener('click', () => {
        activeZone = activeZone === id ? null : id;
        highlightZone(activeZone);
        if (activeZone) {
          const building = BUILDING_BY_ZONE[activeZone];
          if (building) {
            const zoneData = DATA.zones.find((z) => z.id === activeZone);
            activeMacro = zoneData?.macro ? (DATA.macroZones.find((m) => m.id === zoneData.macro)?.label || '全部') : '全部';
            if (activeZone === 'b6') activeMacro = '中央连接';
            renderBrandRoster();
            document.querySelectorAll('.mp-macro-filter').forEach((c) => c.classList.remove('is-active'));
          }
          document.querySelector(`.mp-zone-card[data-zone="${activeZone}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    });
  }

  function highlightZone(id) {
    document.querySelectorAll('.mp-zone, .mp-zone-card').forEach((el) => {
      const match = !id || el.dataset.zone === id;
      el.classList.toggle('is-active', match && !!id);
      el.style.opacity = !id || match ? '' : '0.35';
    });
  }

  function clearHighlight() {
    document.querySelectorAll('.mp-zone, .mp-zone-card').forEach((el) => {
      el.classList.remove('is-active');
      el.style.opacity = '';
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
