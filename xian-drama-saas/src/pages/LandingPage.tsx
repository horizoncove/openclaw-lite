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
        <Link className="btn btn-primary" to="/overseas">
          出海服务中心 <ArrowRight size={14} />
        </Link>
      </header>

      <section className="landing-hero">
        <p className="eyebrow">ALLIANCE · CENTERS · OVERSEAS</p>
        <h1>
          产业服务平台
          <br />
          出海运营 SaaS
        </h1>
        <p className="lead">
          联盟会员、五大中心与微短剧出海服务中心三套入口。出海侧覆盖选品、译制、平台谈判与结算全链路。
        </p>
        <div className="hero-actions portal-actions">
          <Link className="btn btn-primary btn-lg portal-btn overseas" to="/overseas">
            <Globe2 size={18} /> 出海服务中心 <ArrowRight size={16} />
          </Link>
          <Link className="btn btn-primary btn-lg portal-btn alliance" to="/alliance/login">
            <Users size={18} /> 联盟会员入口 <ArrowRight size={16} />
          </Link>
          <Link className="btn btn-primary btn-lg portal-btn center" to="/center/login">
            <Stamp size={18} /> 五大中心入口 <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="landing-modules">
        <div className="portal-split portal-split-3">
          <article className="module-card portal-card">
            <Globe2 size={22} />
            <h3>出海服务中心</h3>
            <p>选品漏斗、译制本地化、平台伙伴、商务谈判、结算对账与客户进件</p>
            <Link className="btn btn-secondary" to="/overseas">
              进入出海 →
            </Link>
          </article>
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
          <p>
            联盟、中心、出海三套 API 独立存储：/api/alliance · /api/center · /api/overseas
          </p>
        </div>
        <a className="btn btn-secondary" href="/demo/saas-demo.pdf">
          下载演示 PDF
        </a>
      </section>

      <footer className="landing-foot">西安微短剧产业服务中心 · 出海 SaaS V2.0</footer>
    </div>
  );
}
