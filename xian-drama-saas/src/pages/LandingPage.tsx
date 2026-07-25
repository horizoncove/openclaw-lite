import { Link } from "react-router-dom";
import { ArrowRight, Bot, Globe2, Sparkles, Stamp, Users } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-brand">微短剧 AI Agent 工作端</div>
        <Link className="btn btn-primary" to="/work/login">
          进入工作端演示 <ArrowRight size={14} />
        </Link>
      </header>

      <section className="landing-hero">
        <p className="eyebrow">DEMO · AGENT WORK CLIENT</p>
        <h1>
          对话编排履约
          <br />
          托管确认结清
        </h1>
        <p className="lead">
          纯前端演示：购 Token → 发悬赏 → 应征 → 确认冻结 → 验收放款。默认主界面是 Agent 工作区，不是 SaaS 后台。
        </p>
        <div className="hero-actions portal-actions">
          <Link className="btn btn-primary btn-lg portal-btn overseas" to="/work/login">
            <Bot size={18} /> 打开 Agent 工作端演示 <ArrowRight size={16} />
          </Link>
          <Link className="btn btn-primary btn-lg portal-btn alliance" to="/app/login">
            <Sparkles size={18} /> 旧版 P1 中枢
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

      <footer className="landing-foot">微短剧 AI Agent 工作端 · 演示</footer>
    </div>
  );
}
