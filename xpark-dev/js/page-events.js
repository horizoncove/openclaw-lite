(function () {
  const EVENTS = [
    { day: 5, month: 7, title: '街区音乐市集', desc: '中央广场户外 Live，15 组独立音乐人', tag: '音乐', limited: false },
    { day: 12, month: 7, title: 'Xpark 设计沙龙', desc: '邀请本地设计工作室分享街区视觉共创', tag: '沙龙', limited: false },
    { day: 19, month: 7, title: '限量联名发售', desc: '5 家品牌联合推出街区限定周边', tag: '限量', limited: true },
    { day: 26, month: 7, title: '亲子创意工坊', desc: '可持续材料手作，适合 6–12 岁', tag: '亲子', limited: false },
    { day: 2, month: 8, title: '夜光跑步派对', desc: '荧光装备 + 酸橙绿路线灯光', tag: '运动', limited: false },
    { day: 16, month: 8, title: '独立电影放映', desc: '屋顶露台露天影院', tag: '电影', limited: true },
  ];

  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  let current = new Date();
  let selectedDay = null;

  function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const label = document.getElementById('calendar-month');
    if (!grid || !label) return;

    const y = current.getFullYear();
    const m = current.getMonth();
    label.textContent = `${y} 年 ${m + 1} 月`;

    const first = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    const today = new Date();
    const eventDays = new Set(EVENTS.filter((e) => e.month === m + 1).map((e) => e.day));

    let html = ['日', '一', '二', '三', '四', '五', '六'].map((d) => `<div class="day-label">${d}</div>`).join('');

    for (let i = 0; i < first; i++) html += '<div class="day other-month"></div>';
    for (let d = 1; d <= days; d++) {
      const isToday = today.getFullYear() === y && today.getMonth() === m && today.getDate() === d;
      const hasEvent = eventDays.has(d);
      const isSelected = selectedDay === d && current.getMonth() === m;
      html += `<div class="day${isToday ? ' today' : ''}${hasEvent ? ' has-event' : ''}${isSelected ? ' selected' : ''}" data-day="${d}">${d}</div>`;
    }

    grid.innerHTML = html;

    grid.querySelectorAll('.day[data-day]').forEach((el) => {
      el.addEventListener('click', () => {
        selectedDay = Number(el.dataset.day);
        renderCalendar();
        filterEvents();
      });
    });
  }

  function renderEvents() {
    const list = document.getElementById('event-list');
    if (!list) return;

    list.innerHTML = EVENTS.map((e, i) => `
      <article class="event-card" data-month="${e.month}" data-day="${e.day}">
        <div class="event-date">
          <div class="day-num">${e.day}</div>
          <div class="day-mon">${MONTHS[e.month - 1]}</div>
        </div>
        <div>
          <div class="event-meta">
            <span class="badge lime">${e.tag}</span>
            ${e.limited ? '<span class="badge coral">限时</span>' : ''}
          </div>
          <h3 class="xpark-h4" style="margin:0 0 4px">${e.title}</h3>
          <p class="xpark-body text-muted" style="margin:0;font-size:0.9375rem">${e.desc}</p>
          <p class="xpark-caption mono" style="margin-top:8px">10:00 — 20:00 · 中央广场</p>
        </div>
        <a href="#" class="btn ghost sm">详情</a>
      </article>
    `).join('');
  }

  function filterEvents() {
    const m = current.getMonth() + 1;
    document.querySelectorAll('.event-card').forEach((card) => {
      const matchMonth = Number(card.dataset.month) === m;
      const matchDay = selectedDay === null || Number(card.dataset.day) === selectedDay;
      card.classList.toggle('is-hidden', !(matchMonth && matchDay));
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderCalendar();
    renderEvents();

    document.getElementById('cal-prev')?.addEventListener('click', () => {
      current.setMonth(current.getMonth() - 1);
      selectedDay = null;
      renderCalendar();
      filterEvents();
    });
    document.getElementById('cal-next')?.addEventListener('click', () => {
      current.setMonth(current.getMonth() + 1);
      selectedDay = null;
      renderCalendar();
      filterEvents();
    });

    document.getElementById('clear-filter')?.addEventListener('click', (e) => {
      e.preventDefault();
      selectedDay = null;
      renderCalendar();
      filterEvents();
    });
  });
})();
