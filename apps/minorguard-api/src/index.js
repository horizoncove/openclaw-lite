import http from "node:http";
import { config } from "./infra/config.js";
import { getDb } from "./infra/db/sqlite.js";
import { handleRequest } from "./http/routes.js";
import { sendJson } from "./http/util.js";
import { cloudEnabled, authRequired } from "./infra/config.js";

getDb();

const server = http.createServer(async (req, res) => {
  try {
    await handleRequest(req, res);
  } catch (error) {
    console.error(error);
    const invalidJson = error?.code === "INVALID_JSON";
    sendJson(res, invalidJson ? 400 : 500, {
      error: invalidJson ? "INVALID_JSON" : "INTERNAL",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(config.PORT, config.HOST, () => {
  console.log(`MinorGuard P3 API http://${config.HOST}:${config.PORT}`);
  console.log(`version=${config.APP_VERSION} storage=sqlite auth=${authRequired() ? config.AUTH_MODE : "demo_open"}`);
  console.log(`provider=${cloudEnabled() ? `deepseek:${config.DEEPSEEK_MODEL}` : "local-rules"}`);
});
