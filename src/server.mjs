import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { load, save, defaultPage } from "./store.mjs";
import { listCircle, acceptCircle } from "./circle.mjs";
import { handleExtra } from "./extra.mjs";
import { hashPassword, checkPassword, signSession, readSession, setCookie, clearCookie, handleOk } from "./auth.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
const port = Number(process.env.PORT || 3333);
const host = process.env.HOST || "0.0.0.0";

const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml" };
function json(res, code, obj, extra = {}) { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", ...extra }); res.end(JSON.stringify(obj)); }
function body(req) { return new Promise((resolve, reject) => { const chunks = []; req.on("data", (c) => chunks.push(c)); req.on("end", () => { const raw = Buffer.concat(chunks).toString("utf8"); if (!raw) return resolve({}); try { resolve(JSON.parse(raw)); } catch { reject(new Error("bad json")); } }); req.on("error", reject); }); }
function me(req, db) { const s = readSession(req.headers.cookie); if (!s) return null; return db.users.find((u) => u.id === s.userId) || null; }
function publicUser(u) { return { id: u.id, handle: u.handle, displayName: u.displayName }; }
function sendFile(res, abs) { fs.readFile(abs, (err, data) => { if (err) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); res.end("Not found"); return; } const ext = path.extname(abs); res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" }); res.end(data); }); }

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://localhost");
  const method = req.method || "GET";
  if (method === "GET" && url.pathname === "/healthz") return json(res, 200, { ok: true, service: "yours" });
  const db = load();
  try {
    const extraHit = await handleExtra({ method, url, db, me: () => me(req, db), json: (code, obj, extra) => json(res, code, obj, extra), body: () => body(req), save });
    if (extraHit) return;
    if (method === "POST" && url.pathname === "/api/signup") {
      const b = await body(req); if (!b.accepted || !b.age13) return json(res, 400, { error: "Agree to the terms. Be 13 or older." });
      const email = String(b.email || "").trim().toLowerCase(); const handle = String(b.handle || "").trim().toLowerCase(); const displayName = String(b.displayName || handle).trim(); const password = String(b.password || "");
      if (!email.includes("@") || password.length < 8) return json(res, 400, { error: "Email and a password of 8+ characters." });
      if (!handleOk(handle)) return json(res, 400, { error: "Handle: start with a letter, 3-24 chars." });
      if (db.users.some((u) => u.email === email || u.handle === handle)) return json(res, 409, { error: "Email or handle already has a home." });
      const user = { id: "u_" + Date.now().toString(36), email, handle, displayName, password: hashPassword(password), createdAt: Date.now(), acceptedAt: Date.now() };
      db.users.push(user); db.pages[handle] = defaultPage(user); save(db); return json(res, 201, { user: { handle, displayName } }, { "Set-Cookie": setCookie(signSession(user.id)) });
    }
    if (method === "POST" && url.pathname === "/api/login") {
      const b = await body(req); const email = String(b.email || "").trim().toLowerCase(); const user = db.users.find((u) => u.email === email);
      if (!user || !checkPassword(String(b.password || ""), user.password)) return json(res, 401, { error: "Those keys do not open this door." });
      return json(res, 200, { user: { handle: user.handle, displayName: user.displayName } }, { "Set-Cookie": setCookie(signSession(user.id)) });
    }
    if (method === "POST" && url.pathname === "/api/logout") return json(res, 200, { ok: true }, { "Set-Cookie": clearCookie() });
    if (method === "GET" && url.pathname === "/api/me") { const user = me(req, db); if (!user) return json(res, 401, { error: "Sign in." }); return json(res, 200, { user: { handle: user.handle, displayName: user.displayName, email: user.email } }); }
    if (method === "GET" && url.pathname === "/api/search") { const needle = (url.searchParams.get("q") || "").trim().toLowerCase().replace(/^@/, ""); const hits = db.users.filter((u) => !needle || u.handle.includes(needle) || u.displayName.toLowerCase().includes(needle)).slice(0, 20).map((u) => ({ handle: u.handle, displayName: u.displayName })); return json(res, 200, { hits }); }
    if (method === "GET" && url.pathname.startsWith("/api/page/")) { const handle = decodeURIComponent(url.pathname.slice("/api/page/".length)).toLowerCase(); const page = db.pages[handle]; const user = db.users.find((u) => u.handle === handle); if (!page || !user) return json(res, 404, { error: "No home with that name." }); return json(res, 200, { page, user: publicUser(user), live: db.lives[handle] || null }); }
    if (method === "PUT" && url.pathname === "/api/page") { const user = me(req, db); if (!user) return json(res, 401, { error: "Sign in." }); const b = await body(req); const cur = db.pages[user.handle] || defaultPage(user); db.pages[user.handle] = { ...cur, title: String(b.title || cur.title).slice(0, 80), bio: String(b.bio || cur.bio).slice(0, 280), plan: ["house", "grid", "stage"].includes(b.plan) ? b.plan : cur.plan, blocks: Array.isArray(b.blocks) ? b.blocks.slice(0, 24) : cur.blocks, updatedAt: Date.now() }; save(db); return json(res, 200, { page: db.pages[user.handle] }); }
    if (method === "POST" && url.pathname === "/api/friends") { const user = me(req, db); if (!user) return json(res, 401, { error: "Sign in." }); const to = String((await body(req)).handle || "").toLowerCase(); if (!db.users.some((u) => u.handle === to) || to === user.handle) return json(res, 400, { error: "Cannot add that home." }); const exists = db.friends.find((f) => (f.a === user.handle && f.b === to) || (f.b === user.handle && f.a === to)); if (!exists) { db.friends.push({ a: user.handle, b: to, status: "requested", at: Date.now() }); save(db); } return json(res, 200, { ok: true }); }
    if (method === "GET" && url.pathname === "/api/friends") { const user = me(req, db); if (!user) return json(res, 401, { error: "Sign in." }); return json(res, 200, listCircle(db, user.handle)); }
    if (method === "POST" && url.pathname === "/api/friends/accept") { const user = me(req, db); if (!user) return json(res, 401, { error: "Sign in." }); const from = String((await body(req)).handle || "").toLowerCase(); if (!acceptCircle(db, user.handle, from)) return json(res, 404, { error: "No request." }); save(db); return json(res, 200, { ok: true }); }
    if (method === "POST" && url.pathname === "/api/groups") { const user = me(req, db); if (!user) return json(res, 401, { error: "Sign in." }); const name = String((await body(req)).name || "").trim().slice(0, 60); if (!name) return json(res, 400, { error: "Name the room." }); const g = { id: "g_" + Date.now().toString(36), name, owner: user.handle, members: [user.handle], at: Date.now() }; db.groups.push(g); save(db); return json(res, 201, { group: g }); }
    if (method === "GET" && url.pathname === "/api/groups") { const user = me(req, db); if (!user) return json(res, 401, { error: "Sign in." }); return json(res, 200, { groups: db.groups.filter((g) => g.members.includes(user.handle)) }); }
    if (method === "POST" && url.pathname === "/api/live/start") { const user = me(req, db); if (!user) return json(res, 401, { error: "Sign in." }); db.lives[user.handle] = { handle: user.handle, title: String((await body(req)).title || "Live from home").slice(0, 80), at: Date.now(), destinations: ["yours"] }; save(db); return json(res, 200, { live: db.lives[user.handle] }); }
    if (method === "POST" && url.pathname === "/api/live/stop") { const user = me(req, db); if (!user) return json(res, 401, { error: "Sign in." }); delete db.lives[user.handle]; save(db); return json(res, 200, { ok: true }); }
    if (method === "GET" && url.pathname === "/api/feed") { const comments = db.comments || []; const posts = [...db.posts].slice(-40).reverse().map((p) => ({ ...p, comments: comments.filter((c) => c.postId === p.id).slice(-8) })); return json(res, 200, { posts }); }
    if (method === "POST" && url.pathname === "/api/posts") { const user = me(req, db); if (!user) return json(res, 401, { error: "Sign in." }); const text = String((await body(req)).text || "").trim().slice(0, 500); if (!text) return json(res, 400, { error: "Say something." }); const post = { id: "p_" + Date.now().toString(36), handle: user.handle, displayName: user.displayName, text, likes: 0, at: Date.now() }; db.posts.push(post); save(db); return json(res, 201, { post }); }
    if (method === "POST" && url.pathname.startsWith("/api/posts/") && url.pathname.endsWith("/like")) { const id = decodeURIComponent(url.pathname.split("/")[3]); const post = db.posts.find((p) => p.id === id); if (!post) return json(res, 404, { error: "Gone." }); post.likes += 1; save(db); return json(res, 200, { post }); }
    if (method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) return sendFile(res, path.join(publicDir, "index.html"));
    if (method === "GET" && url.pathname === "/clarity") return sendFile(res, path.join(publicDir, "clarity.html"));
    if (method === "GET" && url.pathname === "/doors") return sendFile(res, path.join(publicDir, "doors.html"));
    const spa = ["/home", "/customize", "/search", "/live", "/studio", "/settings"];
    if (method === "GET" && (spa.includes(url.pathname) || url.pathname.startsWith("/u/"))) return sendFile(res, path.join(publicDir, "app.html"));
    const abs = path.normalize(path.join(publicDir, url.pathname)); if (!abs.startsWith(publicDir)) { res.writeHead(403); return res.end("no"); } return sendFile(res, abs);
  } catch (e) { console.error(e); json(res, 500, { error: "The house hiccuped." }); }
});
server.listen(port, host, () => console.log("YOURS http://" + host + ":" + port));
