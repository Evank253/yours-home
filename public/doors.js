const file = document.getElementById("file");
const handleEl = document.getElementById("handle");
let img = null;
file.onchange = () => {
  const f = file.files && file.files[0];
  if (!f) return;
  const im = new Image();
  im.onload = () => { img = im; URL.revokeObjectURL(im.src); };
  im.src = URL.createObjectURL(f);
};
document.getElementById("cut").onclick = () => {
  if (!img) return;
  const tag = "@" + String(handleEl.value || "yours").replace(/^@/, "").slice(0, 24);
  drawDoor("c169", 16 / 9, 1280, tag);
  drawDoor("c11", 1, 1080, tag);
  drawDoor("c916", 9 / 16, 1080, tag);
};
function coverCrop(iw, ih, ratio) {
  let tw, th;
  if (iw / ih > ratio) { th = ih; tw = ih * ratio; }
  else { tw = iw; th = iw / ratio; }
  return { sx: (iw - tw) / 2, sy: (ih - th) / 2, sw: tw, sh: th };
}
function drawDoor(id, ratio, longSide, tag) {
  const c = document.getElementById(id);
  const w = ratio >= 1 ? longSide : Math.round(longSide * ratio);
  const h = ratio >= 1 ? Math.round(longSide / ratio) : longSide;
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  const crop = coverCrop(img.width, img.height, ratio);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, w, h);
  const bar = Math.round(h * 0.08);
  ctx.fillStyle = "rgba(7,7,8,0.72)";
  ctx.fillRect(0, h - bar, w, bar);
  ctx.fillStyle = "#f4f0e8";
  ctx.font = "600 " + Math.max(14, Math.round(bar * 0.38)) + "px Georgia, serif";
  ctx.fillText("YOURS  " + tag, Math.round(w * 0.04), h - bar * 0.38);
}
document.querySelectorAll("[data-dl]").forEach((b) => {
  b.onclick = () => {
    const c = document.getElementById(b.dataset.dl);
    const a = document.createElement("a");
    a.download = "yours-door-" + b.dataset.dl + ".png";
    a.href = c.toDataURL("image/png");
    a.click();
  };
});
