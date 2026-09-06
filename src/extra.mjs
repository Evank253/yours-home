export async function handleExtra(ctx) {
  const { method, url, db, me, json, body, save } = ctx;
  const path = url.pathname;

  if (method === "GET" && path === "/api/export") {
    const user = me();
    if (!user) return json(401, { error: "Sign in." });
    const pack = {
      exportedAt: Date.now(),
      user: { handle: user.handle, displayName: user.displayName, email: user.email },
      page: db.pages[user.handle] || null,
      posts: db.posts.filter((p) => p.handle === user.handle),
      comments: (db.comments || []).filter((c) => c.handle === user.handle),
      groups: db.groups.filter((g) => g.members.includes(user.handle)),
    };
    return json(200, pack);
  }

  if (method === "DELETE" && path === "/api/me") {
    const user = me();
    if (!user) return json(401, { error: "Sign in." });
    db.users = db.users.filter((u) => u.id !== user.id);
    delete db.pages[user.handle];
    delete db.lives[user.handle];
    db.posts = db.posts.filter((p) => p.handle !== user.handle);
    db.comments = (db.comments || []).filter((c) => c.handle !== user.handle);
    db.friends = db.friends.filter((f) => f.a !== user.handle && f.b !== user.handle);
    db.groups.forEach((g) => {
      g.members = g.members.filter((h) => h !== user.handle);
    });
    db.groups = db.groups.filter((g) => g.members.length);
    save(db);
    return json(200, { ok: true });
  }

  if (method === "PUT" && path === "/api/me") {
    const user = me();
    if (!user) return json(401, { error: "Sign in." });
    const b = await body();
    const name = String(b.displayName || "").trim().slice(0, 60);
    if (name) user.displayName = name;
    save(db);
    return json(200, { user: { handle: user.handle, displayName: user.displayName } });
  }

  if (method === "POST" && path.startsWith("/api/posts/") && path.endsWith("/comments")) {
    const user = me();
    if (!user) return json(401, { error: "Sign in." });
    const id = path.split("/")[3];
    const post = db.posts.find((p) => p.id === id);
    if (!post) return json(404, { error: "Gone." });
    const text = String((await body()).text || "").trim().slice(0, 280);
    if (!text) return json(400, { error: "Say something." });
    const comment = {
      id: "c_" + Date.now().toString(36),
      postId: id,
      handle: user.handle,
      text,
      at: Date.now(),
    };
    db.comments = db.comments || [];
    db.comments.push(comment);
    save(db);
    return json(201, { comment });
  }

  if (method === "POST" && path.startsWith("/api/groups/") && path.endsWith("/join")) {
    const user = me();
    if (!user) return json(401, { error: "Sign in." });
    const id = path.split("/")[3];
    const g = db.groups.find((x) => x.id === id);
    if (!g) return json(404, { error: "No room." });
    if (!g.members.includes(user.handle)) g.members.push(user.handle);
    save(db);
    return json(200, { group: g });
  }

  if (method === "GET" && path === "/api/rooms") {
    return json(200, { groups: db.groups.slice(-40).reverse() });
  }

  return false;
}
