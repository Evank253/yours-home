import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";

const port = 4300 + Math.floor(Math.random() * 500);
const secret = "yours-smoke-secret-01234567890123456789";
const child = spawn(process.execPath, ["src/server.mjs"], { env: { ...process.env, PORT: String(port), YOURS_SESSION_SECRET: secret }, stdio: ["ignore", "pipe", "pipe"] });
let output = "";
child.stdout.on("data", (d) => { output += d.toString(); });
child.stderr.on("data", (d) => { output += d.toString(); });

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: "127.0.0.1", port, path, method: options.method || "GET", headers: options.body ? { "Content-Type": "application/json" } : undefined }, (res) => {
      let data = "";
      res.on("data", (d) => { data += d; });
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on("error", reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

try {
  for (let i = 0; i < 40; i += 1) {
    try { const health = await request("/healthz"); if (health.status === 200) break; } catch {}
    await new Promise((r) => setTimeout(r, 50));
    if (i === 39) throw new Error("server did not start");
  }
  const health = await request("/healthz");
  assert.equal(health.status, 200);
  assert.deepEqual(JSON.parse(health.body), { ok: true, service: "yours" });

  const home = await request("/");
  assert.equal(home.status, 200);
  assert.match(home.body, /YOURS/);

  const missing = await request("/api/page/no-such-home");
  assert.equal(missing.status, 404);

  const unauthorized = await request("/api/me");
  assert.equal(unauthorized.status, 401);

  console.log("YOURS smoke: PASS");
} finally {
  child.kill("SIGTERM");
  await new Promise((resolve) => child.once("exit", resolve));
  if (output.trim()) console.log(output.trim());
}
