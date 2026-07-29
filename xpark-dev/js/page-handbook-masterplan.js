(function () {
  const DATA = window.HANDBOOK_MASTERPLAN;
  if (!DATA) return;

  let activeZone = null;

  function init() {
    renderMethodology();
    renderSummary();
    renderMacroZones();
    renderFlow();
    renderSchematic();
    renderBrandMapping();
    renderZoneCards();
    bindInteraction();
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
    el.innerHTML = `
      <article class="mp-summary-card">
        <span class="mp-summary-label">街铺范围</span>
        <strong>${s.totalArea}</strong>
        <p class="xpark-caption">${s.buildings}</p>
      </article>
      <article class="mp-summary-card">
        <span class="mp-summary-label">品牌库</span>
        <strong>${s.brandCount}</strong>
        <p class="xpark-caption">ABCD 四档匹配</p>
      </article>
      <article class="mp-summary-card">
        <span class="mp-summary-label">落位原则</span>
        <strong>${s.principle.split(' · ')[0]}</strong>
        <p class="xpark-caption">${s.principle.split(' · ').slice(1).join(' · ')}</p>
      </article>`;
  }

  function renderMacroZones() {
    const el = document.getElementById('masterplan-macro');
    if (!el || !DATA.macroZones) return;
    el.innerHTML = DATA.macroZones.map((m) => `
      <article class="mp-macro-card" style="--macro-color:${m.color}">
        <span class="mp-macro-dot"></span>
        <div>
          <strong>${m.label}</strong>
          <p class="xpark-caption">${m.building} · ${m.desc}</p>
        </div>
      </article>`).join('');
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
      return `
        <rect class="mp-zone" data-zone="${z.id}" x="${z.position.x}" y="${z.position.y}"
          width="${z.position.w}" height="${z.position.h}" rx="2"
          fill="${color}" opacity="0.65" stroke="#FEFCF8" stroke-width="0.8"/>
        <title>${z.name}</title>`;
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

  function renderZoneCards() {
    const el = document.getElementById('masterplan-zones');
    if (!el) return;
    el.innerHTML = DATA.zones
      .filter((z) => z.categories[0] !== '办公' || z.floors)
      .map((z) => {
        const macro = (DATA.macroZones || []).find((m) => m.id === z.macro);
        const color = macro?.color || DATA.categories[z.categories[0]] || '#94A3B8';
        const floorRows = (z.floors || []).map((fl) => `
          <div class="mp-floor-row">
            <span class="mp-floor-label">${fl.f}</span>
            <span class="mp-floor-items">${fl.items}</span>
          </div>`).join('');
        const anchorBlock = z.anchors?.length
          ? `<div class="mp-zone-anchors"><span class="xpark-caption">品牌库匹配</span><div>${z.anchors.map((a) => `<span class="badge coral">${a}</span>`).join('')}</div></div>`
          : '';
        return `
          <article class="mp-zone-card" data-zone="${z.id}" style="--zone-color:${color}">
            <div class="mp-zone-card-head">
              <span class="mp-zone-dot"></span>
              <div>
                <h4 class="xpark-h4">${z.name}</h4>
                <p class="xpark-caption">${z.building} · ${z.function}</p>
              </div>
              ${macro ? `<span class="badge" style="background:${macro.color};color:#fff;border:none">${macro.label}</span>` : `<span class="badge ink-outline">${z.phase}</span>`}
            </div>
            <p class="xpark-body mp-zone-logic">${z.logic}</p>
            <div class="mp-floor-table">${floorRows}</div>
            ${anchorBlock}
          </article>`;
      }).join('');
  }

  function bindInteraction() {
    const tip = document.getElementById('masterplan-tip');
    document.querySelectorAll('.mp-zone, .mp-zone-card').forEach((el) => {
      const id = el.dataset.zone;
      const zone = DATA.zones.find((z) => z.id === id);
      if (!zone) return;
      el.addEventListener('mouseenter', () => {
        if (tip) tip.textContent = `${zone.name} — ${zone.function}`;
        highlightZone(id);
      });
      el.addEventListener('mouseleave', () => {
        if (!activeZone && tip) tip.textContent = '悬停分区查看 · 点击卡片查看楼层明细';
        if (!activeZone) clearHighlight();
      });
      el.addEventListener('click', () => {
        activeZone = activeZone === id ? null : id;
        highlightZone(activeZone);
        if (activeZone) document.querySelector(`.mp-zone-card[data-zone="${activeZone}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
