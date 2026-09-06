const $ = (s) => document.querySelector(s);
const view = $("#view");
const who = $("#who");

async function api(path, opts = {}) {
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

let me = null;
async function session() {
  try {
    const d = await api("/api/me");
    me = d.user;
    who.textContent = "@" + me.handle;
  } catch {
    me = null;
    who.innerHTML = '<a class="handle" href="/">Sign in</a>';
  }
}

function route() {
  const p = location.pathname;
  if (p.startsWith("/u/")) return showPage(p.slice(3));
  if (p === "/customize") return showBuild();
  if (p === "/search") return showSearch();
  if (p === "/live") return showLive();
  if (p === "/studio") return showStudio();
  return showDesk();
}

function showDesk() {
  view.innerHTML = `<h2>Desk</h2><p class="sub">One home. Posts land here. The page is still yours.</p><div class="card"><div class="row"><input id="postText" placeholder="Say something from home" style="flex:1" /><button class="gold" id="postBtn">Post</button></div></div><div id="feed"></div>`;
  $("#postBtn").onclick = async () => {
    try {
      await api("/api/posts", { method: "POST", body: JSON.stringify({ text: $("#postText").value }) });
      $("#postText").value = "";
      loadFeed();
    } catch (e) { alert(e.message); }
  };
  loadFeed();
}

async function loadFeed() {
  const { posts } = await api("/api/feed");
  $("#feed").innerHTML = posts.length ? posts.map((p) => `<div class="card"><a class="handle" href="/u/${p.handle}">@${p.handle}</a><p>${escapeHtml(p.text)}</p><button class="ghost" data-like="${p.id}">Like ${p.likes}</button></div>`).join("") : `<p class="sub">No posts yet. Be first.</p>`;
  document.querySelectorAll("[data-like]").forEach((b) => {
    b.onclick = async () => {
      const { post } = await api("/api/posts/" + b.dataset.like + "/like", { method: "POST", body: "{}" });
      b.textContent = "Like " + post.likes;
    };
  });
}

async function showPage(handle) {
  try {
    const { page, user, live } = await api("/api/page/" + handle);
    view.innerHTML = `<p class="live-dot">${live ? "LIVE — " + escapeHtml(live.title) : ""}</p><h1 class="page-hero">${escapeHtml(page.title)}</h1><p class="sub">@${user.handle} · ${escapeHtml(page.bio)}</p><p class="sub">Plan: ${page.plan}</p>${(page.blocks || []).map((b) => `<div class="card">${escapeHtml(b.text || b.type)}</div>`).join("")}<div class="row"><button class="ghost" id="add">Add</button>${me && me.handle === user.handle ? `<a class="handle" href="/customize">Edit page</a>` : ""}</div>`;
    $("#add").onclick = async () => {
      try {
        await api("/api/friends", { method: "POST", body: JSON.stringify({ handle: user.handle }) });
        alert("Requested.");
      } catch (e) { alert(e.message); }
    };
  } catch (e) {
    view.innerHTML = `<p class="sub">${escapeHtml(e.message)}</p>`;
  }
}

async function showBuild() {
  if (!me) return (view.innerHTML = `<p class="sub">Sign in at the door first.</p>`);
  const { page } = await api("/api/page/" + me.handle);
  view.innerHTML = `<h2>Build</h2><p class="sub">Default plan or your blocks. Imagination is unlocked, never required.</p><div class="card blocks"><label>Title</label><br/><input id="title" value="${escapeAttr(page.title)}" /><br/><br/><label>Bio</label><br/><textarea id="bio">${escapeHtml(page.bio)}</textarea><br/><br/><label>Plan</label><select id="plan"><option value="house">House</option><option value="grid">Grid</option><option value="stage">Stage</option></select><p class="sub">Blocks (one thought per line)</p><textarea id="blocks">${(page.blocks || []).map((b) => b.text).join("\n")}</textarea><br/><br/><button class="gold" id="save">Save page</button> <a class="handle" href="/u/${me.handle}">View public</a></div>`;
  $("#plan").value = page.plan;
  $("#save").onclick = async () => {
    const blocks = $("#blocks").value.split("\n").filter(Boolean).map((text, i) => ({ id: "b" + i, type: "text", text }));
    try {
      await api("/api/page", { method: "PUT", body: JSON.stringify({ title: $("#title").value, bio: $("#bio").value, plan: $("#plan").value, blocks }) });
      location.href = "/u/" + me.handle;
    } catch (e) { alert(e.message); }
  };
}

function showSearch() {
  view.innerHTML = `<h2>People</h2><p class="sub">Look up a name or @handle. Never a face.</p><div class="row"><input id="q" placeholder="Name or handle" style="flex:1" /><button class="gold" id="go">Find</button></div><div id="hits"></div>`;
  const run = async () => {
    const { hits } = await api("/api/search?q=" + encodeURIComponent($("#q").value));
    $("#hits").innerHTML = hits.map((h) => `<div class="card hit"><a class="handle" href="/u/${h.handle}">${escapeHtml(h.displayName)} · @${h.handle}</a><button class="ghost" data-add="${h.handle}">Add</button></div>`).join("") || `<p class="sub">No homes match.</p>`;
    document.querySelectorAll("[data-add]").forEach((b) => {
      b.onclick = async () => {
        try {
          await api("/api/friends", { method: "POST", body: JSON.stringify({ handle: b.dataset.add }) });
          b.textContent = "Requested";
        } catch (e) { alert(e.message); }
      };
    });
  };
  $("#go").onclick = run;
  $("#q").addEventListener("keydown", (e) => e.key === "Enter" && run());
}

async function showLive() {
  view.innerHTML = `<h2>Live door</h2><p class="sub">One start on Yours. Destinations arm later.</p><div class="card"><input id="ltitle" placeholder="Title" /><div class="row" style="margin-top:0.7rem"><button class="gold" id="start">Go live</button><button class="ghost" id="stop">End</button></div><p class="sub" id="lstat"></p></div>`;
  $("#start").onclick = async () => {
    try {
      const { live } = await api("/api/live/start", { method: "POST", body: JSON.stringify({ title: $("#ltitle").value }) });
      $("#lstat").textContent = "Live as @" + live.handle + " — " + live.title;
    } catch (e) { alert(e.message); }
  };
  $("#stop").onclick = async () => {
    try {
      await api("/api/live/stop", { method: "POST", body: "{}" });
      $("#lstat").textContent = "Door closed.";
    } catch (e) { alert(e.message); }
  };
}

async function showStudio() {
  if (!me) return (view.innerHTML = `<p class="sub">Sign in first.</p>`);
  const { groups } = await api("/api/groups");
  view.innerHTML = `<h2>Studio</h2><p class="sub">Groups you own. Calendar and OAuth tiles come next.</p><div class="card row"><input id="gname" placeholder="Room name" style="flex:1" /><button class="gold" id="gmake">Start group</button></div><div id="glist">${groups.map((g) => `<div class="card">${escapeHtml(g.name)} · owner @${g.owner}</div>`).join("") || "<p class='sub'>No rooms yet.</p>"}</div>`;
  $("#gmake").onclick = async () => {
    try {
      await api("/api/groups", { method: "POST", body: JSON.stringify({ name: $("#gname").value }) });
      showStudio();
    } catch (e) { alert(e.message); }
  };
}

function escapeHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, "&quot;");
}

session().then(route);
window.addEventListener("popstate", route);
