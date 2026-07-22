import { useEffect, useState, type FormEvent } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import "./index.css";

const NAV_LINKS = [
  { href: "#alliance", label: "产业联盟" },
  { href: "#centers", label: "服务中心" },
  { href: "#journey", label: "服务流程" },
  { href: "#contact", label: "入驻对接" },
];

const CENTERS = [
  {
    id: "overseas",
    name: "短剧出海服务中心",
    en: "Global Distribution Hub",
    summary:
      "对接海外平台与本地化团队，提供内容适配、合规翻译、渠道发行与收益结算，助力长安故事走向全球。",
    services: [
      "海外平台入驻与发行对接",
      "多语种字幕与本地化改编",
      "跨境合规与内容评级咨询",
      "海外投放与数据复盘支持",
    ],
    image:
      "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "approval",
    name: "审批中心",
    en: "Content Compliance Center",
    summary:
      "贯通备案辅导、材料预审与政策解读，缩短立项到上线周期，让创作团队把精力留给内容本身。",
    services: [
      "微短剧备案辅导与材料预审",
      "内容合规风险提示",
      "政策法规与窗口答疑",
      "上线前合规复核支持",
    ],
    image:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "distribution",
    name: "发行投流中心",
    en: "Release & Growth Center",
    summary:
      "整合宣发资源与精准投流能力，覆盖国内主流短视频与微短剧平台，提升作品曝光与转化效率。",
    services: [
      "全网宣发策略与排期",
      "精准投流与素材优化",
      "达人矩阵与热点借势",
      "发行数据看板与复盘",
    ],
    image:
      "https://images.unsplash.com/photo-1611162616475-46b635cb6868?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "copyright",
    name: "版权服务中心",
    en: "Copyright Service Center",
    summary:
      "从确权存证到授权交易，构建微短剧版权全链条服务，守护原创价值、畅通交易通道。",
    services: [
      "作品确权与区块链存证",
      "版权登记辅导",
      "授权交易与合同范本",
      "侵权监测与维权协助",
    ],
    image:
      "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "ai",
    name: "AI 研发中心",
    en: "AI Research & Creation Lab",
    summary:
      "面向剧本、分镜、配音与宣发素材，沉淀可用的 AI 工具链与行业模型，降低制作门槛、放大创作产能。",
    services: [
      "AI 剧本辅助与分集结构化",
      "智能分镜与素材生成",
      "配音、配乐与字幕工具",
      "行业模型训练与场景落地",
    ],
    image:
      "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80",
  },
];

const JOURNEY = [
  {
    num: "01",
    title: "入驻对接",
    desc: "提交项目或机构信息，匹配专属服务顾问。",
  },
  {
    num: "02",
    title: "评估诊断",
    desc: "从内容、合规、版权与发行路径做专项评估。",
  },
  {
    num: "03",
    title: "中心协同",
    desc: "按需联动出海、审批、投流、版权与 AI 能力。",
  },
  {
    num: "04",
    title: "落地交付",
    desc: "跟踪上线与数据表现，持续优化迭代。",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0 },
};

function App() {
  const reduceMotion = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeCenter, setActiveCenter] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const center = CENTERS[activeCenter];
  const motionProps = reduceMotion
    ? {}
    : { initial: "hidden", whileInView: "show", viewport: { once: true, amount: 0.25 } };

  return (
    <>
      <nav className={`site-nav${scrolled ? " scrolled" : ""}`}>
        <div className="nav-inner">
          <a className="nav-brand" href="#top">
            西安微短剧产业服务中心
          </a>
          <ul className={`nav-links${menuOpen ? " open" : ""}`}>
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} onClick={() => setMenuOpen(false)}>
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <a
                className="nav-cta"
                href="#contact"
                onClick={() => setMenuOpen(false)}
              >
                立即对接
              </a>
            </li>
          </ul>
          <button
            className="nav-toggle"
            aria-label="打开菜单"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
          </button>
        </div>
      </nav>

      <header className="hero" id="top">
        <div className="hero-visual" aria-hidden="true">
          <img
            src="https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?auto=format&fit=crop&w=2000&q=80"
            alt=""
            fetchPriority="high"
          />
          <div className="hero-veil" />
          <div className="hero-grain" />
        </div>

        <div className="hero-content">
          <motion.h1
            className="hero-brand"
            initial={reduceMotion ? false : { opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <span>XI'AN · MICRO DRAMA</span>
            西安微短剧产业服务中心
          </motion.h1>
          <motion.p
            className="hero-headline"
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            以长安为原点，贯通创作、合规、发行与出海
          </motion.p>
          <motion.p
            className="hero-lead"
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            汇聚产业联盟与五大专业中心，为微短剧机构与创作者提供一站式产业服务。
          </motion.p>
          <motion.div
            className="hero-actions"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <a className="btn-primary" href="#centers">
              了解服务中心
            </a>
            <a className="btn-ghost" href="#alliance">
              加入产业联盟
            </a>
          </motion.div>
        </div>

        <div className="hero-scroll" aria-hidden="true">
          <span>SCROLL</span>
          <div className="hero-scroll-line" />
        </div>
      </header>

      <section className="section alliance" id="alliance">
        <div className="container">
          <motion.div {...motionProps} variants={fadeUp} transition={{ duration: 0.7 }}>
            <p className="section-label">ALLIANCE</p>
            <h2 className="section-title">西安微短剧产业联盟</h2>
            <p className="section-desc">
              联接制作方、平台方、资本与技术伙伴，共建开放协同的产业共同体，让资源在长安汇聚、在全国流转。
            </p>
          </motion.div>

          <div className="alliance-grid">
            <motion.div
              className="alliance-visual"
              {...motionProps}
              variants={fadeUp}
              transition={{ duration: 0.8, delay: 0.1 }}
            >
              <img
                src="https://images.unsplash.com/photo-1533929736458-ca588d08c8ba?auto=format&fit=crop&w=1400&q=80"
                alt="西安古城墙与历史建筑"
              />
            </motion.div>
            <motion.div
              className="alliance-copy"
              {...motionProps}
              variants={fadeUp}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <h3>开放共建 · 资源互通 · 标准共治</h3>
              <p>
                联盟面向西安及西部微短剧产业链上下游开放入驻，通过联席机制推动项目撮合、人才交流与标准共建，形成可持续的产业生态。
              </p>
              <ul className="alliance-points">
                <li>
                  <strong>成员网络</strong>
                  <span>制作公司、MCN、平台、投资机构与高校研究院所协同入盟。</span>
                </li>
                <li>
                  <strong>项目撮合</strong>
                  <span>定期路演与供需对接，加速优质 IP 与制作资源匹配。</span>
                </li>
                <li>
                  <strong>标准共建</strong>
                  <span>沉淀内容规范、数据口径与合作范本，降低协作成本。</span>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="section centers" id="centers">
        <div className="container-wide">
          <motion.div {...motionProps} variants={fadeUp} transition={{ duration: 0.7 }}>
            <p className="section-label">SERVICE HUBS</p>
            <h2 className="section-title">五大专业服务中心</h2>
            <p className="section-desc">
              从合规到出海、从版权到智能创作，以专业中心协同交付，覆盖微短剧全生命周期。
            </p>
          </motion.div>

          <div className="centers-layout">
            <div className="center-tabs" role="tablist" aria-label="服务中心列表">
              {CENTERS.map((item, index) => (
                <button
                  key={item.id}
                  role="tab"
                  aria-selected={index === activeCenter}
                  className={`center-tab${index === activeCenter ? " active" : ""}`}
                  onClick={() => setActiveCenter(index)}
                >
                  {item.name}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={center.id}
                className="center-panel"
                role="tabpanel"
                initial={reduceMotion ? false : { opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, x: -12 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="center-panel-text">
                  <h3>{center.name}</h3>
                  <p className="en">{center.en}</p>
                  <p>{center.summary}</p>
                  <ul className="center-services">
                    {center.services.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div className="center-panel-media">
                  <img src={center.image} alt="" />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      <section className="section journey" id="journey">
        <div className="container">
          <motion.div {...motionProps} variants={fadeUp} transition={{ duration: 0.7 }}>
            <p className="section-label">PROCESS</p>
            <h2 className="section-title">服务流程</h2>
            <p className="section-desc">
              清晰四步，让机构与创作者快速进入服务节奏。
            </p>
          </motion.div>

          <div className="journey-steps">
            {JOURNEY.map((step, i) => (
              <motion.div
                key={step.num}
                className="journey-step"
                {...motionProps}
                variants={fadeUp}
                transition={{ duration: 0.6, delay: 0.08 * i }}
              >
                <div className="journey-num">{step.num}</div>
                <h4>{step.title}</h4>
                <p>{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="section contact" id="contact">
        <div className="container contact-inner">
          <motion.div {...motionProps} variants={fadeUp} transition={{ duration: 0.7 }}>
            <p className="section-label">JOIN US</p>
            <h2 className="section-title">入驻与业务对接</h2>
            <p className="section-desc">
              无论您是制作机构、平台方还是创作者，欢迎留下信息，我们将在 1–2 个工作日内与您联系。
            </p>
            <ul className="contact-meta">
              <li>
                <span className="label">服务热线</span>
                <span className="value">029-8888 6600</span>
              </li>
              <li>
                <span className="label">商务邮箱</span>
                <span className="value">service@xadrama.cn</span>
              </li>
              <li>
                <span className="label">中心地址</span>
                <span className="value">陕西省西安市 · 曲江新区文化产业园区</span>
              </li>
            </ul>
          </motion.div>

          <motion.div {...motionProps} variants={fadeUp} transition={{ duration: 0.7, delay: 0.1 }}>
            {submitted ? (
              <div className="form-success" role="status">
                <p>已收到您的对接意向，我们会尽快与您联系。</p>
              </div>
            ) : (
              <form className="contact-form" onSubmit={handleSubmit}>
                <label>
                  机构 / 姓名
                  <input name="name" required placeholder="请输入" autoComplete="organization" />
                </label>
                <label>
                  联系方式
                  <input name="contact" required placeholder="手机或邮箱" autoComplete="tel" />
                </label>
                <label>
                  意向服务
                  <select name="interest" defaultValue="alliance">
                    <option value="alliance">产业联盟入驻</option>
                    <option value="overseas">短剧出海</option>
                    <option value="approval">审批合规</option>
                    <option value="distribution">发行投流</option>
                    <option value="copyright">版权服务</option>
                    <option value="ai">AI 研发合作</option>
                  </select>
                </label>
                <label>
                  需求简述
                  <textarea name="message" placeholder="简单描述您的项目或合作意向" />
                </label>
                <button type="submit" className="btn-primary">
                  提交对接意向
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container footer-inner">
          <div>
            <div className="footer-brand">西安微短剧产业服务中心</div>
            <p>Xi'an Micro Short Drama Industry Service Center</p>
          </div>
          <p>© {new Date().getFullYear()} 西安微短剧产业服务中心 · 保留所有权利</p>
        </div>
      </footer>
    </>
  );
}

export default App;
