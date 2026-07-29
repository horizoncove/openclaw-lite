(function () {
  const DATA = window.HANDBOOK_MASTERPLAN;
  if (!DATA) return;

  let activeZone = null;

  function init() {
    renderMethodology();
    renderSummary();
    renderFlow();
    renderSchematic();
    renderZoneCards();
    renderMixBars();
    bindInteraction();
  }

  function renderMethodology() {
    const el = document.getElementById('masterplan-methodology');
    if (!el || !DATA.methodology) return;
    el.innerHTML = `
      <ol class="mp-method-list">
        ${DATA.methodology.map((s) => `<li>${s}</li>`).join('')}
      </ol>
      <p class="mp-disclaimer xpark-caption">${DATA.disclaimer || ''}</p>`;
  }

  function renderSummary() {
    const el = document.getElementById('masterplan-summary');
    if (!el) return;
    const s = DATA.summary;
    el.innerHTML = `
      <article class="mp-summary-card">
        <span class="mp-summary-label">商业总量</span>
        <strong>${s.totalArea}</strong>
        <p class="xpark-caption">${s.phaseNorth}</p>
        <p class="xpark-caption">${s.phaseSouth}</p>
      </article>
      <article class="mp-summary-card">
        <span class="mp-summary-label">品牌库</span>
        <strong>${s.brandCount}</strong>
        <p class="xpark-caption">ABCD 四档 · 10 大业态</p>
      </article>
      <article class="mp-summary-card">
        <span class="mp-summary-label">落位原则</span>
        <strong>${s.principle.split(' · ')[0]}</strong>
        <p class="xpark-caption">${s.principle.split(' · ').slice(1).join(' · ') || s.principle}</p>
      </article>`;
  }

  function renderFlow() {
    const el = document.getElementById('masterplan-flow');
    if (!el || !DATA.flow) return;
    el.innerHTML = DATA.flow.map((f, i) => `
      <div class="mp-flow-step">
        <span class="mp-flow-num">${f.step}</span>
        <div>
          <strong>${f.label}</strong>
          <p class="xpark-caption">${f.desc}</p>
        </div>
      </div>${i < DATA.flow.length - 1 ? '<span class="mp-flow-arrow">→</span>' : ''}`).join('');
  }

  function renderSchematic() {
    const svg = document.getElementById('masterplan-schematic');
    if (!svg) return;

    const commercialZones = DATA.zones.filter((z) => z.categories[0] !== '办公' && z.position);
    const officeZone = DATA.zones.find((z) => z.id === 'office-towers');

    const base = `
      <rect x="4" y="4" width="92" height="92" rx="6" fill="#F8F4EE" stroke="#E5E0D8"/>
      <line x1="4" y1="52" x2="96" y2="52" stroke="#FF5436" stroke-width="0.8" stroke-dasharray="3 2" opacity="0.7"/>
      <text x="50" y="50.5" font-size="2.4" fill="#FF5436" text-anchor="middle" opacity="0.8">一期地下分界线</text>
      <text x="50" y="8" font-size="3" fill="#6B7280" text-anchor="middle">康定路 · 主入口</text>
      <text x="50" y="18" font-size="2.6" fill="#6B7280" text-anchor="middle">北区 · 街铺群</text>
      <text x="50" y="88" font-size="2.6" fill="#6B7280" text-anchor="middle">南区 · 1# / 2# 创客裙楼</text>`;

    const labels = [
      { x: 10, y: 30, t: '9#' }, { x: 10, y: 42, t: '8#' },
      { x: 36, y: 24, t: '7#' }, { x: 82, y: 24, t: '3#' },
      { x: 76, y: 14, t: '广场', s: true },
      { x: 76, y: 40, t: '4#' }, { x: 48, y: 40, t: '5#' }, { x: 28, y: 40, t: '6#' },
      { x: 30, y: 72, t: '2#' }, { x: 70, y: 72, t: '1#' },
    ].map((l) => `<text x="${l.x}" y="${l.y}" font-size="${l.s ? 2.4 : 2.8}" fill="#1A1918" text-anchor="middle" opacity="0.45">${l.t}</text>`).join('');

    const officeRect = officeZone ? `
      <rect x="${officeZone.position.x}" y="${officeZone.position.y}" width="${officeZone.position.w}" height="${officeZone.position.h}"
        fill="#CBD5E1" opacity="0.25" stroke="#94A3B8" stroke-width="0.5" stroke-dasharray="2 2"/>` : '';

    const zoneRects = commercialZones.map((z) => {
      const color = DATA.categories[z.categories[0]] || '#94A3B8';
      return `
        <rect class="mp-zone" data-zone="${z.id}" x="${z.position.x}" y="${z.position.y}"
          width="${z.position.w}" height="${z.position.h}" rx="1.5"
          fill="${color}" opacity="0.6" stroke="#FEFCF8" stroke-width="0.5"/>
        <title>${z.name}</title>`;
    }).join('');

    svg.innerHTML = base + officeRect + zoneRects + labels;
  }

  function renderZoneCards() {
    const el = document.getElementById('masterplan-zones');
    if (!el) return;
    el.innerHTML = DATA.zones
      .filter((z) => z.categories[0] !== '办公')
      .map((z) => {
        const color = DATA.categories[z.categories[0]] || '#94A3B8';
        const anchorBlock = z.anchors.length
          ? `<div class="mp-zone-anchors"><span class="xpark-caption">锚点 / 代表品牌</span><div>${z.anchors.map((a) => `<span class="badge coral">${a}</span>`).join('')}</div></div>`
          : '';
        return `
          <article class="mp-zone-card" data-zone="${z.id}" style="--zone-color:${color}">
            <div class="mp-zone-card-head">
              <span class="mp-zone-dot"></span>
              <div>
                <h4 class="xpark-h4">${z.name}</h4>
                <p class="xpark-caption">${z.building} · ${z.floor}</p>
              </div>
              <span class="badge ${z.phase === '南区' ? 'coral' : 'lime'}">${z.phase}</span>
            </div>
            <p class="mp-zone-function"><strong>${z.function}</strong> · ${z.unitSize}</p>
            <div class="mp-zone-tags">
              ${z.categories.map((c) => `<span class="badge ink-outline">${c}</span>`).join('')}
              <span class="badge ink-outline">${z.area}</span>
              <span class="xpark-caption">${z.tierTarget}</span>
            </div>
            <p class="xpark-body mp-zone-logic">${z.logic}</p>
            ${anchorBlock}
          </article>`;
      }).join('');
  }

  function renderMixBars() {
    const el = document.getElementById('masterplan-mix-bars');
    if (!el) return;
    el.innerHTML = DATA.mixByFloor.map((row) => `
      <div class="mp-mix-floor">
        <h4 class="xpark-h4">${row.floor} 业态占比（品牌库统计）</h4>
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
        if (!activeZone && tip) tip.textContent = '悬停分区查看功能定位 · 点击卡片查看推导逻辑';
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
