const $ = (s) => document.querySelector(s);
const view = $("#view");
const who = $("#who");
async function api(path, opts = {}) {
  const res = await fetch(path, { credentials: "same-origin", headers: { "Content-Type": "application/json", ...(opts.headers || {}) }, ...opts });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}
let me = null;
async function session() {
  try {
    const d = await api("/api/me");
    me = d.user;
    who.innerHTML = "@" + me.handle + ' <a class="handle" href="/settings">Keys</a> <button class="ghost" id="out" type="button">Leave</button>';
    const out = $("#out");
    if (out) out.onclick = async () => { await api("/api/logout", { method: "POST", body: "{}" }); location.href = "/"; };
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
  if (p === "/settings") return showSettings();
  if (p === "/rooms") return showPrivateRooms();
  return showDesk();
}
function showDesk() {
  view.innerHTML = `<h2>Desk</h2><p class="sub">One home. Posts, people you added, rooms.</p><div class="card"><div class="row"><input id="postText" placeholder="Say something from home" style="flex:1" /><button class="gold" id="postBtn" type="button">Post</button></div></div><div id="inbox"></div><div id="feed"></div>`;
  $("#postBtn").onclick = async () => {
    try {
      await api("/api/posts", { method: "POST", body: JSON.stringify({ text: $("#postText").value }) });
      $("#postText").value = ""; loadFeed();
    } catch (e) { alert(e.message); }
  };
  loadFeed(); loadFriends();
}
async function loadFriends() {
  if (!me) return;
  try {
    const { friends, incoming } = await api("/api/friends");
    $("#inbox").innerHTML =
      (incoming.length ? incoming.map((h) => `<div class="card hit"><span>@${h} wants in</span><button class="gold" data-ok="${h}" type="button">Accept</button></div>`).join("") : "") +
      (friends.length ? `<p class="sub">Home circle: ${friends.map((h) => `<a class="handle" href="/u/${h}">@${h}</a>`).join(" ")}</p>` : "");
    document.querySelectorAll("[data-ok]").forEach((b) => {
      b.onclick = async () => { await api("/api/friends/accept", { method: "POST", body: JSON.stringify({ handle: b.dataset.ok }) }); loadFriends(); };
    });
  } catch (_) {}
}
async function loadFeed() {
  const { posts } = await api("/api/feed");
  $("#feed").innerHTML = posts.length ? posts.map((p) => {
    const notes = (p.comments || []).map((c) => `<p class="sub">@${escapeHtml(c.handle)} — ${escapeHtml(c.text)}</p>`).join("");
    return `<div class="card"><a class="handle" href="/u/${p.handle}">@${p.handle}</a><p>${escapeHtml(p.text)}</p><button class="ghost" data-like="${p.id}" type="button">Like ${p.likes}</button><div>${notes}</div><div class="row" style="margin-top:0.4rem"><input data-c="${p.id}" placeholder="Reply" style="flex:1" /><button class="ghost" data-send="${p.id}" type="button">Reply</button></div></div>`;
  }).join("") : `<p class="sub">No posts yet.</p>`;
  document.querySelectorAll("[data-like]").forEach((b) => {
    b.onclick = async () => { const { post } = await api("/api/posts/" + b.dataset.like + "/like", { method: "POST", body: "{}" }); b.textContent = "Like " + post.likes; };
  });
  document.querySelectorAll("[data-send]").forEach((b) => {
    b.onclick = async () => {
      const box = document.querySelector('[data-c="' + b.dataset.send + '"]');
      try {
        await api("/api/posts/" + b.dataset.send + "/comments", { method: "POST", body: JSON.stringify({ text: box.value }) });
        loadFeed();
      } catch (e) { alert(e.message); }
    };
  });
}
function officialEmbed(url) {
  try {
    const u = new URL(url);
    if (u.hostname === "www.youtube.com" || u.hostname === "youtube.com") {
      const id = u.searchParams.get("v"); if (id) return "https://www.youtube.com/embed/" + id;
    }
    if (u.hostname === "youtu.be") { const id = u.pathname.slice(1); if (id) return "https://www.youtube.com/embed/" + id; }
    if (u.hostname === "www.youtube.com" && u.pathname.startsWith("/embed/")) return u.href;
    if (u.hostname === "player.vimeo.com") return u.href;
    if (u.hostname === "vimeo.com") { const id = u.pathname.split("/").filter(Boolean)[0]; if (id) return "https://player.vimeo.com/video/" + id; }
  } catch (_) {}
  return "";
}
function renderBlock(b) {
  if (b.type === "link") { const href = String(b.url || b.text || ""); return `<div class="card"><a class="handle" href="${escapeAttr(href)}" target="_blank" rel="noopener">${escapeHtml(b.text || href)}</a></div>`; }
  if (b.type === "embed") {
    const src = officialEmbed(b.url || b.text || "");
    if (!src) return `<div class="card">Need an official YouTube or Vimeo link.</div>`;
    return `<div class="card"><iframe width="100%" height="220" src="${escapeAttr(src)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen title="Official embed"></iframe></div>`;
  }
  return `<div class="card">${escapeHtml(b.text || b.type)}</div>`;
}
async function showPage(handle) {
  try {
    const { page, user, live } = await api("/api/page/" + handle);
    view.innerHTML = `<p class="live-dot">${live ? "LIVE — " + escapeHtml(live.title) : ""}</p><h1 class="page-hero">${escapeHtml(page.title)}</h1><p class="sub">@${user.handle} · ${escapeHtml(page.bio)}</p><p class="sub">Plan: ${page.plan}</p>${(page.blocks || []).map(renderBlock).join("")}<div class="row"><button class="ghost" id="add" type="button">Add</button>${me && me.handle === user.handle ? `<a class="handle" href="/customize">Edit page</a>` : ""}</div>`;
    $("#add").onclick = async () => { try { await api("/api/friends", { method: "POST", body: JSON.stringify({ handle: user.handle }) }); alert("Requested."); } catch (e) { alert(e.message); } };
  } catch (e) { view.innerHTML = `<p class="sub">${escapeHtml(e.message)}</p>`; }
}
async function showBuild() {
  if (!me) return (view.innerHTML = `<p class="sub">Sign in first.</p>`);
  const { page } = await api("/api/page/" + me.handle);
  const lines = (page.blocks || []).map((b) => { if (b.type === "embed") return "embed " + (b.url || ""); if (b.type === "link") return "link " + (b.url || ""); return b.text || ""; }).join("\n");
  view.innerHTML = `<h2>Build</h2><p class="sub">One thought per line. Start with link or embed plus an official URL.</p><div class="card blocks"><label>Title</label><br/><input id="title" value="${escapeAttr(page.title)}" /><br/><br/><label>Bio</label><br/><textarea id="bio">${escapeHtml(page.bio)}</textarea><br/><br/><label>Plan</label><select id="plan"><option value="house">House</option><option value="grid">Grid</option><option value="stage">Stage</option></select><p class="sub">Blocks</p><textarea id="blocks">${escapeHtml(lines)}</textarea><br/><br/><button class="gold" id="save" type="button">Save page</button> <a class="handle" href="/u/${me.handle}">View public</a></div>`;
  $("#plan").value = page.plan;
  $("#save").onclick = async () => {
    const blocks = $("#blocks").value.split("\n").map((line) => line.trim()).filter(Boolean).map((text, i) => {
      if (text.toLowerCase().startsWith("embed ")) return { id: "b" + i, type: "embed", url: text.slice(6).trim(), text };
      if (text.toLowerCase().startsWith("link ")) return { id: "b" + i, type: "link", url: text.slice(5).trim(), text };
      return { id: "b" + i, type: "text", text };
    });
    try {
      await api("/api/page", { method: "PUT", body: JSON.stringify({ title: $("#title").value, bio: $("#bio").value, plan: $("#plan").value, blocks }) });
      location.href = "/u/" + me.handle;
    } catch (e) { alert(e.message); }
  };
}
function showSearch() {
  view.innerHTML = `<h2>People</h2><p class="sub">Name or @handle. Never a face.</p><div class="row"><input id="q" placeholder="Name or handle" style="flex:1" /><button class="gold" id="go" type="button">Find</button></div><div id="hits"></div>`;
  const run = async () => {
    const { hits } = await api("/api/search?q=" + encodeURIComponent($("#q").value));
    $("#hits").innerHTML = hits.map((h) => `<div class="card hit"><a class="handle" href="/u/${h.handle}">${escapeHtml(h.displayName)} · @${h.handle}</a><button class="ghost" data-add="${h.handle}" type="button">Add</button></div>`).join("") || `<p class="sub">No homes match.</p>`;
    document.querySelectorAll("[data-add]").forEach((b) => {
      b.onclick = async () => { try { await api("/api/friends", { method: "POST", body: JSON.stringify({ handle: b.dataset.add }) }); b.textContent = "Requested"; } catch (e) { alert(e.message); } };
    });
  };
  $("#go").onclick = run;
  $("#q").addEventListener("keydown", (e) => e.key === "Enter" && run());
}
async function showLive() {
  view.innerHTML = `<h2>Live door</h2><p class="sub">Flag on your page. Real ingest is later.</p><div class="card"><input id="ltitle" placeholder="Title" /><div class="row" style="margin-top:0.7rem"><button class="gold" id="start" type="button">Go live</button><button class="ghost" id="stop" type="button">End</button></div><p class="sub" id="lstat"></p></div>`;
  $("#start").onclick = async () => { try { const { live } = await api("/api/live/start", { method: "POST", body: JSON.stringify({ title: $("#ltitle").value }) }); $("#lstat").textContent = "Live as @" + live.handle + " — " + live.title; } catch (e) { alert(e.message); } };
  $("#stop").onclick = async () => { try { await api("/api/live/stop", { method: "POST", body: "{}" }); $("#lstat").textContent = "Door closed."; } catch (e) { alert(e.message); } };
}
async function showStudio() {
  if (!me) return (view.innerHTML = `<p class="sub">Sign in first.</p>`);
  const { groups } = await api("/api/groups");
  const rooms = await api("/api/rooms").catch(() => ({ groups: [] }));
  view.innerHTML = `<h2>Studio</h2><p class="sub">Rooms on this house.</p><div class="card row"><input id="gname" placeholder="Room name" style="flex:1" /><button class="gold" id="gmake" type="button">Start group</button></div><div id="glist">${groups.map((g) => `<div class="card">${escapeHtml(g.name)} · owner @${g.owner}</div>`).join("") || "<p class='sub'>Your rooms will land here.</p>"}</div><h2>Open rooms</h2><div>${(rooms.groups || []).map((g) => `<div class="card hit"><span>${escapeHtml(g.name)} · @${g.owner}</span><button class="ghost" data-join="${g.id}" type="button">Join</button></div>`).join("") || "<p class='sub'>None yet.</p>"}</div>`;
  $("#gmake").onclick = async () => { try { await api("/api/groups", { method: "POST", body: JSON.stringify({ name: $("#gname").value }) }); showStudio(); } catch (e) { alert(e.message); } };
  document.querySelectorAll("[data-join]").forEach((b) => {
    b.onclick = async () => { try { await api("/api/groups/" + b.dataset.join + "/join", { method: "POST", body: "{}" }); showStudio(); } catch (e) { alert(e.message); } };
  });
}

async function showPrivateRooms() {
  if (!me) return (view.innerHTML = `<p class="sub">Sign in to enter your private Home.</p>`);
  try {
    const { rooms, settings } = await api("/api/private-rooms");
    const byId = new Map(rooms.map((room) => [room.id, room]));
    const ordered = settings.order.map((id) => byId.get(id)).filter(Boolean);
    const statusLabel = (status) => status === "foundation" ? "Existing foundation" : status === "in-development" ? "In development" : "Planned — engine not yet implemented";
    view.innerHTML = `
      <h2>Your Home · Private Rooms</h2>
      <p class="sub">These rooms belong to your account. Only you can see this workspace. Your public Master Room is a separate presentation.</p>
      <div class="card"><strong>Master Room</strong><p class="sub">Your public-facing presentation and portfolio. You choose what the world sees.</p><a class="handle" href="/u/${encodeURIComponent(me.handle)}">View your public Master Room</a></div>
      <div id="privateRoomList">${ordered.map((room, index) => `
        <section class="card private-room">
          <div class="row" style="align-items:center;justify-content:space-between">
            <h3>${escapeHtml(room.name)}</h3>
            <span class="sub">${escapeHtml(statusLabel(room.status))}</span>
          </div>
          <p>${escapeHtml(room.summary)}</p>
          <div class="row">
            <button class="ghost" data-up="${room.id}" ${index===0?"disabled":""} type="button">Move up</button>
            <button class="ghost" data-down="${room.id}" ${index===ordered.length-1?"disabled":""} type="button">Move down</button>
            <label>Workspace theme
              <select data-theme="${room.id}">
                <option value="default" ${settings.layouts[room.id]?.theme==="default"?"selected":""}>Default</option>
                <option value="dark" ${settings.layouts[room.id]?.theme==="dark"?"selected":""}>Dark</option>
                <option value="light" ${settings.layouts[room.id]?.theme==="light"?"selected":""}>Light</option>
                <option value="midnight" ${settings.layouts[room.id]?.theme==="midnight"?"selected":""}>Midnight</option>
                <option value="warm" ${settings.layouts[room.id]?.theme==="warm"?"selected":""}>Warm</option>
              </select>
            </label>
          </div>
          <p class="fine">Capability status: ${escapeHtml(statusLabel(room.status))}. A room listing is not a claim that its full creative engine is ready.</p>
        </section>`).join("")}</div>
      <button class="gold" id="saveRoomSettings" type="button">Save my room layout</button>
      <p class="fine" id="roomSaveStatus"></p>`;
    const move = (id, delta) => {
      const index = settings.order.indexOf(id);
      const next = index + delta;
      if (index < 0 || next < 0 || next >= settings.order.length) return;
      [settings.order[index], settings.order[next]] = [settings.order[next], settings.order[index]];
      showPrivateRooms();
    };
    document.querySelectorAll("[data-up]").forEach((button) => button.onclick = () => move(button.dataset.up, -1));
    document.querySelectorAll("[data-down]").forEach((button) => button.onclick = () => move(button.dataset.down, 1));
    document.querySelectorAll("[data-theme]").forEach((select) => {
      select.onchange = () => { settings.layouts[select.dataset.theme] = { theme: select.value }; };
    });
    $("#saveRoomSettings").onclick = async () => {
      try {
        const { settings: saved } = await api("/api/private-rooms/settings", {
          method: "PUT", body: JSON.stringify(settings)
        });
        $("#roomSaveStatus").textContent = "Private room layout saved.";
      } catch (error) { $("#roomSaveStatus").textContent = error.message; }
    };
  } catch (error) {
    view.innerHTML = `<p class="sub">${escapeHtml(error.message)}</p>`;
  }
}

async function showSettings() {
  if (!me) return (view.innerHTML = `<p class="sub">Sign in first.</p>`);
  view.innerHTML = `<h2>Keys</h2><p class="sub">Your name on the door. Export what we store. Leave for good if you want the house gone.</p><div class="card"><label>Display name</label><input id="dname" value="${escapeAttr(me.displayName)}" /><div class="row" style="margin-top:0.7rem"><button class="gold" id="saveName" type="button">Save name</button><button class="ghost" id="exp" type="button">Export</button></div></div><div class="card"><p class="sub">This deletes the home on this machine.</p><button class="ghost" id="gone" type="button">Delete home</button></div>`;
  $("#saveName").onclick = async () => {
    try {
      const { user } = await api("/api/me", { method: "PUT", body: JSON.stringify({ displayName: $("#dname").value }) });
      me = { ...me, ...user };
      alert("Saved.");
    } catch (e) { alert(e.message); }
  };
  $("#exp").onclick = async () => {
    try {
      const pack = await api("/api/export");
      const a = document.createElement("a");
      a.download = "yours-" + me.handle + ".json";
      a.href = URL.createObjectURL(new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" }));
      a.click();
    } catch (e) { alert(e.message); }
  };
  $("#gone").onclick = async () => {
    if (!confirm("Delete this home on this machine?")) return;
    try {
      await api("/api/me", { method: "DELETE" });
      await api("/api/logout", { method: "POST", body: "{}" });
      location.href = "/";
    } catch (e) { alert(e.message); }
  };
}
function escapeHtml(s) { return String(s || "").replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">"); }
function escapeAttr(s) { return escapeHtml(s).replace(/"/g, """); }
session().then(route);
window.addEventListener("popstate", route);
