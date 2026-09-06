export async function handleExtra(ctx) {
  const { method, url, db, me, json, body, save } = ctx;
  const path = url.pathname;

  if (method === "GET" && path === "/api/export") {
    const user = me();
    if (!user) { json(401, { error: "Sign in." }); return true; }
    json(200, {
      exportedAt: Date.now(),
      user: { handle: user.handle, displayName: user.displayName, email: user.email },
      page: db.pages[user.handle] || null,
      posts: db.posts.filter((p) => p.handle === user.handle),
      comments: (db.comments || []).filter((c) => c.handle === user.handle),
      groups: db.groups.filter((g) => g.members.includes(user.handle)),
    });
    return true;
  }

  if (method === "DELETE" && path === "/api/me") {
    const user = me();
    if (!user) { json(401, { error: "Sign in." }); return true; }
    db.users = db.users.filter((u) => u.id !== user.id);
    delete db.pages[user.handle];
    delete db.lives[user.handle];
    db.posts = db.posts.filter((p) => p.handle !== user.handle);
    db.comments = (db.comments || []).filter((c) => c.handle !== user.handle);
    db.friends = db.friends.filter((f) => f.a !== user.handle && f.b !== user.handle);
    db.groups.forEach((g) => { g.members = g.members.filter((h) => h !== user.handle); });
    db.groups = db.groups.filter((g) => g.members.length);
    save(db);
    json(200, { ok: true });
    return true;
  }

  if (method === "PUT" && path === "/api/me") {
    const user = me();
    if (!user) { json(401, { error: "Sign in." }); return true; }
    const b = await body();
    const name = String(b.displayName || "").trim().slice(0, 60);
    if (name) user.displayName = name;
    save(db);
    json(200, { user: { handle: user.handle, displayName: user.displayName } });
    return true;
  }

  if (method === "POST" && path.startsWith("/api/posts/") && path.endsWith("/comments")) {
    const user = me();
    if (!user) { json(401, { error: "Sign in." }); return true; }
    const id = path.split("/")[3];
    const post = db.posts.find((p) => p.id === id);
    if (!post) { json(404, { error: "Gone." }); return true; }
    const text = String((await body()).text || "").trim().slice(0, 280);
    if (!text) { json(400, { error: "Say something." }); return true; }
    const comment = { id: "c_" + Date.now().toString(36), postId: id, handle: user.handle, text, at: Date.now() };
    db.comments = db.comments || [];
    db.comments.push(comment);
    save(db);
    json(201, { comment });
    return true;
  }

  if (method === "POST" && path.startsWith("/api/groups/") && path.endsWith("/join")) {
    const user = me();
    if (!user) { json(401, { error: "Sign in." }); return true; }
    const id = path.split("/")[3];
    const g = db.groups.find((x) => x.id === id);
    if (!g) { json(404, { error: "No room." }); return true; }
    if (!g.members.includes(user.handle)) g.members.push(user.handle);
    save(db);
    json(200, { group: g });
    return true;
  }

  if (method === "GET" && path === "/api/rooms") {
    json(200, { groups: db.groups.slice(-40).reverse() });
    return true;
  }

  return false;
}
