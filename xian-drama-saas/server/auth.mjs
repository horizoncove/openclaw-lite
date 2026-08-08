import crypto from "node:crypto";

const SECRET = process.env.AUTH_SECRET || "xian-drama-dev-secret-change-me";
const ACCESS_CODE = process.env.DEMO_ACCESS_CODE || "";
const TOKEN_TTL_MS = Number(process.env.AUTH_TTL_MS || 7 * 24 * 60 * 60 * 1000);

function b64url(input) {
  return Buffer.from(input).toString("base64url");
}

function fromB64url(input) {
  return Buffer.from(input, "base64url").toString("utf8");
}

export function signToken(payload) {
  const body = {
    ...payload,
    iat: Date.now(),
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const encoded = b64url(JSON.stringify(body));
  const sig = crypto.createHmac("sha256", SECRET).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return null;
  const expected = crypto.createHmac("sha256", SECRET).update(encoded).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(fromB64url(encoded));
    if (!payload?.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function checkAccessCode(code) {
  if (!ACCESS_CODE) return true; // demo mode: role picker only
  return typeof code === "string" && code === ACCESS_CODE;
}

export function authRequired(accessCodeEnabledInfo = false) {
  return {
    accessCodeRequired: Boolean(ACCESS_CODE),
    demoMode: !ACCESS_CODE,
    ...(accessCodeEnabledInfo ? {} : {}),
  };
}

/** Express middleware: require valid Bearer token; optional portal/roles filter. */
export function requireAuth({ portal, roles } = {}) {
  return (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: "未授权：需要有效登录令牌" });
    }
    if (portal && payload.portal !== portal) {
      return res.status(403).json({ error: "禁止：门户不匹配" });
    }
    if (roles && roles.length && !roles.includes(payload.role)) {
      return res.status(403).json({ error: "禁止：角色权限不足" });
    }
    req.auth = payload;
    next();
  };
}
