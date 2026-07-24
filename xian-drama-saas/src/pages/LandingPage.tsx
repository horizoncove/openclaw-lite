import { Link } from "react-router-dom";
import { ArrowRight, Bot, Globe2, Sparkles, Stamp, Users } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-brand">微短剧产业服务 SaaS</div>
        <Link className="btn btn-primary" to="/app/login">
          进入 P1 会员中枢 <ArrowRight size={14} />
        </Link>
      </header>

      <section className="landing-hero">
        <p className="eyebrow">PHASE 1 · MEMBER HUB</p>
        <h1>
          管项目 · 对接需求
          <br />
          API 聚合 · 算力调度
        </h1>
        <p className="lead">
          全联盟可见的工作需求广场、进度工作台、XD-Router 模型网关与算力作业队列；另保留联盟/中心/出海专业入口。
        </p>
        <div className="hero-actions portal-actions">
          <Link className="btn btn-primary btn-lg portal-btn overseas" to="/app/login">
            <Sparkles size={18} /> 进入会员中枢（P1） <ArrowRight size={16} />
          </Link>
          <Link className="btn btn-primary btn-lg portal-btn alliance" to="/alliance/login">
            <Users size={18} /> 联盟入口
          </Link>
          <Link className="btn btn-primary btn-lg portal-btn center" to="/center/login">
            <Stamp size={18} /> 五大中心
          </Link>
          <Link className="btn btn-secondary btn-lg" to="/overseas">
            <Globe2 size={18} /> 出海专业线
          </Link>
        </div>
      </section>

      <section className="landing-modules">
        <div className="module-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          <article className="module-card">
            <Sparkles size={22} />
            <h3>会员中枢 P1</h3>
            <p>项目、需求广场、进度、API/算力、撮合、通知</p>
          </article>
          <article className="module-card">
            <Users size={22} />
            <h3>联盟治理</h3>
            <p>会员、活动、供需撮合、工单 KPI</p>
          </article>
          <article className="module-card">
            <Bot size={22} />
            <h3>专业服务</h3>
            <p>审批 / 出海 / 发行 / 版权 / AI</p>
          </article>
        </div>
      </section>

      <footer className="landing-foot">微短剧产业服务 SaaS · Phase 1</footer>
    </div>
  );
}
