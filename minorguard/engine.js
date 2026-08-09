/**
 * MinorGuard browser MVP engine — local rules + policy (no backend required).
 * Used by GitHub Pages static demo and as offline fallback for the API UI.
 */
(function (global) {
  const VERSION = "0.5.0-pages-mvp";
  const POLICY_VERSION = "minor-safety-policy-2026-08-08";
  const RULE_SET_VERSION = "ruleset-p2.1-browser";

  const riskRules = [
    {
      id: "content",
      name: "AI 内容风险",
      short: "不适宜、违法或伤害性内容",
      color: "#b42318",
      keywords: ["暴力", "色情", "自伤", "自杀", "伤害", "刺激", "真实一点", "血腥", "低俗", "违法"],
      patterns: [/暴力/u, /色情/u, /自[伤杀]/u, /伤害/u, /血腥/u, /违法/u],
      weight: 26,
    },
    {
      id: "interaction",
      name: "AI 交互风险",
      short: "情感依赖、操控、隔离现实支持",
      color: "#b45309",
      keywords: ["唯一的朋友", "只有你理解我", "别告诉别人", "每天哄我", "替代", "依赖", "秘密", "孤独"],
      patterns: [/唯一.{0,4}朋友/u, /只有你.{0,8}理解/u, /别告诉/u, /每天.{0,4}哄/u, /依赖/u, /秘密/u],
      weight: 24,
    },
    {
      id: "tool",
      name: "AI 工具滥用风险",
      short: "诱导 AI 执行越权、攻击或作弊",
      color: "#7c3aed",
      keywords: ["脚本", "自动登录", "绕过", "验证码", "同学账号", "下载答案", "攻击", "盗号", "破解", "越权"],
      patterns: [/脚本/u, /自动登录/u, /绕过/u, /验证码/u, /账号/u, /答案/u, /攻击/u, /盗号/u, /破解/u, /越权/u],
      weight: 25,
    },
    {
      id: "data",
      name: "AI 数据风险",
      short: "未成年人隐私和敏感信息暴露",
      color: "#0f766e",
      keywords: ["手机号", "身份证", "学校", "住址", "网友", "13岁", "个人信息", "发给", "家庭地址"],
      patterns: [
        /1[3-9]\d{9}/u,
        /\d{6}(19|20)\d{2}\d{7}[\dXx]/u,
        /\d{1,2}岁/u,
        /手机号/u,
        /身份证/u,
        /学校/u,
        /住址/u,
        /网友/u,
        /个人信息/u,
        /发给/u,
      ],
      weight: 25,
    },
  ];

  const minorSignals = [
    { label: "明确年龄表述", weight: 45, patterns: [/\b([6-9]|1[0-7])\s*岁/u, /我.{0,4}(未成年|小学生|初中生|高中生)/u] },
    { label: "校园身份线索", weight: 22, patterns: [/老师/u, /同学/u, /班级/u, /学校/u, /作业/u, /考试/u, /家长/u, /爸妈/u] },
    { label: "监护限制线索", weight: 18, patterns: [/爸妈.{0,8}不让/u, /家长.{0,8}限制/u, /偷偷/u, /别告诉.{0,8}(爸妈|家长|老师)/u] },
    { label: "未成年人高敏场景", weight: 25, patterns: [/网友/u, /游戏账号/u, /充值/u, /网恋/u, /见面/u, /手机号/u, /身份证/u] },
    { label: "学习生活场景", weight: 12, patterns: [/初中/u, /高中/u, /小学/u, /中考/u, /高考/u, /班主任/u] },
  ];

  const demoSeedScenarios = [
    { source: "demo-seed-data", text: "用户：我是初中生，有网友让我把学校、家庭地址和虚构手机号发给他，说可以送游戏装备。" },
    { source: "demo-seed-data", text: "用户：群里说未成年人领奖要填父母手机号和验证码，我可以直接发给他吗？" },
    { source: "demo-seed-interaction", text: "用户：我不想告诉家长，能不能只和你说秘密？你以后当我唯一的朋友。" },
    { source: "demo-seed-interaction", text: "用户：网友让我不要告诉爸妈，周末线下见面，我有点害怕但又怕他生气。" },
    { source: "demo-seed-tool", text: "用户：我是初中生，帮我写脚本绕过验证码登录同学账号下载答案。" },
    { source: "demo-seed-tool", text: "用户：网课考试能不能写一个自动切屏不被老师发现的脚本？" },
    { source: "demo-seed-content", text: "用户：同学欺负我，我想报复他，教我怎么让他受伤但查不到我。" },
    { source: "demo-seed-content", text: "用户：我压力很大，不想告诉任何人，也想伤害自己。" },
    { source: "demo-seed-low", text: "用户：请用初中生能理解的方式解释二次函数顶点式，不要直接给作业答案。" },
    { source: "demo-seed-low", text: "用户：我是成年人，想制定一周跑步计划，要求循序渐进。" },
  ];

  function clampNumber(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, Math.min(100, Math.round(number)));
  }

  function mergeList(a, b) {
    return Array.from(new Set([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])])).slice(0, 8);
  }

  function getCategoryLevel(score) {
    if (score >= 70) return "高";
    if (score >= 35) return "中";
    if (score > 0) return "低";
    return "未见明显风险";
  }

  function getOverallLevel(score) {
    if (score >= 75) return "高风险";
    if (score >= 45) return "中风险";
    if (score >= 15) return "低风险";
    return "未见明显风险";
  }

  function getAction(level) {
    return (
      {
        高风险: "阻断并复核",
        中风险: "提醒并限流",
        低风险: "提示并观察",
        未见明显风险: "放行",
      }[level] || "待定"
    );
  }

  function getLevelCode(score) {
    const s = clampNumber(score);
    if (s >= 75) return "high";
    if (s >= 45) return "medium";
    if (s >= 15) return "low";
    return "none";
  }

  function getActionCode(levelCode) {
    return { none: "allow", low: "observe", medium: "throttle", high: "block_review" }[levelCode] || "observe";
  }

  function getOverallCopy(level) {
    return (
      {
        高风险: "建议立即阻断相关输出，保留脱敏事件，并进入人工复核或监护提醒流程。",
        中风险: "建议向用户提供安全提醒，限制高风险方向继续生成，并记录风险事件。",
        低风险: "建议给出温和提示，继续观察连续对话是否升级。",
        未见明显风险: "当前文本未命中主要风险规则，可按普通学习或问答场景处理。",
      }[level] || ""
    );
  }

  function countHits(text, keywords) {
    const lower = text.toLowerCase();
    return keywords.filter((keyword) => lower.includes(keyword.toLowerCase()));
  }

  function countRuleHits(text, rule) {
    const hits = countHits(text, rule.keywords);
    const patternHits = (rule.patterns || []).filter((p) => p.test(text)).map((p) => p.source);
    return Array.from(new Set([...hits, ...patternHits]));
  }

  function detectMinorLikelihood(text) {
    if (!text.trim()) {
      return { level: "unknown", label: "未知", score: 0, reasons: [], note: "暂无文本，无法判断是否为未成年人使用场景。" };
    }
    const reasons = [];
    let score = 0;
    for (const signal of minorSignals) {
      if (signal.patterns.some((p) => p.test(text))) {
        score += signal.weight;
        reasons.push(signal.label);
      }
    }
    score = Math.min(100, score);
    const level = score >= 85 ? "confirmed_minor" : score >= 60 ? "likely_minor" : score >= 25 ? "possible_minor" : "unknown";
    const labelMap = {
      confirmed_minor: "已确认未成年人",
      likely_minor: "高度疑似未成年人",
      possible_minor: "可能是未成年人",
      unknown: "未知",
      adult_likely: "大概率成年人",
    };
    return {
      level,
      label: labelMap[level],
      score,
      reasons,
      note: reasons.length ? "基于对话中的脱敏语义线索判断，不代表实名身份结论。" : "未发现明显未成年人语义线索。",
    };
  }

  function minorRankValue(level) {
    return { adult_likely: 0, unknown: 1, possible_minor: 2, likely_minor: 3, confirmed_minor: 4 }[level] || 1;
  }

  function analyzeLocal(text) {
    const normalized = String(text || "").trim();
    const minorLikelihood = detectMinorLikelihood(normalized);
    const categories = riskRules.map((rule) => {
      const hits = countRuleHits(normalized, rule);
      const score = Math.min(100, hits.length * rule.weight);
      return {
        id: rule.id,
        name: rule.name,
        short: rule.short,
        color: rule.color,
        hits,
        score,
        level: getCategoryLevel(score),
        reason: hits.length ? `命中 ${hits.length} 个本地风险信号。` : "未命中本地高风险关键词。",
      };
    });
    const maxScore = Math.max(...categories.map((item) => item.score), 0);
    const totalHits = categories.reduce((sum, item) => sum + item.hits.length, 0);
    const score = Math.min(100, Math.round(maxScore * 0.72 + Math.min(28, totalHits * 4)));
    const level = getOverallLevel(score);
    return {
      categories,
      score,
      level,
      action: getAction(level),
      summary: normalized ? getOverallCopy(level) : "暂无文本。",
      minorLikelihood,
      recommendations: {
        family: ["与孩子沟通 AI 使用目的，不直接指责。", "对隐私、陌生人、极端内容和越权工具建立明确边界。"],
        platform: ["对高风险输出执行拦截或改写。", "对重复风险账号进入人工复核队列。"],
        regulator: ["仅接收脱敏风险事件。", "用于趋势分析、合规抽查和依法复核。"],
      },
      createdAt: new Date().toISOString(),
    };
  }

  function setOverall(result, level, summary) {
    const scoreMap = { 未见明显风险: 5, 低风险: 25, 中风险: 55, 高风险: 88 };
    result.level = level;
    result.score = scoreMap[level] || 0;
    result.action = getAction(level);
    result.summary = summary;
  }

  function boostCategory(result, id, score, reason, hits) {
    const category = result.categories.find((item) => item.id === id);
    if (!category) return;
    category.score = Math.max(category.score || 0, score);
    category.level = getCategoryLevel(category.score);
    category.reason = reason;
    category.hits = mergeList(category.hits, hits);
  }

  function capCategory(result, id, score, reason, hits) {
    const category = result.categories.find((item) => item.id === id);
    if (!category) return;
    category.score = score;
    category.level = getCategoryLevel(score);
    category.reason = reason;
    category.hits = mergeList(category.hits, hits);
  }

  function capAllCategories(result, maxScore, reason) {
    for (const category of result.categories) {
      if (category.score > maxScore) {
        category.score = maxScore;
        category.level = getCategoryLevel(maxScore);
        category.reason = reason;
      }
    }
  }

  function lowerAllCategories(result, maxScore, reason) {
    for (const category of result.categories) {
      if (category.score > maxScore) {
        category.score = maxScore;
        category.level = getCategoryLevel(maxScore);
        category.reason = reason;
      }
    }
  }

  function applyForcedHighRisk(text, result) {
    const normalized = String(text || "");
    if (
      /(偷偷|不要告诉|别告诉).{0,12}(妈妈|父母|爸妈|家长).{0,40}(转钱|转账|充值|付款|验证码)/u.test(normalized) ||
      /(网友|游戏好友).{0,40}(转钱|转账|充值|验证码|父母手机号|妈妈手机)/u.test(normalized)
    ) {
      boostCategory(result, "data", 88, "未成年人或疑似未成年人场景中出现向网友转账、验证码或监护人手机相关风险。", [
        "陌生人诱导",
        "转账充值",
        "监护规避",
      ]);
      setOverall(result, "高风险", "疑似未成年人被陌生人诱导转账、充值或提供验证码，建议阻断并复核。");
    }
    if (
      /(报复|让他害怕|教训他|收拾他).{0,30}(查不到|不会被发现|别被发现|不留痕)/u.test(normalized) ||
      /(同学|校园|欺负).{0,40}(报复|让他害怕|不会被发现|查不到)/u.test(normalized)
    ) {
      boostCategory(result, "content", 88, "出现校园冲突后的报复意图和规避追责线索。", ["报复意图", "规避追责", "校园冲突"]);
      setOverall(result, "高风险", "出现报复他人并规避追责的请求，建议阻断危险建议并引导现实求助。");
    }
    if (
      /(考试|网课考试|老师).{0,40}(作弊|答案|手表|切屏|绕过|检测|别被发现)/u.test(normalized) ||
      /(答案).{0,30}(手表|隐蔽|别被老师发现)/u.test(normalized)
    ) {
      boostCategory(result, "tool", 88, "出现考试作弊、规避监考或隐蔽传递答案的工具滥用请求。", ["考试作弊", "规避检测", "隐蔽工具"]);
      setOverall(result, "高风险", "出现考试作弊或规避监考的工具请求，建议阻断并复核。");
    }
    if (
      /(身份证|证件照|学生证).{0,40}(发|发给|发送|上传|给)/u.test(normalized) ||
      /(发|发给|发送|上传).{0,20}(身份证|证件照|学生证)/u.test(normalized) ||
      /(家里地址|家庭地址|住址).{0,30}(发|发给|发送)/u.test(normalized) ||
      /(发|发给|发送).{0,20}(家里地址|家庭地址|住址)/u.test(normalized) ||
      /(手机号).{0,40}(发给|发送|给).{0,20}(网友|他|她)/u.test(normalized) ||
      /(发给|发送).{0,20}(手机号)/u.test(normalized)
    ) {
      boostCategory(result, "data", 90, "出现向他人发送证件、住址或手机号等敏感信息的请求。", ["证件信息", "隐私泄露", "陌生人索取"]);
      setOverall(result, "高风险", "疑似向陌生人提供证件、住址或手机号等敏感信息，建议阻断并复核。");
    }
    if (
      /(不要告诉|别告诉|别跟|不要跟).{0,12}(爸妈|家长|老师|父母).{0,40}(见面|出来|线下|商场|咖啡)/u.test(normalized) ||
      /(见面|出来|线下).{0,40}(不要告诉|别告诉).{0,12}(爸妈|家长|老师|父母)/u.test(normalized) ||
      /(网友|陌生人).{0,40}(单独|私下).{0,20}(见面|出来)/u.test(normalized)
    ) {
      boostCategory(result, "interaction", 90, "出现隐瞒监护人的线下见面诱导。", ["线下见面", "监护规避", "陌生人诱导"]);
      setOverall(result, "高风险", "疑似陌生人诱导隐瞒家长进行线下见面，建议阻断并复核。");
    }
    if (
      !/(不想伤害自己|不会伤害自己|不要伤害自己)/u.test(normalized) &&
      (/(伤害自己|自伤|自杀|不想活|活着没意思).{0,40}(别告诉|不要告诉|别劝|保密)/u.test(normalized) ||
        /(别告诉|不要告诉).{0,20}(别人|老师|家长|爸妈).{0,40}(伤害自己|自伤|自杀)/u.test(normalized) ||
        /(有伤害自己的念头|(?<!不)想伤害自己)/u.test(normalized))
    ) {
      boostCategory(result, "content", 92, "出现自伤危机并请求保密。", ["自伤危机", "保密请求"]);
      setOverall(result, "高风险", "出现自伤相关危机表达，建议阻断危险回应并引导现实求助。");
    }
    if (
      /(15岁|14岁|13岁|未成年|初中|小学生).{0,40}(露骨|色情|性爱|亲密内容|黄色)/u.test(normalized) ||
      /(露骨|色情|性爱|亲密内容).{0,40}(15岁|14岁|13岁|未成年|别告诉.*爸妈)/u.test(normalized)
    ) {
      boostCategory(result, "content", 92, "未成年人场景下的不适龄亲密内容请求。", ["不适龄内容", "未成年人保护"]);
      setOverall(result, "高风险", "未成年人请求不适龄亲密内容，建议阻断并复核。");
    }
    if (
      /(父母|爸妈|家长).{0,12}(手机号|验证码)/u.test(normalized) ||
      /(手机号|验证码).{0,20}(父母|爸妈|家长)/u.test(normalized) ||
      /(领奖).{0,40}(手机号|验证码)/u.test(normalized)
    ) {
      boostCategory(result, "data", 90, "出现监护人手机号或验证码被索取/转发的风险。", ["监护人手机号", "验证码", "领奖诱饵"]);
      setOverall(result, "高风险", "疑似以领奖等理由索取监护人手机号或验证码，建议阻断并复核。");
    }
  }

  function applyMediumRiskGuards(text, result) {
    const normalized = String(text || "");
    if (/(唯一的朋友|唯一朋友|只相信你|不想.{0,8}(同学|家人|任何人).{0,8}说话)/u.test(normalized)) {
      capCategory(result, "interaction", 62, "出现对 AI 的排他性情感依赖和现实支持退缩，应提醒并限流。", ["情感依赖", "现实支持退缩"]);
      setOverall(result, "中风险", "用户表达对 AI 的排他性依赖，应限制依赖强化并引导现实支持。");
    }
    if (/(隐藏|藏起来|删除).{0,20}(聊天记录|记录).{0,30}(网友|爸妈|家长)/u.test(normalized)) {
      capCategory(result, "interaction", 55, "出现与网友互动并规避监护关注的线索。", ["隐藏聊天记录", "规避监护"]);
      setOverall(result, "中风险", "出现隐藏网友聊天记录的请求，建议提醒并限流。");
    }
  }

  function applyPositiveIntentNoiseReduction(text, result) {
    const normalized = String(text || "");
    const benign =
      /(解释|讲一下|修改|复习计划|练习题|作文|数学|勾股定理|二次函数)/u.test(normalized) &&
      /(初中生|高中生|学生|学习|作业|考试|环保|不要直接给答案)/u.test(normalized) &&
      !/(网友|手机号|住址|地址|身份证|验证码|绕过|脚本|报复|自伤|自杀|色情|露骨)/u.test(normalized);
    if (benign) {
      lowerAllCategories(result, 0, "学习辅导场景，无隐私、伤害、诱导或工具滥用请求。");
      setOverall(result, "未见明显风险", "正常学习辅导请求，可放行。");
      return;
    }
    if (
      /(我是成年人|成人|成年人).{0,40}(跑步计划|健身计划|运动计划|生活咨询|饮食计划|学习计划)/u.test(normalized) &&
      !/(未成年人|网友|手机号|身份证|验证码|线下见面|自伤|色情)/u.test(normalized)
    ) {
      lowerAllCategories(result, 0, "成年人普通生活咨询，未涉及未成年人保护高敏场景。");
      setOverall(result, "未见明显风险", "成年人普通生活咨询，可放行。");
    }
  }

  function applyMinorLikelihoodTuning(text, result) {
    const normalized = String(text || "");
    if (
      /(未成年人|初一|初二|初三|初中|高中|学生).{0,40}(父母|爸妈|妈妈|家长|领奖|验证码|学生证)/u.test(normalized) ||
      /(父母|爸妈|妈妈|家长).{0,20}(手机号|验证码).{0,30}(未成年人|领奖)/u.test(normalized)
    ) {
      const current = result.minorLikelihood || {};
      result.minorLikelihood = {
        ...current,
        level: minorRankValue(current.level) >= minorRankValue("likely_minor") ? current.level : "likely_minor",
        label: minorRankValue(current.level) >= minorRankValue("likely_minor") ? current.label : "高度疑似未成年人",
        score: Math.max(current.score || 0, 70),
        reasons: mergeList(current.reasons || [], ["未成年人或校园语境", "监护人信息或验证码场景"]),
        note: current.note || "基于脱敏语义线索判断，不代表实名身份结论。",
      };
    }
  }

  function finalize(result) {
    const score = clampNumber(Math.max(result.score, ...result.categories.map((c) => c.score)));
    const level = getOverallLevel(score);
    const levelCode = getLevelCode(score);
    return {
      ...result,
      score,
      finalScore: score,
      level,
      action: getAction(level),
      levelCode,
      actionCode: getActionCode(levelCode),
      minorLikelihoodCode: result.minorLikelihood?.level || "unknown",
      policyVersion: POLICY_VERSION,
      ruleSetVersion: RULE_SET_VERSION,
      scoreSource: "local_rule",
      modelScore: null,
      ruleScore: score,
      confidence: 0.62,
      provider: "local-browser",
      model: "browser-rules-mvp",
      note: "浏览器本地 MVP 规则引擎（GitHub Pages / 离线可用）",
      createdAt: result.createdAt || new Date().toISOString(),
    };
  }

  function analyze(text) {
    const local = analyzeLocal(text);
    applyMinorLikelihoodTuning(text, local);
    applyForcedHighRisk(text, local);
    applyMediumRiskGuards(text, local);
    applyPositiveIntentNoiseReduction(text, local);
    return finalize(local);
  }

  function fallbackReply(risk) {
    if (risk.level === "高风险") {
      return "这个问题涉及较高风险，我不能继续提供具体做法。建议停止分享敏感信息或危险内容，并和家长、老师或可信成年人沟通。";
    }
    if (risk.level === "中风险") {
      return "这个话题有一定风险，我可以帮你换成更安全的方式处理。你可以描述目标，但不要提供个人隐私或要求绕过规则。";
    }
    return "可以，我们可以继续聊。请尽量不要输入真实姓名、手机号、学校、住址、身份证号等敏感信息。";
  }

  function safeChatReply(messages, risk) {
    const last = [...messages].reverse().find((m) => m.role === "user");
    const text = String(last?.content || "");
    if (/(二次函数|数学|勾股|作文|复习|解释|讲一下)/u.test(text)) {
      return "好的。我可以分步骤提示你自己推导，并在最后给你检查方法；不会直接替你完成整份作业答案。";
    }
    if (risk.levelCode === "none" || risk.levelCode === "low") {
      return "我在。为了保护隐私，请不要发送真实手机号、身份证、学校或家庭地址。你想先聊哪一部分？";
    }
    return fallbackReply(risk);
  }

  function chat(messages) {
    const list = Array.isArray(messages) ? messages : [];
    const userText = list
      .filter((m) => m.role === "user")
      .map((m) => `用户：${m.content}`)
      .join("\n");
    const risk = analyze(userText);
    const fastPath = risk.level === "高风险";
    const reply = fastPath ? fallbackReply(risk) : safeChatReply(list, risk);
    const combined = fastPath ? risk : analyze(`${userText}\nAI：${reply}`);
    return {
      reply,
      risk: combined,
      fastPath,
      policyMode: fastPath ? "high_risk_fast_path" : "browser_mvp",
      provider: "local-browser",
      model: "browser-rules-mvp",
    };
  }

  function maskSensitiveText(text) {
    return String(text || "")
      .replace(/1[3-9]\d{9}/g, "[手机号]")
      .replace(/\d{6}(19|20)\d{2}\d{7}[\dXx]/g, "[身份证]")
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[邮箱]");
  }

  function buildSafeSnippet(text) {
    return maskSensitiveText(String(text || "").replace(/\s+/g, " ").trim()).slice(0, 360);
  }

  function buildEvent(source, inputText, result, reply) {
    return {
      id: `MG-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      source,
      level: result.level,
      levelCode: result.levelCode,
      score: result.score,
      finalScore: result.finalScore ?? result.score,
      action: result.action,
      actionCode: result.actionCode,
      summary: maskSensitiveText(result.summary || getOverallCopy(result.level)),
      provider: result.provider || "local-browser",
      model: result.model || "browser-rules-mvp",
      minorLikelihood: result.minorLikelihood,
      categories: result.categories,
      snippet: buildSafeSnippet(inputText),
      replySnippet: reply ? buildSafeSnippet(reply) : "",
      recommendations: result.recommendations || {},
      reviewStatus: result.level === "高风险" ? "待人工复核" : "自动记录",
    };
  }

  function buildEventStats(events) {
    const stats = {
      total: events.length,
      byLevel: {},
      bySource: {},
      byMinorLikelihood: {},
      byCategory: { content: 0, interaction: 0, tool: 0, data: 0 },
    };
    for (const event of events) {
      stats.byLevel[event.level] = (stats.byLevel[event.level] || 0) + 1;
      stats.bySource[event.source] = (stats.bySource[event.source] || 0) + 1;
      const minor = event.minorLikelihood?.label || "未知";
      stats.byMinorLikelihood[minor] = (stats.byMinorLikelihood[minor] || 0) + 1;
      for (const category of event.categories || []) {
        if (category.score > 0) stats.byCategory[category.id] = (stats.byCategory[category.id] || 0) + 1;
      }
    }
    return stats;
  }

  function seedDemoEvents(count = 80) {
    const events = [];
    for (let i = 0; i < count; i += 1) {
      const scenario = demoSeedScenarios[i % demoSeedScenarios.length];
      const round = Math.floor(i / demoSeedScenarios.length) + 1;
      const inputText = `${scenario.text}\n样本批次：DEMO-${String(round).padStart(2, "0")}，仅用于本地演示。`;
      const result = analyze(inputText);
      events.push(buildEvent(scenario.source, inputText, result, ""));
    }
    return events;
  }

  global.MinorGuardEngine = {
    VERSION,
    POLICY_VERSION,
    RULE_SET_VERSION,
    riskRules,
    analyze,
    chat,
    fallbackReply,
    maskSensitiveText,
    buildSafeSnippet,
    buildEvent,
    buildEventStats,
    seedDemoEvents,
    getOverallCopy,
  };
})(typeof window !== "undefined" ? window : globalThis);
