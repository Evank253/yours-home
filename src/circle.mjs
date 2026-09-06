export function listCircle(db, handle) {
  const friends = [];
  const incoming = [];
  for (const f of db.friends || []) {
    if (f.status === "ok") {
      if (f.a === handle) friends.push(f.b);
      if (f.b === handle) friends.push(f.a);
    } else if (f.status === "requested" && f.b === handle) {
      incoming.push(f.a);
    }
  }
  return { friends: [...new Set(friends)], incoming: [...new Set(incoming)] };
}

export function acceptCircle(db, me, from) {
  const row = (db.friends || []).find(
    (f) => f.status === "requested" && f.a === from && f.b === me
  );
  if (!row) return false;
  row.status = "ok";
  return true;
}
