import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  Globe2,
  Handshake,
  Megaphone,
  Scale,
  Stamp,
  Users,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-brand">西安微短剧产业服务中心</div>
      </header>

      <section className="landing-hero">
        <p className="eyebrow">ALLIANCE + FIVE CENTERS · DUAL SAAS</p>
        <h1>
          联盟会员 SaaS
          <br />
          五大中心运营 SaaS
        </h1>
        <p className="lead">
          两套独立入口、两套独立数据。联盟侧管会员与撮合，中心侧管审批出海发行版权 AI，互不共享。
        </p>
        <div className="hero-actions portal-actions">
          <Link className="btn btn-primary btn-lg portal-btn alliance" to="/alliance/login">
            <Users size={18} /> 联盟会员入口 <ArrowRight size={16} />
          </Link>
          <Link className="btn btn-primary btn-lg portal-btn center" to="/center/login">
            <Stamp size={18} /> 五大中心入口 <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="landing-modules">
        <div className="portal-split">
          <article className="module-card portal-card">
            <Users size={22} />
            <h3>联盟会员侧</h3>
            <p>会员管理、活动运营、供需撮合、联盟工单与 KPI</p>
            <Link className="btn btn-secondary" to="/alliance/login">
              进入联盟 →
            </Link>
          </article>
          <article className="module-card portal-card">
            <div className="center-icons">
              <Stamp size={18} />
              <Globe2 size={18} />
              <Megaphone size={18} />
              <Scale size={18} />
              <Bot size={18} />
            </div>
            <h3>五大中心侧</h3>
            <p>审批、出海、发行投流、版权、AI 研发运营与中心工单</p>
            <Link className="btn btn-secondary" to="/center/login">
              进入中心 →
            </Link>
          </article>
        </div>
      </section>

      <section className="landing-cta">
        <Handshake size={28} />
        <div>
          <h3>数据完全隔离</h3>
          <p>联盟 API（/api/alliance）与中心 API（/api/center）独立存储，各自重置、各自运营。</p>
        </div>
        <a className="btn btn-secondary" href="/demo/saas-demo.pdf">
          下载演示 PDF
        </a>
      </section>

      <footer className="landing-foot">西安微短剧产业服务中心 · 双入口 SaaS V1.2</footer>
    </div>
  );
}
