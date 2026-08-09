import http from "node:http";
import { config, authRequired } from "./infra/config.js";
import { getDb } from "./infra/db/sqlite.js";
import { handleRequest } from "./http/routes.js";
import { sendJson } from "./http/util.js";
import { applyCors } from "./http/cors.js";
import { serviceAuthRequired } from "./domain/auth/tokens.js";
import { resolveProvider } from "./domain/llm/providers.js";

getDb();

const server = http.createServer(async (req, res) => {
  try {
    if (applyCors(req, res)) return;
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
  const llm = resolveProvider();
  console.log(`MinorGuard P3 API http://${config.HOST}:${config.PORT}`);
  console.log(
    `version=${config.APP_VERSION} storage=sqlite authMode=${config.AUTH_MODE} apiAuth=${serviceAuthRequired()} ledgerAuth=${authRequired()}`,
  );
  console.log(
    `llm=${llm.id} enabled=${llm.enabled} model=${llm.model || "-"} reason=${llm.reason}`,
  );
});
