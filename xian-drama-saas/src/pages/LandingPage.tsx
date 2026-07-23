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

const modules = [
  { icon: Users, title: "联盟运行", desc: "会员、活动、供需撮合与标准共建" },
  { icon: Stamp, title: "审批中心", desc: "备案预检、合规会诊、政策导航" },
  { icon: Globe2, title: "出海中心", desc: "选品、译制、渠道对接与结算协助" },
  { icon: Megaphone, title: "发行投流", desc: "发行体检、冷启动策略与数据复盘" },
  { icon: Scale, title: "版权中心", desc: "确权、授权、维权与合同范本" },
  { icon: Bot, title: "AI 研发", desc: "剧本、译制、素材、合规四条产线" },
];

export default function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-brand">西安微短剧产业服务中心</div>
        <Link className="btn btn-primary" to="/login">
          进入平台 <ArrowRight size={16} />
        </Link>
      </header>

      <section className="landing-hero">
        <p className="eyebrow">ALLIANCE + FIVE CENTERS · SAAS</p>
        <h1>
          联盟运行 SaaS
          <br />
          五大中心运营 SaaS
        </h1>
        <p className="lead">
          一站式产业公共服务平台：会员与撮合、跨中心工单、审批出海发行版权 AI 全链路运营。
        </p>
        <div className="hero-actions">
          <Link className="btn btn-primary btn-lg" to="/login">
            立即登录演示
          </Link>
          <a className="btn btn-secondary btn-lg" href="/demo/saas-demo.pdf">
            下载演示 PDF
          </a>
        </div>
      </section>

      <section className="landing-modules">
        <h2>平台模块</h2>
        <div className="module-grid">
          {modules.map((m) => (
            <article className="module-card" key={m.title}>
              <m.icon size={22} />
              <h3>{m.title}</h3>
              <p>{m.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-cta">
        <Handshake size={28} />
        <div>
          <h3>面向服务中心专班与园区运营方</h3>
          <p>支持角色分权、工单 SLA、KPI 看板与数据持久化 API。</p>
        </div>
        <Link className="btn btn-primary" to="/login">
          开始使用
        </Link>
      </section>

      <footer className="landing-foot">西安微短剧产业服务中心 · 运营 SaaS V1.0</footer>
    </div>
  );
}
