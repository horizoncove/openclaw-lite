(function () {
  const BRANDS = window.XPARK_BRANDS || [];

  const TIERS = [
    {
      tier: 'A',
      count: 14,
      label: '锚点压舱石',
      strategy: '首批全部接触，给最优商务条件（免租期/装补），3 个月内锁定至少 5 个',
      owner: 'HC 亲自盯',
      target: '开业前签 7–9 个',
    },
    {
      tier: 'B',
      count: 42,
      label: '主力店群',
      strategy: 'A 档签约后借势推广，标准商务条件，批量接触',
      owner: '招商团队',
      target: '签 15–20 个',
    },
    {
      tier: 'C',
      count: 45,
      label: '填铺养铺',
      strategy: '门槛低、决策快，优先选抗假期业态（药房/培训/社区配套）',
      owner: '招商团队',
      target: '签 15–20 个',
    },
    {
      tier: 'D',
      count: 22,
      label: '机会爆点',
      strategy: 'HC 亲自谈，一事一议；谈下 1–2 个即可',
      owner: 'HC',
      target: '1–2 个首店/标杆',
    },
  ];

  function renderTierCards() {
    const el = document.getElementById('tier-cards');
    if (!el) return;
    el.innerHTML = TIERS.map((t) => `
      <article class="tier-card tier-${t.tier.toLowerCase()}">
        <div class="tier-card-head">
          <span class="tier-label">${t.tier}</span>
          <span class="tier-count">${t.count} 个品牌</span>
        </div>
        <h4 class="xpark-h4">${t.label}</h4>
        <p class="xpark-caption">${t.strategy}</p>
        <ul>
          <li>责任人：${t.owner}</li>
          <li>目标：${t.target}</li>
        </ul>
      </article>
    `).join('');
  }

  function renderCategoryChart() {
    const el = document.getElementById('cat-chart');
    if (!el || !BRANDS.length) return;
    const counts = {};
    BRANDS.forEach((b) => {
      counts[b.cat] = (counts[b.cat] || 0) + 1;
    });
    const max = Math.max(...Object.values(counts));
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    el.innerHTML = sorted
      .map(
        ([cat, n]) => `
        <div class="cat-bar-item">
          <div class="cat-name">${cat}</div>
          <div class="cat-bar-track"><div class="cat-bar-fill" style="width:${Math.round((n / max) * 100)}%"></div></div>
          <div class="cat-num">${n} 个品牌</div>
        </div>`
      )
      .join('');
  }

  function renderTierBrands(tier, containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const list = BRANDS.filter((b) => b.tier === tier);
    el.innerHTML = list
      .map(
        (b) => `
        <div class="handbook-brand-chip">
          <img src="../assets/${b.logo}" alt="${b.name}" loading="lazy">
          <span>${b.name}</span>
        </div>`
      )
      .join('');
  }

  function initToc() {
    const links = document.querySelectorAll('.handbook-toc a');
    const mobileToc = document.getElementById('handbook-toc-mobile');
    if (mobileToc) {
      mobileToc.innerHTML = [...links]
        .map((a) => `<a href="${a.getAttribute('href')}">${a.textContent.replace(/^\d+\s*/, '')}</a>`)
        .join('');
    }
    const allLinks = document.querySelectorAll('.handbook-toc a, .handbook-toc-mobile a');
    const sections = [...document.querySelectorAll('.handbook-section')];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            allLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${entry.target.id}`));
          }
        });
      },
      { rootMargin: '-20% 0px -65% 0px' }
    );
    sections.forEach((s) => observer.observe(s));
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderTierCards();
    renderCategoryChart();
    renderTierBrands('A', 'tier-a-brands');
    renderTierBrands('B', 'tier-b-brands');
    initToc();
  });
})();
