(function () {
  const DATA = window.HANDBOOK_LOCATION;
  if (!DATA) return;

  let mapInstance = null;
  let markersLayer = null;
  let schoolMarkers = [];
  let activeZone = 'all';

  const ZONE_COLORS = {
    core: '#A0E828',
    near: '#1A1918',
    far: '#6B7280',
    future: '#FF5436',
  };

  function initLocationSection() {
    renderCoordCards();
    renderZoneDiagram();
    renderSchoolTables();
    initMap();
    initMapFilters();
    initDiagramInteraction();
  }

  function renderCoordCards() {
    const el = document.getElementById('location-coords');
    if (!el) return;
    const p = DATA.project;
    el.innerHTML = `
      <div class="coord-card coord-card--primary">
        <span class="badge coral">项目中心</span>
        <h4 class="xpark-h4">${p.name}</h4>
        <p class="xpark-caption">${p.address}</p>
        <dl class="coord-dl">
          <div><dt>GCJ-02（高德/腾讯）</dt><dd>${p.gcj02.lat}, ${p.gcj02.lng}</dd></div>
          <div><dt>WGS84（Google/OSM）</dt><dd>${p.wgs84.lat}, ${p.wgs84.lng}</dd></div>
        </dl>
        <div class="coord-links">
          <a href="${p.links.amap}" target="_blank" rel="noopener" class="btn sm primary">高德地图</a>
          <a href="${p.links.google}" target="_blank" rel="noopener" class="btn sm ghost">Google</a>
          <a href="${p.links.osm}" target="_blank" rel="noopener" class="btn sm ghost">OpenStreetMap</a>
        </div>
      </div>
      <div class="coord-stats">
        ${DATA.zones.map((z) => `
          <div class="coord-stat" data-zone="${z.id}" style="--zone-color:${z.color}">
            <strong>${DATA.schools.filter((s) => s.zone === z.id).length}</strong>
            <span>${z.label}</span>
            <p class="xpark-caption">${z.desc}</p>
          </div>`).join('')}
      </div>`;
  }

  function renderZoneDiagram() {
    const svg = document.getElementById('zone-diagram-svg');
    if (!svg) return;

    const cx = 400, cy = 320;
    const rings = [
      { r: 240, zone: 'far', label: '7km 高校圈', dash: '8 6' },
      { r: 160, zone: 'near', label: '2km 辐射圈', dash: '6 4' },
      { r: 90, zone: 'core', label: '500m 核心圈', dash: 'none' },
    ];

    let ringsHtml = rings.map((ring) => `
      <circle class="zone-ring" data-zone="${ring.zone}" cx="${cx}" cy="${cy}" r="${ring.r}"
        fill="none" stroke="${ZONE_COLORS[ring.zone]}" stroke-width="2"
        stroke-dasharray="${ring.dash}" opacity="0.35"/>
      <text x="${cx + ring.r - 8}" y="${cy - 6}" class="zone-ring-label" fill="${ZONE_COLORS[ring.zone]}">${ring.label}</text>`).join('');

    const placed = [];
    function posForSchool(s, i) {
      const ringR = { core: 55, near: 120, far: 200, future: 145 }[s.zone] || 100;
      const angle = (i * 2.399963) + ({ core: 0, near: 0.5, far: 1.2, future: 2.0 }[s.zone] || 0);
      return { x: cx + ringR * Math.cos(angle), y: cy + ringR * Math.sin(angle) };
    }

    const schoolsForDiagram = DATA.schools.filter((s) => s.type !== '交通').slice(0, 14);
    let pinsHtml = schoolsForDiagram.map((s, i) => {
      const p = posForSchool(s, i);
      placed.push({ ...s, ...p });
      return `
        <g class="zone-pin" data-zone="${s.zone}" data-name="${s.name}" tabindex="0">
          <circle cx="${p.x}" cy="${p.y}" r="6" fill="${ZONE_COLORS[s.zone]}" stroke="#FEFCF8" stroke-width="2"/>
          <title>${s.name} · ${s.dist}</title>
        </g>`;
    }).join('');

    svg.innerHTML = `
      <defs>
        <radialGradient id="zoneGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#A0E828" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="#A0E828" stop-opacity="0"/>
        </radialGradient>
        <filter id="pinShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.2"/>
        </filter>
      </defs>
      <rect width="800" height="640" fill="var(--bg-muted, #F8F4EE)" rx="16"/>
      <!-- stylized roads -->
      <path d="M 80 ${cy} H 720" stroke="#1A1918" stroke-width="3" opacity="0.12"/>
      <path d="M ${cx} 60 V 580" stroke="#1A1918" stroke-width="3" opacity="0.12"/>
      <text x="120" y="${cy - 12}" class="road-label" fill="#1A1918" opacity="0.5">康定路</text>
      <text x="${cx + 12}" y="90" class="road-label" fill="#1A1918" opacity="0.5">同文路</text>
      ${ringsHtml}
      <circle cx="${cx}" cy="${cy}" r="70" fill="url(#zoneGlow)"/>
      <!-- center project -->
      <g filter="url(#pinShadow)">
        <rect x="${cx - 52}" y="${cy - 28}" width="104" height="56" rx="12" fill="#1A1918"/>
        <text x="${cx}" y="${cy - 6}" text-anchor="middle" fill="#A0E828" font-size="11" font-weight="700">A橙天地</text>
        <text x="${cx}" y="${cy + 12}" text-anchor="middle" fill="#FEFCF8" font-size="10">文化中心</text>
        <text x="${cx}" y="${cy + 26}" text-anchor="middle" fill="#A0E828" font-size="9" opacity="0.8">Xpark 8000㎡</text>
      </g>
      ${pinsHtml}
      <!-- legend -->
      <g transform="translate(24, 520)">
        ${DATA.zones.map((z, i) => `
          <g transform="translate(${i * 180}, 0)">
            <circle cx="8" cy="8" r="6" fill="${z.color}"/>
            <text x="22" y="12" font-size="11" fill="#1A1918">${z.label}</text>
          </g>`).join('')}
      </g>`;

    const tip = document.getElementById('zone-diagram-tip');
    svg.querySelectorAll('.zone-pin').forEach((pin) => {
      pin.addEventListener('mouseenter', () => {
        if (tip) tip.textContent = pin.dataset.name;
      });
      pin.addEventListener('click', () => focusSchoolOnMap(pin.dataset.name));
    });
  }

  function renderSchoolTables() {
    ['existing', 'future'].forEach((kind) => {
      const el = document.getElementById(kind === 'existing' ? 'school-table-existing' : 'school-table-future');
      if (!el) return;
      const list = DATA.schools.filter((s) =>
        kind === 'existing' ? s.status === 'existing' : s.status === 'building' || s.status === 'planned'
      );
      el.innerHTML = list.map((s) => `
        <tr class="school-row" data-zone="${s.zone}" data-name="${s.name}">
          <td><span class="zone-dot" style="background:${ZONE_COLORS[s.zone]}"></span> ${s.name}</td>
          <td>${s.type}</td>
          <td>${s.dist}</td>
          <td>${s.students || '—'}</td>
          <td>${s.note || '—'}</td>
          <td><button type="button" class="btn sm ghost locate-btn" data-name="${s.name}">地图</button></td>
        </tr>`).join('');

      el.querySelectorAll('.locate-btn').forEach((btn) => {
        btn.addEventListener('click', () => focusSchoolOnMap(btn.dataset.name));
      });
    });
  }

  function initMap() {
    const container = document.getElementById('handbook-map');
    if (!container || typeof L === 'undefined') return;

    const { lat, lng } = DATA.project.wgs84;
    mapInstance = L.map(container, { scrollWheelZoom: true }).setView([lat, lng], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 18,
    }).addTo(mapInstance);

    markersLayer = L.layerGroup().addTo(mapInstance);

    const projectIcon = L.divIcon({
      className: 'map-pin map-pin--project',
      html: '<span>★</span>',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
    L.marker([lat, lng], { icon: projectIcon, zIndexOffset: 1000 })
      .bindPopup(`<strong>${DATA.project.name}</strong><br>${DATA.project.address}`)
      .addTo(markersLayer);

    DATA.schools.forEach((s) => {
      if (s.type === '交通') return;
      const icon = L.divIcon({
        className: `map-pin map-pin--${s.zone}`,
        html: `<span>${s.type.includes('幼') ? '幼' : s.type.includes('小') ? '小' : s.type.includes('中') || s.type.includes('985') ? '中' : '校'}</span>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const marker = L.marker([s.lat, s.lng], { icon })
        .bindPopup(`<strong>${s.name}</strong><br>${s.type} · ${s.dist}<br>${s.note || ''}`);
      marker.addTo(markersLayer);
      schoolMarkers.push({ marker, zone: s.zone });
    });

    L.circle([lat, lng], { radius: 500, color: ZONE_COLORS.core, fillColor: ZONE_COLORS.core, fillOpacity: 0.08, weight: 2, dashArray: '4' }).addTo(mapInstance);
    L.circle([lat, lng], { radius: 2000, color: ZONE_COLORS.near, fillOpacity: 0, weight: 1.5, dashArray: '6 4' }).addTo(mapInstance);

    setTimeout(() => mapInstance.invalidateSize(), 200);
  }

  function initMapFilters() {
    document.querySelectorAll('.map-filter').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.map-filter').forEach((b) => b.classList.remove('active', 'lime'));
        btn.classList.add('active', 'lime');
        activeZone = btn.dataset.zone;
        applyZoneFilter();
      });
    });
  }

  function applyZoneFilter() {
    document.querySelectorAll('.school-row').forEach((row) => {
      const show = activeZone === 'all' || row.dataset.zone === activeZone;
      row.classList.toggle('is-hidden', !show);
    });
    if (mapInstance && markersLayer) {
      schoolMarkers.forEach(({ marker, zone }) => {
        const el = marker.getElement?.();
        if (el) el.style.opacity = activeZone === 'all' || zone === activeZone ? '1' : '0.2';
      });
    }
    document.querySelectorAll('.zone-ring, .zone-pin').forEach((el) => {
      const z = el.dataset.zone;
      if (!z) return;
      el.style.opacity = activeZone === 'all' || activeZone === z ? (el.classList.contains('zone-ring') ? '0.55' : '1') : '0.15';
    });
  }

  function focusSchoolOnMap(name) {
    const school = DATA.schools.find((s) => s.name === name);
    if (!school || !mapInstance) return;
    mapInstance.setView([school.lat, school.lng], 16, { animate: true });
    document.getElementById('handbook-map')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function initDiagramInteraction() {
    document.querySelectorAll('.coord-stat').forEach((el) => {
      el.addEventListener('click', () => {
        const zone = el.dataset.zone;
        const btn = document.querySelector(`.map-filter[data-zone="${zone}"]`);
        if (btn) btn.click();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', initLocationSection);
})();
