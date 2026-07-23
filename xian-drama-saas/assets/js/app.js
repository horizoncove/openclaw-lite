/* ============================================================
   西安微短剧产业联盟服务中心 · 管理平台 SaaS+AI
   路由 + 视图渲染 + 交互
   ============================================================ */
const App = {
  charts: {},
  state: { memberFilter:'', projectStage:'全部', resTab:'actor', aiTool:'home', centersTab:'overseas' },
  routes: {},
  /* ---------- 导航菜单 ---------- */
  menu: [
    { g:"工作台", items:[{i:"dashboard",t:"产业驾驶舱",ico:"📊"}] },
    { g:"产业联盟", items:[
      {i:"members",t:"联盟成员",ico:"🤝"},
      {i:"onboarding",t:"入驻申请",ico:"📝",badge:"3"},
    ]},
    { g:"业务管理", items:[
      {i:"projects",t:"短剧项目",ico:"🎬"},
      {i:"centers",t:"五大中心",ico:"🏛️"},
      {i:"copyright",t:"版权服务",ico:"🛡️"},
      {i:"resources",t:"资源调度",ico:"🎞️"},
    ]},
    { g:"经营分析", items:[
      {i:"finance",t:"财务订单",ico:"💰"},
      {i:"analytics",t:"数据分析",ico:"📈"},
    ]},
    { g:"智能中枢", items:[
      {i:"ai",t:"AI 智能工作台",ico:"✨",badge:"AI"},
      {i:"settings",t:"系统设置",ico:"⚙️"},
    ]},
  ],

  /* ==================== 初始化 ==================== */
  init(){
    document.getElementById('year').textContent = new Date().getFullYear();
    this.renderNav();
    // 登录
    document.getElementById('loginForm').addEventListener('submit',e=>{
      e.preventDefault();
      document.getElementById('loginView').style.display='none';
      document.getElementById('app').classList.remove('hidden');
      location.hash = location.hash || '#/dashboard';
      this.toast('欢迎回来，管理员','ok');
    });
    // 路由
    window.addEventListener('hashchange',()=>this.route());
    // 侧边栏移动端
    document.getElementById('menuToggle').onclick=()=>this.toggleSidebar(true);
    document.getElementById('sidebarMask').onclick=()=>this.toggleSidebar(false);
    document.getElementById('globalSearch').addEventListener('keydown',e=>{
      if(e.key==='Enter'){ this.state.search=e.target.value; this.go('projects'); }
    });
    if(!location.hash) location.hash='#/dashboard';
    else this.route();
  },

  renderNav(){
    const nav = document.getElementById('navMenu');
    nav.innerHTML = this.menu.map(grp=>`
      <div class="nav-group-title">${grp.g}</div>
      ${grp.items.map(it=>`
        <a data-route="${it.i}" onclick="App.go('${it.i}')">
          <span class="nav-ico">${it.ico}</span>
          <span>${it.t}</span>
          ${it.badge?`<span class="nav-badge">${it.badge}</span>`:''}
        </a>`).join('')}
    `).join('');
  },

  go(r){ location.hash='#/'+r; if(window.innerWidth<=1024) this.toggleSidebar(false); },
  route(){
    const path = (location.hash||'').replace('#/','') || 'dashboard';
    const [r, sub] = path.split('/');
    this.renderNavActive(r);
    const crumb = this.findMenu(r)?.t || '产业驾驶舱';
    document.getElementById('pageCrumb').textContent = crumb;
    const view = document.getElementById('view');
    view.scrollTop=0;
    try{ Object.values(this.charts).forEach(c=>{try{c.destroy()}catch(e){}}); this.charts={}; }catch(e){}
    const fn = (typeof this[r]==='function') ? this[r] : this.dashboard;
    view.innerHTML = fn.call(this, sub);
    this.afterRender(r, sub);
  },
  findMenu(r){ for(const g of this.menu){ const f=g.items.find(i=>i.i===r); if(f) return f; } return null; },
  renderNavActive(r){
    document.querySelectorAll('#navMenu a').forEach(a=>{
      a.classList.toggle('active', a.dataset.route===r);
    });
  },
  afterRender(r, sub){
    if(r==='dashboard') this.drawDashboardCharts();
    if(r==='analytics') this.drawAnalyticsCharts();
    if(r==='finance') this.drawFinanceChart();
    if(r==='centers' && sub) this.state.centersTab=sub;
  },
  toggleSidebar(open){
    document.getElementById('sidebar').classList.toggle('open',open);
    document.getElementById('sidebarMask').classList.toggle('open',open);
  },

  /* ==================== 工具方法 ==================== */
  toast(msg, type='info'){
    const t=document.createElement('div');
    t.className='toast '+type;
    const ico={ok:'✅',err:'❌',warn:'⚠️',info:'💬'}[type];
    t.innerHTML=`<span style="font-size:16px">${ico}</span><span>${msg}</span>`;
    document.getElementById('toasts').appendChild(t);
    setTimeout(()=>{t.style.opacity='0';t.style.transition='.3s';setTimeout(()=>t.remove(),300)},2800);
  },
  modal(title, bodyHtml, footHtml=''){
    const m=document.createElement('div');
    m.className='modal-mask';
    m.innerHTML=`<div class="modal" onclick="event.stopPropagation()">
      <div class="modal-head"><h3>${title}</h3><button class="modal-x" onclick="App.closeModal(this)">×</button></div>
      <div class="modal-body">${bodyHtml}</div>
      ${footHtml?`<div class="modal-foot">${footHtml}</div>`:''}</div>`;
    m.addEventListener('click',()=>m.remove());
    document.body.appendChild(m);
    return m;
  },
  closeModal(el){ el.closest('.modal-mask').remove(); },
  el(id){ return document.getElementById(id); },
  fmtMoney(n){ return '¥'+Number(n).toLocaleString(); },

  /* ==================== 视图 ==================== */
  views:{},

  /* ---------- 仪表盘 ---------- */
  dashboard(){
    const kpis = DB.kpis.map(k=>`
      <div class="kpi" style="--accent:${k.grad.includes('22c55e')||k.ico==='💰'?'#dcfce7':'#eef2ff'}">
        <div class="kpi-top">
          <div class="kpi-ico" style="background:${k.grad}">${k.ico}</div>
        </div>
        <div class="kpi-label">${k.label}</div>
        <div class="kpi-val">${k.val}</div>
        <div class="kpi-trend ${k.up?'trend-up':'trend-down'}">${k.up?'▲':'▼'} ${k.trend} <span class="muted" style="font-weight:400;margin-left:6px">${k.sub}</span></div>
      </div>`).join('');
    const recent = DB.projects.slice(0,5).map(p=>`
      <tr onclick="App.openProject('${p.id}')" style="cursor:pointer">
        <td><div class="flex items-center gap-2"><span style="font-size:20px">${p.cover}</span><div><div class="cell-main">${p.name}</div><div class="cell-sub">${p.genre} · ${p.eps}集</div></div></div></td>
        <td>${this.stageBadge(p.stage)}</td>
        <td><span class="cell-sub">${p.owner}</span></td>
        <td>${p.views==='—'?'<span class="muted">—</span>':`<strong>${p.views}</strong>`}</td>
        <td>${p.ROI?`<span class="trend-up">▲ ${p.ROI}×</span>`:'<span class="muted">—</span>'}</td>
        <td><span class="cell-sub">${p.update}</span></td>
      </tr>`).join('');
    const notes = DB.notifications.map(n=>`
      <div style="display:flex;gap:10px;padding:11px 0;border-bottom:1px solid #f1f5f9">
        <span style="font-size:16px">${ {warn:'⚠️',ok:'✅',info:'ℹ️'}[n.type] }</span>
        <div style="flex:1"><div style="font-size:13px;font-weight:600">${n.t}</div><div class="muted" style="font-size:12.5px;margin-top:2px">${n.c}</div></div>
        <span class="muted" style="font-size:11.5px;white-space:nowrap">${n.time}</span>
      </div>`).join('');
    const aiInsights = AI.insight().slice(0,3).map(i=>`
      <div class="mini-stat" style="align-items:flex-start">
        <div class="ms-ico" style="background:linear-gradient(135deg,#d4af37,#b8941f)">${i.ico}</div>
        <div><strong style="font-size:13.5px">${i.t}</strong><div class="muted" style="font-size:12px;margin-top:3px;line-height:1.6">${i.d}</div></div>
      </div>`).join('');
    return `
    <div class="page-head">
      <div><h2>产业驾驶舱</h2><p>西安微短剧产业联盟服务中心 · 全局运营概览（2025年7月）</p></div>
      <div class="page-actions">
        <button class="btn-ghost" onclick="App.aiDrawer(true)">✨ AI 复盘</button>
        <button class="btn-primary" onclick="App.go('ai')">＋ 新建 AI 任务</button>
      </div>
    </div>
    <div class="kpi-grid" style="margin-bottom:18px">${kpis}</div>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4" style="display:grid;grid-template-columns:1fr;gap:16px">
      <div class="card" style="grid-column:span 2">
        <div class="card-head"><div class="card-title"><span class="ico">📈</span>上线作品 & GMV 趋势</div>
          <div class="tag-row"><span class="badge badge-blue">作品数</span><span class="badge badge-gold">GMV(万)</span></div></div>
        <canvas id="cTrend" height="120"></canvas>
      </div>
      <div class="card">
        <div class="card-head"><div class="card-title"><span class="ico">🎭</span>题材分布</div></div>
        <canvas id="cGenre" height="180"></canvas>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr;gap:16px;margin-top:16px">
      <div class="grid lg:grid-cols-3 gap-4" style="display:grid;grid-template-columns:1fr;gap:16px">
        <div class="card" style="grid-column:span 2">
          <div class="card-head"><div class="card-title"><span class="ico">🎬</span>近期项目</div>
            <a class="btn-soft btn-sm" onclick="App.go('projects')">查看全部 →</a></div>
          <div style="overflow:auto"><table class="tbl"><thead><tr>
            <th>项目</th><th>阶段</th><th>制作方</th><th>播放</th><th>ROI</th><th>更新</th></tr></thead>
            <tbody>${recent}</tbody></table></div>
        </div>
        <div class="card">
          <div class="card-head"><div class="card-title"><span class="ico">🔔</span>实时动态</div></div>
          <div style="max-height:330px;overflow:auto">${notes}</div>
        </div>
      </div>
    </div>
    <div class="card" style="margin-top:16px;background:linear-gradient(135deg,#f5f3ff,#fffbeb);border-color:#e0e7ff">
      <div class="card-head"><div class="card-title"><span class="ico">✨</span>AI 经营复盘 · 自动洞察</div>
        <button class="btn-soft btn-sm" onclick="App.go('ai')">进入 AI 工作台 →</button></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px">${aiInsights}</div>
    </div>`;
  },

  drawDashboardCharts(){
    const t=DB.charts.trend;
    this.charts.trend=new Chart(this.el('cTrend'),{
      type:'bar',
      data:{labels:t.labels,datasets:[
        {type:'bar',label:'作品数',data:t.works,backgroundColor:'rgba(99,102,241,.5)',borderRadius:6,borderWidth:0,yAxisID:'y',barPercentage:.5},
        {type:'line',label:'GMV(万)',data:t.gmv,borderColor:'#d4af37',backgroundColor:'rgba(212,175,55,.12)',tension:.4,fill:true,yAxisID:'y1',pointRadius:3,pointBackgroundColor:'#d4af37'}
      ]},
      options:this.chartOpt({scales:{
        y:{position:'left',grid:{color:'#f1f5f9'}},
        y1:{position:'right',grid:{display:false}}
      }})});
    this.charts.genre=new Chart(this.el('cGenre'),{
      type:'doughnut',
      data:{labels:DB.charts.genre.labels,datasets:[{data:DB.charts.genre.data,backgroundColor:['#6366f1','#ec4899','#f59e0b','#0ea5e9','#a16207','#94a3b8'],borderWidth:0}]},
      options:this.chartOpt({cutout:'62%',plugins:{legend:{position:'right',labels:{boxWidth:10,font:{size:11}}}}})});
  },
  chartOpt(extra={}){
    return Object.assign({
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false,labels:{font:{size:11}}}},
      scales:{x:{grid:{display:false},ticks:{font:{size:11}}},y:{grid:{color:'#f1f5f9'},ticks:{font:{size:11}}}}
    }, extra);
  },

  /* ---------- 联盟成员 ---------- */
  members(){
    const types=['全部','制作公司','MCN 机构','平台方','投资机构','高校院所','技术服务商'];
    const f=this.state.memberFilter;
    const list=DB.members.filter(m=>!f||f==='全部'||m.type===f);
    const levelBadge={理事单位:'badge-gold',骨干单位:'badge-blue',战略单位:'badge-violet',合作单位:'badge-gray'};
    const rows=list.map(m=>`
      <tr>
        <td><div class="flex items-center gap-2"><div class="logo-tile" style="background:${m.color}">${m.name[0]}</div>
          <div><div class="cell-main">${m.name}</div><div class="cell-sub">${m.id}</div></div></div></td>
        <td><span class="badge badge-gray">${m.type}</span></td>
        <td><span class="badge ${levelBadge[m.level]||'badge-gray'}">${m.level}</span></td>
        <td><div class="cell-main">${m.contact}</div><div class="cell-sub">${m.phone}</div></td>
        <td><span class="cell-sub">${m.email}</span></td>
        <td>${m.projects?`${m.projects} 个`:'<span class="muted">—</span>'}</td>
        <td><span class="badge ${m.status==='正常'?'badge-green':m.status==='待年审'?'badge-amber':'badge-red'}">${m.status}</span></td>
        <td><span class="cell-sub">${m.join}</span></td>
        <td><button class="btn-ghost btn-sm" onclick="App.viewMember('${m.id}')">详情</button></td>
      </tr>`).join('');
    const typeDist=types.slice(1).map(tp=>{
      const c=DB.members.filter(m=>m.type===tp).length;
      return {tp,c};
    });
    return `
    <div class="page-head">
      <div><h2>联盟成员管理</h2><p>共 ${DB.members.length} 家成员机构 · 覆盖产业链上下游</p></div>
      <div class="page-actions">
        <button class="btn-ghost" onclick="App.exportData('成员')">⬇ 导出名册</button>
        <button class="btn-primary" onclick="App.memberForm()">＋ 新增成员</button>
      </div>
    </div>
    <div class="grid lg:grid-cols-4 gap-4" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:16px">
      ${typeDist.map(d=>`<div class="mini-stat"><div class="ms-ico" style="background:#6366f1">🏢</div><div><strong>${d.c}</strong><span>${d.tp}</span></div></div>`).join('')}
    </div>
    <div class="card">
      <div class="card-head">
        <div class="tabs" style="border:none;margin:0">
          ${types.map(t=>`<button class="tab ${f===t||(!f&&t==='全部')?'active':''}" onclick="App.state.memberFilter='${t}';App.refresh()">${t}</button>`).join('')}
        </div>
      </div>
      <div style="overflow:auto"><table class="tbl"><thead><tr>
        <th>成员机构</th><th>类型</th><th>层级</th><th>联系人</th><th>邮箱</th><th>项目数</th><th>状态</th><th>入盟日期</th><th>操作</th>
      </tr></thead><tbody>${rows}</tbody></table></div>
    </div>`;
  },
  refresh(){ this.route(); },

  memberForm(){
    this.modal('新增联盟成员',`
      <div class="form-grid">
        <div class="form-row">
          <div class="field"><label>机构名称</label><input placeholder="如：长安光影影视文化" /></div>
          <div class="field"><label>机构类型</label><select>${['制作公司','MCN 机构','平台方','投资机构','高校院所','技术服务商'].map(t=>`<option>${t}</option>`).join('')}</select></div>
        </div>
        <div class="form-row">
          <div class="field"><label>成员层级</label><select>${['理事单位','骨干单位','战略单位','合作单位'].map(t=>`<option>${t}</option>`).join('')}</select></div>
          <div class="field"><label>联系人</label><input placeholder="姓名" /></div>
        </div>
        <div class="form-row">
          <div class="field"><label>联系电话</label><input placeholder="手机" /></div>
          <div class="field"><label>邮箱</label><input placeholder="邮箱" /></div>
        </div>
        <div class="field"><label>入盟意向</label><textarea placeholder="简述机构情况与入盟意向"></textarea></div>
      </div>`,
      `<button class="btn-ghost" onclick="App.closeModal(this)">取消</button>
       <button class="btn-primary" onclick="App.closeModal(this);App.toast('成员已添加并提交审核','ok')">提交审核</button>`);
  },
  viewMember(id){
    const m=DB.members.find(x=>x.id===id); if(!m) return;
    const prjs=DB.projects.filter(p=>p.owner===m.name);
    this.modal(m.name,`
      <div style="display:flex;gap:14px;align-items:center;margin-bottom:18px">
        <div class="logo-tile" style="width:56px;height:56px;font-size:24px;background:${m.color}">${m.name[0]}</div>
        <div><div style="font-size:17px;font-weight:700">${m.name}</div>
        <div class="muted" style="font-size:13px;margin-top:3px">${m.id} · ${m.type} · ${m.level}</div></div>
      </div>
      <div class="grid grid-cols-2 gap-3" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px">
        <div class="mini-stat"><div class="ms-ico" style="background:#6366f1">👤</div><div><strong>${m.contact}</strong><span>联系人</span></div></div>
        <div class="mini-stat"><div class="ms-ico" style="background:#0ea5e9">🎬</div><div><strong>${m.projects}</strong><span>关联项目</span></div></div>
        <div class="mini-stat"><div class="ms-ico" style="background:#10b981">📞</div><div><strong style="font-size:13px">${m.phone}</strong><span>电话</span></div></div>
        <div class="mini-stat"><div class="ms-ico" style="background:#f59e0b">📅</div><div><strong style="font-size:13px">${m.join}</strong><span>入盟日期</span></div></div>
      </div>
      <div style="font-weight:600;margin-bottom:10px">关联项目（${prjs.length}）</div>
      ${prjs.length?`<div style="display:flex;flex-direction:column;gap:8px">${prjs.map(p=>`<div style="display:flex;justify-content:space-between;padding:10px 12px;background:#f8fafc;border-radius:10px"><span><span style="font-size:16px">${p.cover}</span> ${p.name}</span>${this.stageBadge(p.stage)}</div>`).join('')}</div>`
        :`<div class="empty"><div class="e-ico">📭</div>暂无关联项目</div>`}
      <div style="margin-top:16px;padding:12px;background:#f8fafc;border-radius:10px;font-size:12.5px" class="muted">联系邮箱：${m.email}</div>`);
  },

  /* ---------- 入驻申请 ---------- */
  onboarding(){
    const apps=[
      {name:"秦风数字资产",type:"技术服务商",date:"2025-07-22",status:"待审核",person:"秦工",note:"主营短剧 SaaS 工具与数字资产上链"},
      {name:"九州短剧联盟",type:"制作公司",date:"2025-07-21",status:"资料补充中",person:"钱总",note:"北京制作团队，拟在西安设分部"},
      {name:"丝路语桥翻译",type:"技术服务商",date:"2025-07-20",status:"待审核",person:"郑院长",note:"专注小语种本地化，对接出海"},
    ];
    const rows=apps.map(a=>`<tr>
      <td><div class="cell-main">${a.name}</div><div class="cell-sub">${a.date}</div></td>
      <td><span class="badge badge-gray">${a.type}</span></td>
      <td>${a.person}</td>
      <td><span class="muted" style="font-size:12.5px">${a.note}</span></td>
      <td><span class="badge ${a.status==='待审核'?'badge-amber':'badge-blue'}">${a.status}</span></td>
      <td>
        <button class="btn-soft btn-sm" onclick="App.toast('已通过审核并开通账号','ok')">通过</button>
        <button class="btn-danger" onclick="App.toast('已驳回申请','warn')">驳回</button>
      </td></tr>`).join('');
    return `
    <div class="page-head"><div><h2>入驻申请</h2><p>处理新机构的联盟入驻申请 · 待处理 ${apps.length} 件</p></div></div>
    <div class="card"><div style="overflow:auto"><table class="tbl"><thead><tr>
      <th>申请机构</th><th>类型</th><th>联系人</th><th>意向说明</th><th>状态</th><th>操作</th></tr></thead>
      <tbody>${rows}</tbody></table></div></div>`;
  },

  /* ---------- 短剧项目 ---------- */
  projects(){
    const stages=['全部',...DB.projectStage];
    const f=this.state.projectStage;
    const list=DB.projects.filter(p=>f==='全部'||p.stage===f);
    const stageColor={立项:'badge-gray',备案:'badge-blue',制作:'badge-violet',审片:'badge-amber',发行:'badge-gold',上线:'badge-green',复盘:'badge-blue',归档:'badge-gray'};
    const cards=list.map(p=>`
      <div class="card" style="cursor:pointer;padding:0;overflow:hidden" onclick="App.openProject('${p.id}')">
        <div class="center-banner" style="height:90px;background:${p.color};margin:0;border-radius:0">${p.cover}</div>
        <div style="padding:16px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div><div class="cell-main" style="font-size:15px">${p.name}</div><div class="cell-sub">${p.id} · ${p.genre}</div></div>
            ${this.stageBadge(p.stage)}
          </div>
          <div style="display:flex;gap:14px;margin-top:12px;font-size:12.5px" class="muted">
            <span>🎬 ${p.eps}集×${p.epLen}</span>
            <span>👤 ${p.director}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:12px;padding-top:12px;border-top:1px solid #f1f5f9">
            <div><div class="muted" style="font-size:11px">预算(万)</div><strong>${p.budget}</strong></div>
            <div><div class="muted" style="font-size:11px">播放</div><strong>${p.views}</strong></div>
            <div><div class="muted" style="font-size:11px">ROI</div><strong class="${p.ROI?'trend-up':'muted'}">${p.ROI?p.ROI+'×':'—'}</strong></div>
          </div>
        </div>
      </div>`).join('');
    return `
    <div class="page-head">
      <div><h2>短剧项目管理</h2><p>全生命周期：立项 → 备案 → 制作 → 审片 → 发行 → 上线 → 复盘</p></div>
      <div class="page-actions">
        <button class="btn-ghost" onclick="App.aiDrawer(true);App.state.aiTool='script'">✨ AI 生成剧本</button>
        <button class="btn-primary" onclick="App.projectForm()">＋ 新建项目</button>
      </div>
    </div>
    <div class="tabs">
      ${stages.map(s=>`<button class="tab ${(f||'全部')===s?'active':''}" onclick="App.state.projectStage='${s}';App.refresh()">${s}${s!=='全部'?` (${DB.projects.filter(p=>p.stage===s).length})`:''}</button>`).join('')}
    </div>
    ${list.length?`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px">${cards}</div>`
      :`<div class="empty"><div class="e-ico">🎬</div>该阶段暂无项目</div>`}`;
  },
  stageBadge(s){
    const map={立项:'badge-gray',备案:'badge-blue',制作:'badge-violet',审片:'badge-amber',发行:'badge-gold',上线:'badge-green',复盘:'badge-blue',归档:'badge-gray'};
    return `<span class="badge ${map[s]||'badge-gray'}">${s}</span>`;
  },
  projectForm(){
    this.modal('新建短剧项目',`
      <div class="form-grid">
        <div class="form-row">
          <div class="field"><label>项目名称</label><input placeholder="如：长安十二时辰·暗夜" /></div>
          <div class="field"><label>题材</label><select>${['古风','甜宠','都市','玄幻','年代','悬疑','其他'].map(t=>`<option>${t}</option>`).join('')}</select></div>
        </div>
        <div class="form-row">
          <div class="field"><label>总集数</label><input type="number" value="80" /></div>
          <div class="field"><label>单集时长</label><select><option>1.5min</option><option>2min</option><option>3min</option></select></div>
        </div>
        <div class="form-row">
          <div class="field"><label>制作方</label><select>${DB.members.filter(m=>m.type==='制作公司').map(m=>`<option>${m.name}</option>`).join('')}</select></div>
          <div class="field"><label>预算(万)</label><input type="number" value="30" /></div>
        </div>
        <div class="field"><label>一句话梗概</label><textarea placeholder="用 AI 一键生成梗概 → 提交后可在 AI 工作台继续创作"></textarea></div>
      </div>`,
      `<button class="btn-ghost" onclick="App.closeModal(this)">取消</button>
       <button class="btn-primary" onclick="App.closeModal(this);App.toast('项目已创建并进入立项阶段','ok')">创建项目</button>`);
  },
  openProject(id){
    const p=DB.projects.find(x=>x.id===id); if(!p) return;
    const idx=DB.projectStage.indexOf(p.stage);
    const stages=DB.projectStage;
    const tl=stages.map((s,i)=>`<div class="tl-item ${i<idx?'done':''} ${i===idx?'cur':''}">
      <h5>${s}</h5><div class="tl-meta">${i<idx?'已完成':i===idx?'进行中 · '+p.update:'待启动'}</div></div>`).join('');
    this.modal(p.name,`
      <div style="display:flex;gap:16px;align-items:center;margin-bottom:18px">
        <div class="center-banner" style="width:90px;height:90px;background:${p.color};font-size:36px;margin:0">${p.cover}</div>
        <div style="flex:1"><div style="font-size:18px;font-weight:700">${p.name}</div>
        <div class="muted" style="font-size:13px;margin-top:4px">${p.id} · ${p.genre} · ${p.eps}集×${p.epLen}</div>
        <div style="margin-top:8px">${this.stageBadge(p.stage)}</div></div>
      </div>
      <div class="grid grid-cols-4 gap-3" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px">
        <div class="mini-stat"><div class="ms-ico" style="background:#6366f1">💰</div><div><strong>${p.budget}万</strong><span>预算</span></div></div>
        <div class="mini-stat"><div class="ms-ico" style="background:#0ea5e9">📺</div><div><strong style="font-size:13px">${p.views}</strong><span>播放</span></div></div>
        <div class="mini-stat"><div class="ms-ico" style="background:#10b981">📈</div><div><strong>${p.ROI?p.ROI+'×':'—'}</strong><span>ROI</span></div></div>
        <div class="mini-stat"><div class="ms-ico" style="background:#d4af37">🛡️</div><div><strong>${p.compliance||'—'}</strong><span>合规分</span></div></div>
      </div>
      <div class="grid lg:grid-cols-2 gap-4" style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div><div style="font-weight:600;margin-bottom:12px">项目进度</div><div class="timeline">${tl}</div></div>
        <div>
          <div style="font-weight:600;margin-bottom:12px">项目信息</div>
          <div style="font-size:13px;line-height:2">
            <div>制作方：<strong>${p.owner}</strong></div>
            <div>导演：<strong>${p.director}</strong></div>
            <div>更新时间：${p.update}</div>
            <div>题材：${p.genre}</div>
          </div>
          <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn-soft btn-sm" onclick="App.closeModal(this);App.go('ai');App.state.aiTool='compliance'">🛡️ AI 合规预审</button>
            <button class="btn-soft btn-sm" onclick="App.closeModal(this);App.go('ai');App.state.aiTool='marketing'">📣 生成宣发文案</button>
          </div>
        </div>
      </div>`);
  },

  /* ---------- 五大服务中心 ---------- */
  centers(){
    const cards=DB.centers.map(c=>`
      <div class="center-card">
        <div class="center-banner" style="background:${c.grad}">${c.ico}</div>
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div><div class="cell-main" style="font-size:16px">${c.name}</div><div class="muted" style="font-size:11.5px">${c.en}</div></div>
        </div>
        <p class="muted" style="font-size:12.5px;margin:10px 0 14px;line-height:1.6">${c.summary}</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
          ${c.metrics.map(m=>`<div class="mini-stat" style="padding:10px"><div><strong style="font-size:15px">${m.v}</strong><span style="font-size:11px">${m.k}</span></div></div>`).join('')}
        </div>
        <button class="btn-soft btn-sm" style="width:100%" onclick="App.go('centers/${c.id}')">进入工作台 →</button>
      </div>`).join('');
    return `
    <div class="page-head"><div><h2>五大专业服务中心</h2><p>覆盖微短剧全生命周期 · 中心协同交付</p></div>
      <div class="page-actions"><button class="btn-ghost" onclick="App.go('ai')">✨ AI 赋能各中心</button></div></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">${cards}</div>`;
  },

  /* ---------- 版权服务 ---------- */
  copyright(){
    const crRows=DB.copyrights.map(c=>`<tr>
      <td><div class="cell-main">${c.work}</div><div class="cell-sub">${c.id}</div></td>
      <td><span class="badge badge-violet">${c.type}</span></td>
      <td><span class="cell-sub">${c.holder}</span></td>
      <td><span class="id-tag">${c.cert}</span></td>
      <td><span class="id-tag">${c.block}</span></td>
      <td><span class="badge ${c.status==='已确权'?'badge-green':'badge-amber'}">${c.status}</span></td>
      <td><span class="cell-sub">${c.time}</span></td>
    </tr>`).join('');
    const inRows=DB.infringements.map(i=>`<tr>
      <td><div class="cell-main">${i.work}</div><div class="cell-sub">${i.id}</div></td>
      <td>${i.platform}</td>
      <td><span class="id-tag">${i.url}</span></td>
      <td><div style="display:flex;align-items:center;gap:8px"><div class="bar" style="width:60px"><i style="width:${i.confidence}%"></i></div>${i.confidence}%</div></td>
      <td><span class="badge ${i.status==='已发函'?'badge-blue':i.status==='监测中'?'badge-amber':'badge-red'}">${i.status}</span></td>
      <td><span class="cell-sub">${i.found}</span></td>
      <td><button class="btn-soft btn-sm" onclick="App.toast('已生成维权函并提交','ok')">维权</button></td>
    </tr>`).join('');
    return `
    <div class="page-head"><div><h2>版权服务中心</h2><p>确权存证 · 授权交易 · 侵权监测 · 维权协助</p></div>
      <div class="page-actions"><button class="btn-primary" onclick="App.toast('确权申请已提交，24h 内上链','ok')">＋ 新增确权</button></div></div>
    <div class="grid grid-cols-4 gap-3" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:16px">
      <div class="mini-stat"><div class="ms-ico" style="background:#8b5cf6">🛡️</div><div><strong>428</strong><span>确权作品</span></div></div>
      <div class="mini-stat"><div class="ms-ico" style="background:#6366f1">⛓️</div><div><strong>402</strong><span>存证上链</span></div></div>
      <div class="mini-stat"><div class="ms-ico" style="background:#f59e0b">🔍</div><div><strong>156</strong><span>侵权监测</span></div></div>
      <div class="mini-stat"><div class="ms-ico" style="background:#10b981">⚖️</div><div><strong>73</strong><span>维权成功</span></div></div>
    </div>
    <div class="tabs"><button class="tab active" onclick="App.tabSwap(this,'cr')">版权确权</button><button class="tab" onclick="App.tabSwap(this,'in')">侵权监测</button></div>
    <div id="tabCr" class="card"><div class="card-head"><div class="card-title"><span class="ico">⛓️</span>区块链版权存证</div></div>
      <div style="overflow:auto"><table class="tbl"><thead><tr><th>作品</th><th>权利类型</th><th>持有人</th><th>登记号</th><th>区块哈希</th><th>状态</th><th>时间</th></tr></thead>
      <tbody>${crRows}</tbody></table></div></div>
    <div id="tabIn" class="card hidden"><div class="card-head"><div class="card-title"><span class="ico">🔍</span>侵权监测与维权</div></div>
      <div style="overflow:auto"><table class="tbl"><thead><tr><th>被侵作品</th><th>侵权平台</th><th>链接</th><th>相似度</th><th>状态</th><th>发现时间</th><th>操作</th></tr></thead>
      <tbody>${inRows}</tbody></table></div></div>`;
  },
  tabSwap(btn,which){
    btn.parentElement.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    btn.classList.add('active');
    this.el('tabCr').classList.toggle('hidden',which!=='cr');
    this.el('tabIn').classList.toggle('hidden',which!=='in');
  },

  /* ---------- 资源调度 ---------- */
  resources(){
    const tab=this.state.resTab;
    let body='';
    if(tab==='actor'){
      body=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px">
        ${DB.actors.map(a=>`<div class="card">
          <div style="display:flex;gap:12px;align-items:center">
            <div class="logo-tile" style="width:48px;height:48px;font-size:18px;background:linear-gradient(135deg,#ec4899,#f59e0b)">${a.name[0]}</div>
            <div><div class="cell-main" style="font-size:15px">${a.name}</div><div class="cell-sub">${a.gender} · ${a.age}岁 · ⭐${a.rating}</div></div>
          </div>
          <div class="tag-row" style="margin:12px 0">${a.tags.map(t=>`<span class="badge badge-gray">${t}</span>`).join('')}</div>
          <div style="display:flex;justify-content:space-between;font-size:12.5px"><span class="muted">作品 ${a.works} 部</span><span class="badge ${a.status==='档期可约'?'badge-green':'badge-amber'}">${a.status}</span></div>
          <div class="muted" style="font-size:11.5px;margin-top:6px">可约档期：${a.avail}</div>
        </div>`).join('')}</div>`;
    } else if(tab==='loc'){
      body=`<div style="overflow:auto"><table class="tbl"><thead><tr><th>场地</th><th>类型</th><th>区域</th><th>特色</th><th>日租</th><th>状态</th><th>档期</th></tr></thead><tbody>
        ${DB.locations.map(l=>`<tr><td><div class="cell-main">${l.name}</div><div class="cell-sub">${l.id}</div></td><td><span class="badge badge-blue">${l.type}</span></td><td>${l.area}</td><td><div class="tag-row">${l.feat.map(f=>`<span class="badge badge-gray">${f}</span>`).join('')}</div></td><td><strong>${l.price}</strong></td><td><span class="badge ${l.status==='可预订'?'badge-green':l.status==='需报批'?'badge-amber':'badge-gray'}">${l.status}</span></td><td><span class="cell-sub">${l.avail}</span></td></tr>`).join('')}
      </tbody></table></div>`;
    } else {
      body=`<div style="overflow:auto"><table class="tbl"><thead><tr><th>设备</th><th>类型</th><th>日租</th><th>状态</th><th>可用</th><th>操作</th></tr></thead><tbody>
        ${DB.equipments.map(e=>`<tr><td><div class="cell-main">${e.name}</div><div class="cell-sub">${e.id}</div></td><td><span class="badge badge-violet">${e.type}</span></td><td><strong>${e.price}</strong></td><td><span class="badge ${e.status==='在库'?'badge-green':'badge-amber'}">${e.status}</span></td><td>${e.avail} 台</td><td><button class="btn-soft btn-sm" onclick="App.toast('已加入预约清单','ok')">预约</button></td></tr>`).join('')}
      </tbody></table></div>`;
    }
    const tabs=[['actor','🎬 演员库'],['loc','📍 场地库'],['equip','🎥 设备库']];
    return `
    <div class="page-head"><div><h2>资源调度中心</h2><p>演员 · 场地 · 设备 统一调度，降低制作门槛</p></div>
      <div class="page-actions"><button class="btn-primary" onclick="App.toast('资源预约单已创建','ok')">＋ 新建预约</button></div></div>
    <div class="tabs">${tabs.map(t=>`<button class="tab ${tab===t[0]?'active':''}" onclick="App.state.resTab='${t[0]}';App.refresh()">${t[1]}</button>`).join('')}</div>
    ${body}`;
  },

  /* ---------- 财务订单 ---------- */
  finance(){
    const rows=DB.orders.map(o=>`<tr>
      <td><div class="cell-main">${o.id}</div><div class="cell-sub">${o.date}</div></td>
      <td><span class="cell-sub">${o.member}</span></td>
      <td>${o.product}</td>
      <td><span class="badge badge-gray">${o.cycle}</span></td>
      <td><strong>${this.fmtMoney(o.amount)}</strong></td>
      <td>${o.channel}</td>
      <td><span class="badge ${o.pay==='已支付'?'badge-green':o.pay==='待支付'?'badge-amber':o.pay==='已退款'?'badge-red':'badge-blue'}">${o.pay}</span></td>
    </tr>`).join('');
    const total=DB.orders.filter(o=>o.pay==='已支付').reduce((s,o)=>s+o.amount,0);
    const pending=DB.orders.filter(o=>o.pay==='待支付').reduce((s,o)=>s+o.amount,0);
    return `
    <div class="page-head"><div><h2>财务订单</h2><p>SaaS 订阅 + 单次服务 · 收入与回款管理</p></div>
      <div class="page-actions"><button class="btn-ghost" onclick="App.exportData('订单')">⬇ 导出账单</button><button class="btn-primary" onclick="App.toast('订单已生成','ok')">＋ 新建订单</button></div></div>
    <div class="grid grid-cols-4 gap-3" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:16px">
      <div class="mini-stat"><div class="ms-ico" style="background:#10b981">💰</div><div><strong>${this.fmtMoney(total)}</strong><span>已收款</span></div></div>
      <div class="mini-stat"><div class="ms-ico" style="background:#f59e0b">⏳</div><div><strong>${this.fmtMoney(pending)}</strong><span>待收款</span></div></div>
      <div class="mini-stat"><div class="ms-ico" style="background:#6366f1">📦</div><div><strong>${DB.orders.length}</strong><span>订单总数</span></div></div>
      <div class="mini-stat"><div class="ms-ico" style="background:#d4af37">📊</div><div><strong>${Math.round(total/DB.orders.length/1000)}k</strong><span>客单价</span></div></div>
    </div>
    <div class="card" style="margin-bottom:16px"><div class="card-head"><div class="card-title"><span class="ico">📈</span>月度收入趋势</div></div><canvas id="cFin" height="90"></canvas></div>
    <div class="card"><div class="card-head"><div class="card-title"><span class="ico">🧾</span>订单明细</div></div>
      <div style="overflow:auto"><table class="tbl"><thead><tr><th>订单号</th><th>客户</th><th>产品</th><th>周期</th><th>金额</th><th>渠道</th><th>状态</th></tr></thead>
      <tbody>${rows}</tbody></table></div></div>`;
  },
  drawFinanceChart(){
    const t=DB.charts.trend;
    this.charts.fin=new Chart(this.el('cFin'),{
      type:'line',
      data:{labels:t.labels,datasets:[{label:'收入(万)',data:t.gmv,borderColor:'#10b981',backgroundColor:'rgba(16,185,129,.12)',fill:true,tension:.4,pointRadius:3,pointBackgroundColor:'#10b981'}]},
      options:this.chartOpt()});
  },

  /* ---------- 数据分析 ---------- */
  analytics(){
    return `
    <div class="page-head"><div><h2>数据分析</h2><p>产业全局数据看板 · 多维洞察</p></div>
      <div class="page-actions"><button class="btn-ghost" onclick="App.exportData('报表')">⬇ 导出报表</button><button class="btn-primary" onclick="App.aiDrawer(true);App.state.aiTool='insight'">✨ AI 复盘</button></div></div>
    <div class="grid grid-cols-2 gap-4" style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="card"><div class="card-head"><div class="card-title"><span class="ico">📈</span>上线作品趋势</div></div><canvas id="aTrend" height="140"></canvas></div>
      <div class="card"><div class="card-head"><div class="card-title"><span class="ico">🎭</span>题材分布</div></div><canvas id="aGenre" height="140"></canvas></div>
      <div class="card"><div class="card-head"><div class="card-title"><span class="ico">🌏</span>出海地区分布</div></div><canvas id="aOverseas" height="140"></canvas></div>
      <div class="card"><div class="card-head"><div class="card-title"><span class="ico">⚡</span>项目阶段漏斗</div></div><canvas id="aFunnel" height="140"></canvas></div>
    </div>
    <div class="card" style="margin-top:16px;background:linear-gradient(135deg,#f5f3ff,#fffbeb);border-color:#e0e7ff">
      <div class="card-head"><div class="card-title"><span class="ico">✨</span>AI 数据复盘报告</div>
        <button class="btn-soft btn-sm" onclick="App.aiDrawer(true);App.state.aiTool='insight'">重新生成 →</button></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px">
        ${AI.insight().map(i=>`<div class="mini-stat" style="align-items:flex-start"><div class="ms-ico" style="background:linear-gradient(135deg,#d4af37,#b8941f)">${i.ico}</div><div><strong style="font-size:13.5px">${i.t}</strong><div class="muted" style="font-size:12px;margin-top:3px;line-height:1.6">${i.d}</div></div></div>`).join('')}
      </div>
    </div>`;
  },
  drawAnalyticsCharts(){
    const t=DB.charts.trend;
    this.charts.a1=new Chart(this.el('aTrend'),{type:'bar',data:{labels:t.labels,datasets:[{label:'作品数',data:t.works,backgroundColor:'rgba(99,102,241,.6)',borderRadius:6}]},options:this.chartOpt()});
    this.charts.a2=new Chart(this.el('aGenre'),{type:'doughnut',data:{labels:DB.charts.genre.labels,datasets:[{data:DB.charts.genre.data,backgroundColor:['#6366f1','#ec4899','#f59e0b','#0ea5e9','#a16207','#94a3b8'],borderWidth:0}]},options:this.chartOpt({cutout:'58%',plugins:{legend:{position:'right',labels:{boxWidth:10,font:{size:11}}}}})});
    this.charts.a3=new Chart(this.el('aOverseas'),{type:'polarArea',data:{labels:DB.charts.overseas.labels,datasets:[{data:DB.charts.overseas.data,backgroundColor:['#6366f1','#0ea5e9','#f59e0b','#ec4899','#10b981','#a16207'].map(c=>c+'cc')}]},options:this.chartOpt({plugins:{legend:{position:'right',labels:{boxWidth:10,font:{size:11}}}}})});
    this.charts.a4=new Chart(this.el('aFunnel'),{type:'bar',data:{labels:DB.charts.funnel.labels,datasets:[{label:'项目数',data:DB.charts.funnel.data,backgroundColor:['#6366f1','#7c3aed','#8b5cf6','#a855f7','#d946ef','#ec4899'],borderRadius:6}]},options:this.chartOpt({indexAxis:'y'})});
  },

  /* ---------- 系统设置 ---------- */
  settings(){
    const roles=[{n:'超级管理员',p:'全部权限',c:1},{n:'运营经理',p:'业务管理·数据查看',c:4},{n:'中心专员',p:'所属中心操作',c:12},{n:'财务',p:'财务·订单',c:2},{n:'只读成员',p:'仅查看',c:6}];
    return `
    <div class="page-head"><div><h2>系统设置</h2><p>角色权限 · 机构信息 · 平台配置</p></div></div>
    <div class="tabs"><button class="tab active" onclick="App.setSwap(this,'role')">角色权限</button><button class="tab" onclick="App.setSwap(this,'org')">机构信息</button><button class="tab" onclick="App.setSwap(this,'ai')">AI 配置</button></div>
    <div id="setRole" class="card"><div class="card-head"><div class="card-title"><span class="ico">👥</span>角色与权限</div><button class="btn-primary btn-sm" onclick="App.toast('角色已创建','ok')">＋ 新建角色</button></div>
      <div style="overflow:auto"><table class="tbl"><thead><tr><th>角色</th><th>权限范围</th><th>人数</th><th>操作</th></tr></thead><tbody>
      ${roles.map(r=>`<tr><td><div class="cell-main">${r.n}</div></td><td><span class="cell-sub">${r.p}</span></td><td>${r.c}</td><td><button class="btn-ghost btn-sm">编辑</button></td></tr>`).join('')}
      </tbody></table></div></div>
    <div id="setOrg" class="card hidden">
      <div class="form-grid" style="max-width:560px">
        <div class="field"><label>机构名称</label><input value="西安微短剧产业联盟服务中心" /></div>
        <div class="form-row">
          <div class="field"><label>服务热线</label><input value="029-8888 6600" /></div>
          <div class="field"><label>商务邮箱</label><input value="service@xadrama.cn" /></div>
        </div>
        <div class="field"><label>中心地址</label><input value="陕西省西安市·曲江新区文化产业园区" /></div>
        <button class="btn-primary" onclick="App.toast('机构信息已保存','ok')">保存设置</button>
      </div>
    </div>
    <div id="setAi" class="card hidden">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px">
        ${[['剧本创作模型','DramaScript-v3','已启用'],['合规审核模型','ComplyGuard-v2','已启用'],['本地化翻译','PolyLing-v1','已启用'],['智能分镜','ShotGen-v1','灰度'],['行业知识库','ChangAn-Industry','已启用']].map(m=>`
          <div class="mini-stat" style="align-items:flex-start"><div class="ms-ico" style="background:linear-gradient(135deg,#d4af37,#b8941f)">✨</div>
          <div style="flex:1"><strong style="font-size:13.5px">${m[0]}</strong><div class="muted" style="font-size:11.5px">${m[1]}</div>
          <span class="badge ${m[2]==='已启用'?'badge-green':'badge-amber'}" style="margin-top:6px">${m[2]}</span></div></div>`).join('')}
      </div>
      <div style="margin-top:14px"><button class="btn-primary" onclick="App.go('ai')">进入 AI 工作台 →</button></div>
    </div>`;
  },
  setSwap(btn,which){
    btn.parentElement.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    btn.classList.add('active');
    ['Role','Org','Ai'].forEach(k=>this.el('set'+k).classList.toggle('hidden', k.toLowerCase()!==which));
  },

  exportData(name){ this.toast(`${name}数据已导出为 CSV`,'ok'); },

  /* ==================== AI 工作台 ==================== */
  ai(sub){
    this.state.aiTool = sub || this.state.aiTool || 'home';
    const tools=[
      {id:'script',t:'AI 剧本创作',ico:'📝',grad:'linear-gradient(135deg,#6366f1,#8b5cf6)',d:'输入题材与设定，一键生成结构化分集剧本与样片场景',tag:'剧本'},
      {id:'compliance',t:'AI 合规审核',ico:'🛡️',grad:'linear-gradient(135deg,#10b981,#059669)',d:'自动检测政治/暴力/低俗/未保/广告等合规风险并评分',tag:'合规'},
      {id:'marketing',t:'AI 宣发文案',ico:'📣',grad:'linear-gradient(135deg,#f59e0b,#f97316)',d:'一键生成悬念/情感/爽剧/出海多版宣发文案',tag:'宣发'},
      {id:'storyboard',t:'AI 智能分镜',ico:'🎬',grad:'linear-gradient(135deg,#ec4899,#8b5cf6)',d:'根据场景描述自动拆解镜头、时长、动效与音效',tag:'分镜'},
      {id:'insight',t:'AI 数据复盘',ico:'📈',grad:'linear-gradient(135deg,#0ea5e9,#2563eb)',d:'自动归因高低 ROI 项目，生成结构化经营洞察',tag:'复盘'},
      {id:'qa',t:'AI 智能问答',ico:'💬',grad:'linear-gradient(135deg,#d4af37,#b8941f)',d:'基于产业知识库解答备案/出海/版权/投流等问题',tag:'问答'},
    ];
    if(this.state.aiTool==='home' || !tools.find(t=>t.id===this.state.aiTool)){
      return `
      <div class="page-head"><div><h2>AI 智能工作台</h2><p>SaaS + AI · 六大智能工具链覆盖微短剧全链路</p></div>
        <div class="page-actions"><span class="badge badge-gold">✨ 6 个行业模型已就绪</span></div></div>
      <div class="ai-tool-grid">${tools.map(t=>`
        <div class="ai-tool" onclick="App.state.aiTool='${t.id}';App.refresh()">
          <div class="ai-tool-ico" style="background:${t.grad}">${t.ico}</div>
          <h4>${t.t}</h4><p>${t.d}</p>
          <div class="ai-tool-foot">立即使用 →</div>
        </div>`).join('')}</div>
      <div class="card" style="margin-top:18px;background:linear-gradient(135deg,#f5f3ff,#fffbeb);border-color:#e0e7ff">
        <div class="card-head"><div class="card-title"><span class="ico">⚡</span>AI 提效数据</div></div>
        <div class="grid grid-cols-4 gap-3" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px">
          <div class="mini-stat"><div class="ms-ico" style="background:linear-gradient(135deg,#d4af37,#b8941f)">✨</div><div><strong>5,742</strong><span>累计生成(次)</span></div></div>
          <div class="mini-stat"><div class="ms-ico" style="background:#6366f1">⏱️</div><div><strong>8,600h</strong><span>节省工时</span></div></div>
          <div class="mini-stat"><div class="ms-ico" style="background:#10b981">🏢</div><div><strong>52</strong><span>接入机构</span></div></div>
          <div class="mini-stat"><div class="ms-ico" style="background:#0ea5e9">🧠</div><div><strong>6</strong><span>行业模型</span></div></div>
        </div>
      </div>`;
    }
    // 子工具界面
    const map={script:'aiScript',compliance:'aiCompliance',marketing:'aiMarketing',storyboard:'aiStoryboard',insight:'aiInsight',qa:'aiQa'};
    return this[map[this.state.aiTool]](tools);
  },
  aiToolHeader(tool){
    return `<div class="page-head">
      <div><div style="display:flex;align-items:center;gap:10px"><div class="ai-tool-ico" style="background:${tool.grad};width:40px;height:40px;font-size:20px;margin:0">${tool.ico}</div>
      <div><h2 style="margin:0">${tool.t}</h2><p style="margin:3px 0 0">${tool.d}</p></div></div></div>
      <div class="page-actions"><button class="btn-ghost" onclick="App.state.aiTool='home';App.refresh()">← 返回工具集</button></div>
    </div>`;
  },

  /* —— AI 剧本创作 —— */
  aiScript(tools){
    const tool=tools.find(t=>t.id==='script');
    return `${this.aiToolHeader(tool)}
    <div class="grid lg:grid-cols-3 gap-4" style="display:grid;grid-template-columns:1fr;gap:16px">
      <div class="card" style="grid-column:span 1;max-width:340px">
        <div class="card-head"><div class="card-title"><span class="ico">⚙️</span>创作参数</div></div>
        <div class="form-grid">
          <div class="field"><label>题材类型</label><select id="spTheme">${['甜宠','古风','玄幻','都市','悬疑'].map(t=>`<option>${t}</option>`).join('')}</select></div>
          <div class="field"><label>故事背景</label><select id="spSetting"><option>现代都市</option><option>盛唐长安</option><option>修真界</option><option>悬疑现实</option></select></div>
          <div class="field"><label>核心看点</label><select id="spHook"><option>身份反转</option><option>逆袭打脸</option><option>双向暗恋</option><option>悬疑反转</option></select></div>
          <div class="field"><label>集数</label><select id="spEps"><option>6</option><option>12</option><option>24</option><option>80</option></select></div>
          <div class="field"><label>主角设定</label><input id="spLead" value="女主" /></div>
          <button class="btn-primary" style="margin-top:6px" onclick="App.runScript()">✨ 生成剧本</button>
        </div>
      </div>
      <div class="card" style="grid-column:span 2">
        <div class="card-head"><div class="card-title"><span class="ico">🎬</span>剧本输出</div>
          <span class="badge badge-gold" id="spStatus">等待生成</span></div>
        <div id="spOut" class="empty"><div class="e-ico">📝</div>填写参数后点击「生成剧本」，AI 将输出剧名、梗概、分集结构与样片场景</div>
      </div>
    </div>`;
  },
  async runScript(){
    const opt={theme:App.el('spTheme').value,setting:App.el('spSetting').value,hook:App.el('spHook').value,episodes:+App.el('spEps').value,lead:App.el('spLead').value};
    App.el('spStatus').textContent='生成中…'; App.el('spStatus').className='badge badge-amber';
    App.el('spOut').innerHTML=`<div class="ai-thinking"><span></span><span></span><span></span> 正在调用 DramaScript-v3 行业模型…</div>`;
    await AI.delay(900);
    const r=AI.script(opt);
    const txt=`【剧名】${r.title}\n【题材】${r.theme} · ${r.setting} · 看点：${r.hook}\n【集数】${r.episodes} 集\n\n【一句话梗概】${r.logline}\n\n【分集结构】\n${r.epList.map(e=>`第${e.n}集 · ${e.name}（${e.beat}）`).join('\n')}\n\n【样片场景（第1集）】\n${r.sample}`;
    App.el('spStatus').textContent='已完成'; App.el('spStatus').className='badge badge-green';
    App.el('spOut').innerHTML=`<div class="script-out" id="spStream"></div>`;
    await AI.stream(txt, c=>App.el('spStream').textContent=c, {step:3});
    App.el('spOut').innerHTML+=`<div style="margin-top:12px;display:flex;gap:8px"><button class="btn-soft btn-sm" onclick="App.runScript()">🔄 再生成一版</button><button class="btn-primary btn-sm" onclick="App.toast('剧本已保存并创建项目','ok')">💾 保存为项目</button></div>`;
  },

  /* —— AI 合规审核 —— */
  aiCompliance(tools){
    const tool=tools.find(t=>t.id==='compliance');
    return `${this.aiToolHeader(tool)}
    <div class="grid lg:grid-cols-3 gap-4" style="display:grid;grid-template-columns:1fr;gap:16px">
      <div class="card" style="grid-column:span 1;max-width:340px">
        <div class="card-head"><div class="card-title"><span class="ico">📄</span>待审内容</div></div>
        <div class="form-grid">
          <div class="field"><label>剧本/台词文本</label><textarea id="cpInput" style="min-height:140px">本剧包含主角复仇情节，有暴力打斗与暧昧镜头，提及某品牌赞助，涉及未成年人角色饮酒场景，并对历史人物进行戏说改编。</textarea></div>
          <button class="btn-primary" onclick="App.runCompliance()">🛡️ 开始合规审核</button>
        </div>
      </div>
      <div class="card" style="grid-column:span 2">
        <div class="card-head"><div class="card-title"><span class="ico">📊</span>审核结果</div><span class="badge badge-gold" id="cpStatus">待审核</span></div>
        <div id="cpOut" class="empty"><div class="e-ico">🛡️</div>提交文本后，AI 将逐条检测 7 大合规维度并给出风险评分</div>
      </div>
    </div>`;
  },
  async runCompliance(){
    const input=App.el('cpInput').value;
    App.el('cpStatus').textContent='审核中…'; App.el('cpStatus').className='badge badge-amber';
    App.el('cpOut').innerHTML=`<div class="ai-thinking"><span></span><span></span><span></span> 正在调用 ComplyGuard-v2 合规模型…</div>`;
    await AI.delay(1100);
    const r=AI.compliance(input);
    App.el('cpStatus').textContent=r.verdict;
    App.el('cpStatus').className='badge '+(r.verdict==='通过'?'badge-green':r.verdict==='修改后通过'?'badge-amber':'badge-red');
    const items=r.rules.map(x=>`<div class="compliance-item ${x.pass?'pass':x.lv==='高'?'fail':'warn'}">
      <div class="compliance-ico" style="background:${x.pass?'#dcfce7':x.lv==='高'?'#fee2e2':'#fef3c7'};color:${x.pass?'#16a34a':x.lv==='高'?'#dc2626':'#b45309'}">${x.pass?'✓':'!'}</div>
      <div style="flex:1"><div style="font-weight:600;font-size:13.5px">${x.name} <span class="badge ${x.pass?'badge-green':x.lv==='高'?'badge-red':'badge-amber'}" style="margin-left:6px;font-size:10px">${x.lv}风险</span></div>
      <div class="muted" style="font-size:12px;margin-top:3px">${x.risk}</div></div></div>`).join('');
    const color=r.score>=85?'#16a34a':r.score>=70?'#f59e0b':'#dc2626';
    App.el('cpOut').innerHTML=`<div style="display:flex;gap:20px;align-items:center;margin-bottom:16px">
      <div class="score-ring" style="--p:${r.score}%;background:conic-gradient(${color} ${r.score}%,#eef2ff 0)"><div><strong style="font-size:28px;color:${color}">${r.score}</strong><span class="muted" style="font-size:11px">合规分</span></div></div>
      <div><div style="font-size:15px;font-weight:700">审核结论：${r.verdict}</div><div class="muted" style="font-size:12.5px;margin-top:5px;max-width:300px">共检测 7 个维度，其中 ${r.fails.length} 项存在风险，建议优先处理标注为"高风险"的条目后再次提交。</div>
      <button class="btn-soft btn-sm" style="margin-top:10px" onclick="App.toast('已生成整改建议并下发','ok')">📋 生成整改建议</button></div>
    </div>${items}`;
  },

  /* —— AI 宣发文案 —— */
  aiMarketing(tools){
    const tool=tools.find(t=>t.id==='marketing');
    const projs=DB.projects.filter(p=>p.views!=='—');
    return `${this.aiToolHeader(tool)}
    <div class="card" style="margin-bottom:16px">
      <div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:12px;align-items:end">
        <div class="field"><label>作品名称</label><select id="mkTitle">${projs.map(p=>`<option>${p.name}</option>`).join('')}</select></div>
        <div class="field"><label>题材</label><input id="mkGenre" value="古风悬疑" /></div>
        <div class="field"><label>核心标签</label><input id="mkTag" value="身份反转" /></div>
        <button class="btn-primary" onclick="App.runMarketing()">✨ 生成文案</button>
      </div>
    </div>
    <div id="mkOut" class="empty"><div class="e-ico">📣</div>选择作品后点击生成，AI 将输出 4 版不同风格的宣发文案（含出海本地化版）</div>`;
  },
  async runMarketing(){
    const opt={title:App.el('mkTitle').value,genre:App.el('mkGenre').value,tag:App.el('mkTag').value};
    App.el('mkOut').innerHTML=`<div class="ai-thinking"><span></span><span></span><span></span> 正在生成多版文案…</div>`;
    await AI.delay(900);
    const list=AI.marketing(opt);
    const colors=['#6366f1','#ec4899','#f59e0b','#0ea5e9'];
    App.el('mkOut').innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px">${list.map((c,i)=>`
      <div class="card" style="border-top:3px solid ${colors[i]}"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <span class="badge" style="background:${colors[i]}1a;color:${colors[i]}">${c.style}</span>
        <button class="btn-ghost btn-sm" onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.innerText);App.toast('已复制到剪贴板','ok')">📋 复制</button></div>
        <div class="script-out" id="mk${i}" style="background:#f8fafc;color:#334155;font-size:12.5px;max-height:none;line-height:1.8"></div></div>`).join('')}</div>`;
    for(let i=0;i<list.length;i++){
      await AI.delay(150);
      await AI.stream(list[i].text, c=>{ const e=App.el('mk'+i); if(e) e.textContent=c; }, {step:4});
    }
  },

  /* —— AI 智能分镜 —— */
  aiStoryboard(tools){
    const tool=tools.find(t=>t.id==='storyboard');
    return `${this.aiToolHeader(tool)}
    <div class="card" style="margin-bottom:16px">
      <div class="form-grid" style="display:grid;grid-template-columns:1fr auto;gap:12px;align-items:end">
        <div class="field"><label>场景描述</label><input id="sbInput" value="女主雨夜在城墙下与男主重逢" /></div>
        <button class="btn-primary" onclick="App.runStoryboard()">🎬 生成分镜</button>
      </div>
    </div>
    <div id="sbOut" class="empty"><div class="e-ico">🎬</div>输入场景描述后，AI 将自动拆解镜头、景别、时长、动作、音效与特效</div>`;
  },
  async runStoryboard(){
    App.el('sbOut').innerHTML=`<div class="ai-thinking"><span></span><span></span><span></span> 正在调用 ShotGen-v1 分镜模型…</div>`;
    await AI.delay(1000);
    const list=AI.storyboard({scene:App.el('sbInput').value});
    App.el('sbOut').innerHTML=`<div class="card" style="padding:0;overflow:hidden"><div style="overflow:auto"><table class="tbl"><thead><tr><th>镜号</th><th>景别</th><th>时长</th><th>画面动作</th><th>音效</th><th>特效</th></tr></thead><tbody id="sbBody"></tbody></table></div></div>`;
    const body=App.el('sbBody');
    for(const s of list){
      await AI.delay(220);
      body.innerHTML+=`<tr><td><span class="badge badge-violet">镜${s.n}</span></td><td>${s.shot}</td><td><strong>${s.dur}</strong></td><td>${s.action}</td><td><span class="cell-sub">${s.audio}</span></td><td><span class="cell-sub">${s.vfx}</span></td></tr>`;
    }
    App.el('sbOut').innerHTML+=`<div style="margin-top:12px"><button class="btn-primary btn-sm" onclick="App.toast('分镜表已导出为 PDF','ok')">⬇ 导出分镜表</button></div>`;
  },

  /* —— AI 数据复盘 —— */
  aiInsight(tools){
    const tool=tools.find(t=>t.id==='insight');
    return `${this.aiToolHeader(tool)}
    <div class="card" style="margin-bottom:16px;background:linear-gradient(135deg,#f5f3ff,#fffbeb);border-color:#e0e7ff">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div><div style="font-weight:700">自动经营复盘</div><div class="muted" style="font-size:12.5px;margin-top:3px">基于全局数据自动归因，生成结构化洞察报告</div></div>
        <button class="btn-primary" onclick="App.runInsight()">✨ 生成复盘报告</button>
      </div>
    </div>
    <div id="isOut" class="empty"><div class="e-ico">📈</div>点击生成，AI 将基于上线趋势、题材分布、出海地区、项目漏斗等数据给出 5 条经营洞察</div>`;
  },
  async runInsight(){
    App.el('isOut').innerHTML=`<div class="ai-thinking"><span></span><span></span><span></span> 正在分析全局数据并归因…</div>`;
    await AI.delay(1100);
    const list=AI.insight();
    App.el('isOut').innerHTML=`<div style="display:grid;grid-template-columns:1fr;gap:12px" id="isList"></div>`;
    const wrap=App.el('isList');
    for(const i of list){
      await AI.delay(180);
      wrap.innerHTML+=`<div class="mini-stat" style="align-items:flex-start"><div class="ms-ico" style="background:linear-gradient(135deg,#d4af37,#b8941f)">${i.ico}</div><div><strong style="font-size:14px">${i.t}</strong><div class="muted" style="font-size:12.5px;margin-top:4px;line-height:1.7">${i.d}</div></div></div>`;
    }
    wrap.innerHTML+=`<div style="margin-top:8px;display:flex;gap:8px"><button class="btn-primary btn-sm" onclick="App.toast('复盘报告已生成并归档','ok')">📄 归档报告</button><button class="btn-ghost btn-sm" onclick="App.runInsight()">🔄 重新生成</button></div>`;
  },

  /* —— AI 智能问答 —— */
  aiQa(tools){
    const tool=tools.find(t=>t.id==='qa');
    const qs=['微短剧备案要多久？','如何加入产业联盟？','出海怎么发行？','版权如何存证？','投流ROI怎么提升？','AI能帮我做什么？'];
    return `${this.aiToolHeader(tool)}
    <div class="card" style="margin-bottom:16px">
      <div class="ai-prompt-area"><textarea id="qaInput" placeholder="例如：微短剧备案要多久？如何加入联盟？出海怎么发行？" style="min-height:70px"></textarea>
      <div class="ai-chips">${qs.map(q=>`<span class="ai-chip" onclick="App.el('qaInput').value='${q}';App.runQa()">${q}</span>`).join('')}</div>
      <div style="margin-top:10px"><button class="btn-primary" onclick="App.runQa()">✨ 提问</button></div></div>
    </div>
    <div id="qaOut" class="empty"><div class="e-ico">💬</div>基于产业知识库为您解答备案、出海、版权、投流、AI 工具、联盟入驻等问题</div>`;
  },
  async runQa(){
    const q=App.el('qaInput').value.trim(); if(!q){ App.toast('请输入问题','warn'); return; }
    App.el('qaOut').innerHTML=`<div class="ai-thinking"><span></span><span></span><span></span> AI 正在检索产业知识库…</div>`;
    await AI.delay(700);
    const a=AI.qa(q);
    App.el('qaOut').innerHTML=`<div class="ai-out"><div class="ai-tag">🧑 您的提问</div>${q}</div>
    <div class="ai-out" id="qaAns" style="margin-top:10px"><div class="ai-tag">✨ AI 产业助手</div><span id="qaStream"></span></div>`;
    await AI.stream(a, c=>{ const e=App.el('qaStream'); if(e) e.textContent=c; }, {step:3});
  },

  /* ==================== 全局 AI 抽屉 ==================== */
  aiDrawer(open){
    const d=App.el('aiDrawer'); d.classList.toggle('open',open);
    if(open){ this.state.aiDrawerMode = this.state.aiDrawerMode || 'qa'; this.renderAiDrawer(); }
  },
  renderAiDrawer(){
    const body=App.el('aiDrawerBody');
    body.innerHTML=`
      <div class="ai-prompt-area">
        <textarea id="aiDrawerInput" placeholder="输入需求，例如：写一个古风甜宠短剧开头；审核这段台词是否合规；生成《长安十二时辰》宣发文案…"></textarea>
        <div class="ai-chips">
          <span class="ai-chip" onclick="App.drawerAction('script')">📝 生成剧本</span>
          <span class="ai-chip" onclick="App.drawerAction('compliance')">🛡️ 合规审核</span>
          <span class="ai-chip" onclick="App.drawerAction('marketing')">📣 宣发文案</span>
          <span class="ai-chip" onclick="App.drawerAction('insight')">📈 数据复盘</span>
        </div>
        <div style="margin-top:10px"><button class="btn-primary" style="width:100%" onclick="App.drawerAsk()">✨ 发送</button></div>
      </div>
      <div id="aiDrawerOut"></div>`;
  },
  drawerAction(type){
    this.go('ai'); this.state.aiTool=type; this.refresh(); this.aiDrawer(false);
  },
  async drawerAsk(){
    const q=App.el('aiDrawerInput').value.trim();
    if(!q){ this.toast('请输入需求','warn'); return; }
    const out=App.el('aiDrawerOut');
    out.innerHTML=`<div class="ai-out"><div class="ai-tag">✨ AI 产业助手</div><div class="ai-thinking"><span></span><span></span><span></span> 思考中…</div></div>`;
    await AI.delay(600);
    const a = /剧本|分集|梗概/.test(q) ? AI.script({theme:'古风'}).logline+'\n\n样片场景：\n'+AI.script({theme:'古风'}).sample
      : /合规|审核|风险/.test(q) ? '经 ComplyGuard-v2 检测，建议关注：暴力镜头特写、未成年人饮酒情节、品牌明示植入三类风险，合规综合评分 78，结论为"修改后通过"。建议进入「AI 合规审核」工具获取逐条建议。'
      : /文案|宣发|标题/.test(q) ? AI.marketing({title:q.match(/《(.+?)》/)?.[1]||'长安十二时辰·暗夜'})[0].text
      : AI.qa(q);
    out.innerHTML=`<div class="ai-out"><div class="ai-tag">✨ AI 产业助手</div><span id="drStream"></span></div>`;
    await AI.stream(a, c=>{ const e=App.el('drStream'); if(e) e.textContent=c; }, {step:3});
    out.innerHTML+=`<div style="margin-top:10px"><button class="btn-soft btn-sm" onclick="App.go('ai');App.aiDrawer(false)">前往 AI 工作台 →</button></div>`;
  },
};

/* 启动 */
document.addEventListener('DOMContentLoaded', ()=>App.init());
