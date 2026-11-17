export const ROOM_CATALOG = Object.freeze([
  { id: "music-studio", name: "Music Studio", category: "create", summary: "Compose, record, arrange, mix, and organize music.", status: "planned", capabilities: ["songwriting", "beat-production", "multitrack-audio", "mixing-mastering"] },
  { id: "streaming", name: "Streaming Room", category: "broadcast", summary: "Design live-production layouts and manage supported broadcasts.", status: "planned", capabilities: ["scenes-overlays", "camera-audio-controls", "stream-monitoring", "provider-integrations"] },
  { id: "social-media", name: "Social Media Room", category: "connect", summary: "View and manage supported connected social accounts in one private workspace.", status: "planned", capabilities: ["official-account-connections", "supported-feeds", "publishing", "analytics"] },
  { id: "game-development", name: "Game Development", category: "create", summary: "Design, build, test, and publish 2D and 3D games.", status: "planned", capabilities: ["2d-3d-scenes", "assets-and-animation", "gameplay-systems", "testing-builds"] },
  { id: "creative-design", name: "Creative Design", category: "create", summary: "Graphic design, photo, video, animation, and cinematography workflows.", status: "planned", capabilities: ["graphic-design", "photo-editing", "video-editing", "animation", "cinematography"] },
  { id: "podcast", name: "Podcast Room", category: "create", summary: "Record, edit, prepare, and publish audio/video episodes.", status: "planned", capabilities: ["recording", "remote-guests", "multitrack-editing", "transcription"] },
  { id: "master-room", name: "Master Room", category: "publish", summary: "Your public presentation, portfolio, and community destination.", status: "foundation", capabilities: ["public-profile", "published-blocks", "official-embeds"] }
]);

const DEFAULT_ROOM_SETTINGS = Object.freeze({
  order: ROOM_CATALOG.map((room) => room.id),
  layouts: {}
});

export function defaultRoomSettings() {
  return {
    order: [...DEFAULT_ROOM_SETTINGS.order],
    layouts: {}
  };
}

export function normalizeRoomSettings(input) {
  const validIds = new Set(ROOM_CATALOG.filter((room) => room.id !== "master-room").map((room) => room.id));
  const submittedOrder = Array.isArray(input?.order) ? input.order : [];
  const order = [];
  for (const id of submittedOrder) {
    if (validIds.has(id) && !order.includes(id)) order.push(id);
  }
  for (const room of ROOM_CATALOG) {
    if (room.id !== "master-room" && !order.includes(room.id)) order.push(room.id);
  }

  const layouts = {};
  if (input?.layouts && typeof input.layouts === "object" && !Array.isArray(input.layouts)) {
    for (const [id, layout] of Object.entries(input.layouts)) {
      if (!validIds.has(id) || !layout || typeof layout !== "object" || Array.isArray(layout)) continue;
      const theme = ["default", "dark", "light", "midnight", "warm"].includes(layout.theme) ? layout.theme : "default";
      layouts[id] = { theme };
    }
  }
  return { order, layouts };
}

export function getRoomCatalog() {
  return ROOM_CATALOG.map((room) => ({ ...room, capabilities: [...room.capabilities] }));
}
