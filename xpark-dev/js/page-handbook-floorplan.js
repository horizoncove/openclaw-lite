(function () {
  const DATA = window.HANDBOOK_FLOORPLAN;
  if (!DATA) return;

  const { w, h } = DATA.viewBox;
  let planMode = true;
  let activeCategory = 'all';
  let activeZoneId = null;

  function initFloorplanPlanning() {
    wrapPlanImages();
    renderMixSummary();
    initPlanControls();
    renderOverlays(getActivePlanKey());
    bindTabSwitch();
  }

  function getActivePlanKey() {
    const tab = document.querySelector('.floorplan-tab.active');
    return tab?.dataset.plan || 'master';
  }

  function wrapPlanImages() {
    document.querySelectorAll('.floorplan-panel').forEach((panel) => {
      const img = panel.querySelector('img');
      if (!img || panel.querySelector('.floorplan-canvas')) return;
      const canvas = document.createElement('div');
      canvas.className = 'floorplan-canvas';
      img.parentNode.insertBefore(canvas, img);
      canvas.appendChild(img);
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'floorplan-overlay');
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.setAttribute('aria-hidden', 'true');
      canvas.appendChild(svg);
    });
  }

  function renderMixSummary() {
    const el = document.getElementById('floorplan-mix-summary');
    if (!el || !DATA.mixSummary) return;
    el.innerHTML = DATA.mixSummary.map((row) => `
      <article class="mix-summary-card">
        <span class="mix-summary-floor">${row.floor}</span>
        <strong>${row.area}</strong>
        <p class="xpark-caption">${row.focus}</p>
        <span class="badge ink-outline">${row.ratio}</span>
      </article>`).join('');
  }

  function initPlanControls() {
    const toggle = document.getElementById('floorplan-plan-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        planMode = !planMode;
        toggle.classList.toggle('active', planMode);
        toggle.setAttribute('aria-pressed', planMode ? 'true' : 'false');
        toggle.textContent = planMode ? '规划示意 · 开' : '规划示意 · 关';
        document.querySelectorAll('.floorplan-overlay').forEach((svg) => {
          svg.classList.toggle('is-hidden', !planMode);
        });
        document.getElementById('floorplan-zone-detail')?.classList.toggle('is-hidden', !planMode || !activeZoneId);
      });
    }

    const filters = document.getElementById('floorplan-cat-filters');
    if (filters) {
      filters.innerHTML = `
        <span class="badge ink-outline plan-cat-filter active" data-cat="all">全部业态</span>
        ${Object.entries(DATA.categories).map(([key, c]) =>
          `<span class="badge ink-outline plan-cat-filter" data-cat="${key}" style="--cat-color:${c.color}">${c.label}</span>`
        ).join('')}`;
      filters.querySelectorAll('.plan-cat-filter').forEach((btn) => {
        btn.addEventListener('click', () => {
          filters.querySelectorAll('.plan-cat-filter').forEach((b) => b.classList.remove('active', 'lime'));
          btn.classList.add('active', 'lime');
          activeCategory = btn.dataset.cat;
          applyCategoryFilter();
        });
      });
    }
  }

  function zoneShape(zone, catColor) {
    const pct = (n, axis) => (n / 100) * (axis === 'x' ? w : h);
    const fill = catColor;
    if (zone.shape === 'rect') {
      return `<rect class="plan-zone" data-zone="${zone.id}" data-cat="${zone.category}"
        x="${pct(zone.x, 'x')}" y="${pct(zone.y, 'y')}" width="${pct(zone.w, 'x')}" height="${pct(zone.h, 'y')}"
        fill="${fill}" rx="4"/>`;
    }
    return '';
  }

  function renderOverlays(planKey) {
    document.querySelectorAll('.floorplan-panel').forEach((panel) => {
      const key = panel.dataset.plan;
      const svg = panel.querySelector('.floorplan-overlay');
      if (!svg) return;
      const plan = DATA.plans[key];
      if (!plan) {
        svg.innerHTML = '';
        return;
      }
      svg.innerHTML = plan.zones.map((zone) => {
        const color = DATA.categories[zone.category]?.color || '#A0E828';
        return zoneShape(zone, color);
      }).join('');

      svg.querySelectorAll('.plan-zone').forEach((el) => {
        const zone = plan.zones.find((z) => z.id === el.dataset.zone);
        if (!zone) return;
        el.addEventListener('mouseenter', () => highlightZone(zone, key));
        el.addEventListener('focus', () => highlightZone(zone, key));
        el.addEventListener('mouseleave', () => {
          if (activeZoneId !== zone.id) clearZoneHighlight();
        });
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          activeZoneId = zone.id;
          highlightZone(zone, key, true);
        });
      });

      svg.classList.toggle('is-hidden', !planMode);
    });
    updateZoneDetail(null);
  }

  function highlightZone(zone, planKey, pinned) {
    document.querySelectorAll('.plan-zone').forEach((el) => {
      const match = el.dataset.zone === zone.id;
      el.classList.toggle('is-active', match);
    });
    updateZoneDetail(zone, planKey);
    if (pinned) {
      document.getElementById('floorplan-zone-detail')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function clearZoneHighlight() {
    document.querySelectorAll('.plan-zone').forEach((el) => el.classList.remove('is-active'));
    updateZoneDetail(null);
    activeZoneId = null;
  }

  function updateZoneDetail(zone, planKey) {
    const el = document.getElementById('floorplan-zone-detail');
    if (!el) return;
    if (!zone) {
      el.classList.add('is-hidden');
      el.innerHTML = '';
      return;
    }
    const color = DATA.categories[zone.category]?.color || '#A0E828';
    el.classList.remove('is-hidden');
    el.innerHTML = `
      <div class="zone-detail-head">
        <span class="zone-detail-swatch" style="background:${color}"></span>
        <div>
          <h4 class="xpark-h4">${zone.name}</h4>
          <p class="xpark-caption">${DATA.plans[planKey]?.label || ''} · ${zone.category} · ${zone.area}</p>
        </div>
      </div>
      <p class="xpark-body">${zone.note}</p>
      <div class="zone-detail-anchors">
        <span class="xpark-caption">A 档锚点建议</span>
        <div class="zone-anchor-chips">${zone.anchors.map((a) => `<span class="badge lime">${a}</span>`).join('')}</div>
      </div>`;
  }

  function applyCategoryFilter() {
    document.querySelectorAll('.plan-zone').forEach((el) => {
      const show = activeCategory === 'all' || el.dataset.cat === activeCategory;
      el.style.opacity = show ? '' : '0.08';
      el.style.pointerEvents = show ? '' : 'none';
    });
  }

  function bindTabSwitch() {
    document.querySelectorAll('.floorplan-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        setTimeout(() => {
          activeZoneId = null;
          clearZoneHighlight();
          const plan = DATA.plans[getActivePlanKey()];
          const cap = document.getElementById('floorplan-plan-caption');
          if (cap && plan) cap.textContent = plan.caption;
        }, 0);
      });
    });
    const cap = document.getElementById('floorplan-plan-caption');
    const plan = DATA.plans[getActivePlanKey()];
    if (cap && plan) cap.textContent = plan.caption;
  }

  document.addEventListener('DOMContentLoaded', initFloorplanPlanning);
})();
