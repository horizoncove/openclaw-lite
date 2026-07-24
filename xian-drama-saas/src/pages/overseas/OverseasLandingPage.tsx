import { Link } from "react-router-dom";
import {
  ArrowRight,
  Clapperboard,
  Globe2,
  Handshake,
  Languages,
  LineChart,
  Wallet,
} from "lucide-react";

const services = [
  {
    icon: Clapperboard,
    title: "选品评估",
    desc: "按目标市场评分，筛出可出海短剧与优先级。",
  },
  {
    icon: Languages,
    title: "译制本地化",
    desc: "字幕、配音与本土化改编全流程跟踪。",
  },
  {
    icon: Handshake,
    title: "平台对接",
    desc: "对接 ReelShort、DramaBox、ShortMax 等海外平台。",
  },
  {
    icon: Wallet,
    title: "结算对账",
    desc: "分账核对、预付款与打款状态一站管理。",
  },
];

export default function OverseasLandingPage() {
  return (
    <div className="os-landing">
      <header className="os-nav">
        <div className="os-brand">
          <Globe2 size={22} />
          <span>微短剧出海服务中心</span>
        </div>
        <div className="os-nav-actions">
          <Link className="btn btn-ghost" to="/">
            返回总平台
          </Link>
          <Link className="btn btn-primary" to="/overseas/login">
            进入平台 <ArrowRight size={16} />
          </Link>
        </div>
      </header>

      <section className="os-hero">
        <div className="os-hero-copy">
          <p className="os-eyebrow">OVERSEAS DRAMA SAAS</p>
          <h1>微短剧出海服务中心</h1>
          <p className="os-lead">
            从选品、合规、译制到平台谈判与结算，一站式运营海外短剧发行。服务制片方，赋能出海团队。
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary btn-lg" to="/overseas/login">
              运营台登录 <ArrowRight size={16} />
            </Link>
            <Link className="btn btn-secondary btn-lg" to="/overseas/login">
              制片方入口
            </Link>
          </div>
        </div>
        <div className="os-hero-visual" aria-hidden>
          <div className="os-orb os-orb-a" />
          <div className="os-orb os-orb-b" />
          <div className="os-map-card">
            <LineChart size={28} />
            <strong>6 大市场</strong>
            <span>北美 · 东南亚 · 中东 · 拉美 · 欧洲</span>
          </div>
        </div>
      </section>

      <section className="os-services">
        <h2>核心服务能力</h2>
        <div className="os-service-grid">
          {services.map((s) => (
            <article key={s.title} className="os-service-item">
              <s.icon size={22} />
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="os-cta-band">
        <div>
          <h3>准备好把短剧推向海外了吗？</h3>
          <p>演示账号可立即体验项目漏斗、译制跟踪与结算对账。</p>
        </div>
        <Link className="btn btn-secondary btn-lg" to="/overseas/login">
          立即体验
        </Link>
      </section>

      <footer className="landing-foot">微短剧出海服务中心 · SaaS V2.0</footer>
    </div>
  );
}
