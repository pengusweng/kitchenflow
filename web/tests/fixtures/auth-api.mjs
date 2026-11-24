import { createServer } from "node:http";

const supervisor = {
  user_id: "b6acd2dc-24bd-4b91-8d13-b2f2db76ed16",
  username: "qa-supervisor",
  first_name: "QA",
  last_name: "Supervisor",
  role: "SUPERVISOR",
  is_active: true,
  created_at: "2025-01-01T00:00:00.000Z",
  modified_at: "2025-01-01T00:00:00.000Z",
};

const token = "playwright-fixture-token";

createServer(async (request, response) => {
  function json(status, body) {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(body));
  }

  switch (`${request.method} ${request.url}`) {
    case "GET /health":
      return json(200, { ready: true });
    case "POST /api/auth/login": {
      let body = "";
      for await (const chunk of request) body += chunk;
      const credentials = JSON.parse(body);
      if (credentials.username !== supervisor.username || credentials.password !== "qa-password") {
        return json(401, { message: "Invalid credentials" });
      }
      return json(200, {
        token,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        user: supervisor,
      });
    }
    case "GET /api/auth/me":
      return request.headers.authorization === `Bearer ${token}`
        ? json(200, supervisor)
        : json(401, { message: "Invalid session" });
    case "POST /api/auth/logout":
      response.writeHead(204);
      return response.end();
    default:
      return json(404, { message: `Unmocked request: ${request.method} ${request.url}` });
  }
}).listen(3101, "127.0.0.1");
