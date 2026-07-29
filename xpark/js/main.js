const ASSET = 'https://www.xpark.com.tw';

const BANNERS = [
  { pc: '/media/202607/20260714051102AKTf.jpg', mo: '/media/202607/20260715050201cp7f.jpg', url: 'https://www.xparkevent.com/' },
  { pc: '/media/202606/20260605070105NpRz.jpg', mo: '/media/202606/202606050701121O75.jpg', url: 'https://reurl.cc/mkzWXW' },
  { pc: '/media/202605/20260515114916eRQh.jpg', mo: '/media/202605/20260515114454MJej.jpg', url: 'https://www.xpark.com.tw/news/44' },
  { pc: '/media/202505/20250522011658Tu4S.jpg', mo: '/media/202505/20250522011755TkFt.jpg', url: 'https://www.xpark.com.tw/news/53' },
  { pc: '/media/202312/20231227042502nSLa.jpg', mo: '/media/202312/20231227063001JtAc.jpg', url: 'https://xpark365lifestyle.ad2iction.com/' },
  { pc: '/media/202312/202312270439004sMy.jpg', mo: '/media/202312/202312270439034Gr6.jpg', url: 'https://hotelcozzi.com/blu-night%E5%AE%BF%E6%B5%B7%E5%A5%87%E9%81%87/' },
];

const NEWS = [
  { date: '2026-07-17', title: '響應綠色永續觀光，攜手桃園捷運打造無車輕旅程，Xpark門票9折起', desc: '「遊Xpark搭桃園捷運、暑假低碳輕旅遊」7/17起正式開跑，門票享9折起優惠~邀請民眾以最環保、最便利的方式安排夏日行程。', img: '/media/202607/20260716034124E5Mp.jpg', href: '/news/74' },
  { date: '2026-06-30', title: '《集合啦！動物森友會 》× Xpark 海洋生物互動展     西施惠 見面會情報', desc: 'Xpark特地邀請到「西施惠」來現場與大家見面！現場特別設置了拍照區，歡迎來跟「西施惠」一起留下回憶！', img: '/media/202607/20260714054927F7yM.jpg', href: '/news/69' },
  { date: '2026-06-17', title: '台灣首度合作！《集合啦！動物森友會 》× Xpark 海洋生物互動展', desc: '還記得在《集合啦！動物森友會》中，在專屬於你的無人島上，與島民們一同度過的慢活生活嗎？Xpark將於2026年7月1日（三）至9月30日（三）期間，攜手任天堂株式会社及台灣任天堂股份有限公司，首度於台灣推出《集合啦！動物森友會》海洋生物互動體驗展。', img: '/media/202607/20260714054910oD6B.jpg', href: '/news/68' },
  { date: '2026-05-15', title: '預防新型態詐騙，Xpark提醒您提高警覺', desc: '近來不僅多起不實網站販售Xpark門票，還有虛假的徵才情報，提醒您切勿相信網路不實網站。', img: '/media/202412/20241204101047PExt.jpg', href: '/news/44' },
  { date: '2025-12-09', title: '連續兩年肯定！Xpark榮獲「2025桃金獎」特別獎 & 金鑽職人獎', desc: '不僅娛樂層面，海洋保護教育與社會參與方面也獲得在地民眾的認可', img: '/media/202512/20251210033730uMYC.jpg', href: '/news/61' },
  { date: '2025-06-28', title: 'Xpark 五週年｜全新展示《Xpark meets NAKED～Ocean of Light潛浸海洋～》', desc: 'Xpark 再度攜手日本頂級光影藝術團隊 NAKED, INC.，推出沉浸式展覽，於 6/28 盛大登場！', img: '/media/202506/20250626102012UwQg.jpg', href: '/news/53' },
];

const SCENARIOS = [
  { label: 'Xpark館內活動及服務', img: '/media/202401/20240109022016Q3hv.jpg' },
  { label: '《集合啦！動物森友會 》', img: '/media/202607/202607160329174CVb.jpg' },
  { label: '情侶', img: '/media/202312/20231212065344aRQL.jpg' },
  { label: '親子', img: '/media/202312/20231212065537LmmS.jpg' },
  { label: '朋友', img: '/media/202312/20231212065316ZNhd.jpg' },
  { label: '宿海奇遇_夜宿Xpark', img: '/media/202312/202312270119110SnT.jpg' },
  { label: '持桃園市民卡', img: '/media/202604/20260401040355xovO.jpg' },
];

const GUIDES = [
  { label: '關於Xpark', img: '/xpark_static/img/about-top.jpg', href: '/about', top: true },
  { label: 'Xpark票價', img: '/xpark_static/img/about-00.jpg', href: '/ticket' },
  { label: '館內導覽', img: '/xpark_static/img/about-01.jpg', href: '/floor1' },
  { label: 'Xcafe / Xfun', img: '/xpark_static/img/about-03.jpg', href: '/food' },
  { label: '加價活動', img: '/xpark_static/img/about-02.jpg', href: '/markup' },
  { label: 'Coming Soon', img: '/xpark_static/img/about-04.jpg', href: null },
];

function imgUrl(path) {
  return ASSET + path;
}

function initMobileMenu() {
  const wrap = document.querySelector('.menu_wrap');
  const menu = document.querySelector('.menu');
  if (!wrap || !menu) return;

  wrap.innerHTML = '<span></span>';
  wrap.addEventListener('click', () => {
    wrap.classList.toggle('open');
    menu.classList.toggle('open');
    document.body.style.overflow = menu.classList.contains('open') ? 'hidden' : '';
  });

  document.querySelectorAll('.menu .acc_wrap > .acc_btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      btn.parentElement.classList.toggle('open');
    });
  });
}

function initLangDropdown() {
  document.querySelectorAll('header .acc_wrap.lan_wrap > .acc_btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      btn.parentElement.classList.toggle('open');
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.acc_wrap')) {
      document.querySelectorAll('.acc_wrap.open').forEach((el) => el.classList.remove('open'));
    }
  });
}

function createCarousel(container, slides, renderSlide, autoMs = 5000) {
  let index = 0;
  let timer;

  const track = document.createElement('div');
  track.className = container.classList.contains('banner-carousel') ? 'banner-track' : 'type-track';

  slides.forEach((slide, i) => {
    const el = document.createElement('div');
    el.className = container.classList.contains('banner-carousel') ? 'banner-slide' : 'type-slide';
    el.innerHTML = renderSlide(slide, i);
    track.appendChild(el);
  });

  container.appendChild(track);

  const dots = document.createElement('div');
  dots.className = container.classList.contains('banner-carousel') ? 'banner-dots' : 'type-dots';
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', `Slide ${i + 1}`);
    if (i === 0) dot.classList.add('active');
    dot.addEventListener('click', () => goTo(i));
    dots.appendChild(dot);
  });
  container.appendChild(dots);

  function goTo(i) {
    index = (i + slides.length) % slides.length;
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.querySelectorAll('button').forEach((d, j) => d.classList.toggle('active', j === index));
  }

  function next() {
    goTo(index + 1);
  }

  function prev() {
    goTo(index - 1);
  }

  function startAuto() {
    stopAuto();
    timer = setInterval(next, autoMs);
  }

  function stopAuto() {
    if (timer) clearInterval(timer);
  }

  if (container.classList.contains('banner-carousel')) {
    const prevBtn = document.createElement('button');
    prevBtn.className = 'banner-nav prev';
    prevBtn.type = 'button';
    prevBtn.innerHTML = '‹';
    prevBtn.addEventListener('click', () => { prev(); startAuto(); });

    const nextBtn = document.createElement('button');
    nextBtn.className = 'banner-nav next';
    nextBtn.type = 'button';
    nextBtn.innerHTML = '›';
    nextBtn.addEventListener('click', () => { next(); startAuto(); });

    container.appendChild(prevBtn);
    container.appendChild(nextBtn);
  }

  container.addEventListener('mouseenter', stopAuto);
  container.addEventListener('mouseleave', startAuto);
  startAuto();

  return { goTo, next, prev };
}

function initBanner() {
  const el = document.getElementById('banner-carousel');
  if (!el) return;

  createCarousel(el, BANNERS, (b) => `
    <div class="pc"><img src="${imgUrl(b.pc)}" alt="Xpark banner" loading="lazy"></div>
    <div class="mo"><img src="${imgUrl(b.mo)}" alt="Xpark banner" loading="lazy"></div>
  `);

  el.addEventListener('click', (e) => {
    const slide = e.target.closest('.banner-slide');
    if (!slide) return;
    const idx = [...slide.parentElement.children].indexOf(slide);
    const url = BANNERS[idx]?.url;
    if (url) window.open(url, '_blank');
  });
}

function initScenarios() {
  const el = document.getElementById('type-carousel');
  const btns = document.querySelectorAll('.type_btns .btn1');
  if (!el) return;

  const carousel = createCarousel(el, SCENARIOS, (s) =>
    `<a href="${ASSET}/type"><img src="${imgUrl(s.img)}" alt="${s.label}" loading="lazy"></a>`
  , 4000);

  btns.forEach((btn, i) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      btns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      carousel.goTo(i);
    });
  });
}

function initCalendar() {
  const calendarEl = document.getElementById('calendar');
  const detail = document.querySelector('.calendar_detail');
  const mask = document.querySelector('.mask');
  if (!calendarEl || typeof FullCalendar === 'undefined') return;

  let selectedDate = new Date();

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'zh-tw',
    headerToolbar: {
      left: 'title',
      center: '',
      right: 'next today',
    },
    buttonText: {
      today: '今日',
    },
    height: 'auto',
    selectable: true,
    dateClick(info) {
      selectedDate = info.date;
      showDetail(info.date);
      document.querySelectorAll('.fc-daygrid-day').forEach((d) => d.classList.remove('fc-select-day'));
      info.dayEl.classList.add('fc-select-day');
    },
  });

  calendar.render();

  function showDetail(date) {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const dow = date.getDay();
    const isSat = dow === 6;
    const start = '早上 10:00';
    const end = isSat ? '晚上 08:00' : '晚上 06:00';

    detail.querySelector('.day').textContent = day;
    detail.querySelector('.month_').textContent = month;
    detail.querySelector('.day_').textContent = day;
    detail.querySelector('.start').textContent = start;
    detail.querySelector('.end').textContent = end;
    detail.classList.add('show');
    mask.classList.add('show');
  }

  function hideDetail() {
    detail.classList.remove('show');
    mask.classList.remove('show');
  }

  mask.addEventListener('click', hideDetail);
  detail.querySelector('.c_close').addEventListener('click', hideDetail);

  detail.querySelector('.btn_next').addEventListener('click', (e) => {
    e.preventDefault();
    selectedDate = new Date(selectedDate);
    selectedDate.setDate(selectedDate.getDate() + 1);
    calendar.gotoDate(selectedDate);
    showDetail(selectedDate);
  });
}

function renderNews() {
  const container = document.getElementById('news-list');
  if (!container) return;

  container.innerHTML = NEWS.map((n) => `
    <a href="${ASSET}${n.href}" class="news_list" target="_blank" rel="noopener">
      <div class="news_top clear r">
        <div class="date">${n.date}</div>
      </div>
      <div class="flex">
        <div class="news_txt">
          <div class="news_tit">${n.title}</div>
          <p class="news_desc">${n.desc}</p>
        </div>
        <div class="img">
          <img src="${imgUrl(n.img)}" alt="" loading="lazy">
        </div>
      </div>
    </a>
  `).join('');
}

function renderGuides() {
  const container = document.getElementById('guide-wrap');
  if (!container) return;

  container.innerHTML = GUIDES.map((g) => {
    const cls = g.top ? 'g_item g_top' : 'g_item';
    const inner = `
      <div class="img" style="background-image:url('${imgUrl(g.img)}')"></div>
      <div class="g_label"><span>${g.label}</span></div>
    `;
    return g.href
      ? `<a href="${ASSET}${g.href}" class="${cls}" target="_blank" rel="noopener">${inner}</a>`
      : `<div class="${cls}">${inner}</div>`;
  }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initLangDropdown();
  initBanner();
  initScenarios();
  renderNews();
  renderGuides();
  initCalendar();
});
