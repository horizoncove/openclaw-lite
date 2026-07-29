(function () {
  const DATA = window.HANDBOOK_MASTERPLAN;
  if (!DATA) return;

  let activeZone = null;

  function init() {
    renderSummary();
    renderSchematic();
    renderZoneCards();
    renderMixBars();
    bindInteraction();
  }

  function renderSummary() {
    const el = document.getElementById('masterplan-summary');
    if (!el) return;
    const s = DATA.summary;
    el.innerHTML = `
      <article class="mp-summary-card">
        <span class="mp-summary-label">商业总量</span>
        <strong>${s.totalArea}</strong>
        <p class="xpark-caption">${s.commercial1F} · ${s.commercial2F}</p>
      </article>
      <article class="mp-summary-card">
        <span class="mp-summary-label">品牌库</span>
        <strong>${s.brandCount}</strong>
        <p class="xpark-caption">ABCD 四档 · 10 大业态</p>
      </article>
      <article class="mp-summary-card mp-summary-card--wide">
        <span class="mp-summary-label">落位原则</span>
        <strong>一层引流 · 端头锚点</strong>
        <p class="xpark-caption">${s.principle}</p>
      </article>`;
  }

  function renderSchematic() {
    const svg = document.getElementById('masterplan-schematic');
    if (!svg) return;

    const zones = DATA.zones.filter((z) => z.position);
    const blocks = `
      <rect x="8" y="6" width="84" height="88" rx="8" fill="none" stroke="#1A1918" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.2"/>
      <text x="12" y="14" class="mp-svg-road" font-size="3.2">康定路（北 · 主入口）</text>
      <text x="88" y="50" class="mp-svg-road" font-size="3" transform="rotate(90 88 50)">同文路</text>
      <text x="50" y="96" class="mp-svg-road" font-size="3" text-anchor="middle">创客中心区</text>`;

    const labels = [
      { x: 12, y: 28, t: '9#' }, { x: 12, y: 42, t: '8#' },
      { x: 38, y: 22, t: '7#' }, { x: 78, y: 22, t: '3#' },
      { x: 72, y: 12, t: '广场', small: true },
      { x: 78, y: 42, t: '4#' }, { x: 50, y: 42, t: '5#' }, { x: 28, y: 42, t: '6#' },
      { x: 28, y: 78, t: '2#' }, { x: 72, y: 78, t: '1#' },
    ].map((l) => `<text x="${l.x}" y="${l.y}" font-size="${l.small ? 2.6 : 3}" fill="#6B7280" text-anchor="middle" opacity="0.7">${l.t}</text>`).join('');

    const zoneRects = zones.map((z) => {
      const color = DATA.categories[z.categories[0]] || DATA.categories['混合'];
      return `
        <rect class="mp-zone" data-zone="${z.id}" x="${z.position.x}" y="${z.position.y}"
          width="${z.position.w}" height="${z.position.h}" rx="2"
          fill="${color}" opacity="0.55" stroke="#FEFCF8" stroke-width="0.6"/>
        <title>${z.name} · ${z.categories.join(' / ')}</title>`;
    }).join('');

    svg.innerHTML = blocks + zoneRects + labels;
  }

  function renderZoneCards() {
    const el = document.getElementById('masterplan-zones');
    if (!el) return;
    el.innerHTML = DATA.zones.filter((z) => z.anchors.length || z.categories[0] !== '混合').map((z) => {
      const color = DATA.categories[z.categories[0]] || '#94A3B8';
      return `
        <article class="mp-zone-card" data-zone="${z.id}" style="--zone-color:${color}">
          <div class="mp-zone-card-head">
            <span class="mp-zone-dot"></span>
            <div>
              <h4 class="xpark-h4">${z.name}</h4>
              <p class="xpark-caption">${z.building} · ${z.floor}</p>
            </div>
            <span class="badge ink-outline">${z.area}</span>
          </div>
          <p class="mp-zone-function"><strong>${z.function}</strong></p>
          <div class="mp-zone-tags">${z.categories.map((c) => `<span class="badge lime">${c}</span>`).join('')}</div>
          <p class="xpark-body mp-zone-logic">${z.logic}</p>
          <div class="mp-zone-anchors">
            <span class="xpark-caption">A 档锚点建议</span>
            <div>${z.anchors.map((a) => `<span class="badge coral">${a}</span>`).join('')}</div>
          </div>
        </article>`;
    }).join('');
  }

  function renderMixBars() {
    const el = document.getElementById('masterplan-mix-bars');
    if (!el) return;
    el.innerHTML = DATA.mixByFloor.map((row) => `
      <div class="mp-mix-floor">
        <h4 class="xpark-h4">${row.floor} 业态占比</h4>
        ${row.items.map((item) => `
          <div class="mp-mix-row">
            <span class="mp-mix-cat">${item.cat}</span>
            <div class="mp-mix-track"><div class="mp-mix-fill" style="width:${item.pct}%;background:${DATA.categories[item.cat] || '#94A3B8'}"></div></div>
            <span class="mp-mix-num">${item.count} 个 · ${item.pct}%</span>
          </div>`).join('')}
      </div>`).join('');
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
        if (!activeZone && tip) tip.textContent = '悬停分区查看功能定位 · 点击卡片查看详情';
        if (!activeZone) clearHighlight();
      });
      el.addEventListener('click', () => {
        activeZone = activeZone === id ? null : id;
        highlightZone(activeZone);
        if (activeZone) {
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
