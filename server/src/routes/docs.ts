// GET /docs        — Swagger UI (loaded from CDN, zero deps)
// GET /openapi.yaml — the hand-maintained spec it renders
//
// The spec is kept in sync with the routes by hand, same as the wire types (§5).

import { readFileSync } from "node:fs";

import { route } from "../http.ts";

const specPath = new URL("../../openapi.yaml", import.meta.url);

const page = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Deep Catch — API</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({ url: "/openapi.yaml", dom_id: "#swagger" });
  </script>
</body>
</html>`;

route("GET", "/docs", ({ res }) => {
	res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
	res.end(page);
});

route("GET", "/openapi.yaml", ({ res }) => {
	res.writeHead(200, { "content-type": "application/yaml; charset=utf-8" });
	res.end(readFileSync(specPath, "utf8"));
});
