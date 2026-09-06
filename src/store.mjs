import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "data");
const file = path.join(dir, "db.json");

function empty() {
  return {
    users: [],
    pages: {},
    friends: [],
    groups: [],
    lives: {},
    posts: [],
  };
}

export function load() {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return empty();
  }
}

export function save(db) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(db, null, 2));
}

export function defaultPage(user) {
  return {
    handle: user.handle,
    plan: "house",
    title: user.displayName,
    bio: "A home you are in charge of.",
    blocks: [
      { id: "hero", type: "hero", text: user.displayName },
      { id: "bio", type: "text", text: "Design it. Build it. Create." },
      { id: "live", type: "live", text: "Live door" },
    ],
    updatedAt: Date.now(),
  };
}
