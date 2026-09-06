const file = document.getElementById("file");
const srcC = document.getElementById("src");
const outC = document.getElementById("out");
const scaleEl = document.getElementById("scale");
const amountEl = document.getElementById("amount");
const contrastEl = document.getElementById("contrast");
const denoiseEl = document.getElementById("denoise");
let source = null;
file.addEventListener("change", () => {
  const f = file.files && file.files[0];
  if (!f) return;
  const img = new Image();
  img.onload = () => { source = img; drawFit(srcC, img); URL.revokeObjectURL(img.src); };
  img.src = URL.createObjectURL(f);
});
["scale", "amount", "contrast", "denoise"].forEach((id) => {
  document.getElementById(id).addEventListener("input", () => {
    document.getElementById("sv").textContent = scaleEl.value + "x";
    document.getElementById("av").textContent = amountEl.value;
    document.getElementById("cv").textContent = contrastEl.value;
    document.getElementById("dv").textContent = denoiseEl.value;
  });
});
document.getElementById("run").onclick = render;
document.getElementById("save").onclick = () => {
  const a = document.createElement("a");
  a.download = "yours-clarity.png";
  a.href = outC.toDataURL("image/png");
  a.click();
};
function drawFit(canvas, img) {
  const max = 720;
  const r = Math.min(1, max / Math.max(img.width, img.height));
  canvas.width = Math.max(1, Math.round(img.width * r));
  canvas.height = Math.max(1, Math.round(img.height * r));
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
}
function getData(img, scale) {
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);
  return { ctx, data: ctx.getImageData(0, 0, w, h), w, h };
}
function blur(src, w, h, radius) {
  const out = new Float32Array(src.length);
  const r = Math.max(1, radius | 0);
  const tmp = new Float32Array(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0, n = 0;
      for (let k = -r; k <= r; k++) {
        const xx = Math.min(w - 1, Math.max(0, x + k));
        s += src[(y * w + xx) * 4]; n++;
      }
      tmp[(y * w + x) * 4] = s / n;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0, n = 0;
      for (let k = -r; k <= r; k++) {
        const yy = Math.min(h - 1, Math.max(0, y + k));
        s += tmp[(yy * w + x) * 4]; n++;
      }
      out[(y * w + x) * 4] = s / n;
    }
  }
  return out;
}
function luma(data) {
  const L = new Float32Array(data.length);
  for (let i = 0; i < data.length; i += 4) {
    L[i] = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  }
  return L;
}
function render() {
  if (!source) return;
  const scale = Number(scaleEl.value);
  const amount = Number(amountEl.value);
  const local = Number(contrastEl.value);
  const denoise = Number(denoiseEl.value);
  const { ctx, data, w, h } = getData(source, scale);
  const px = data.data;
  const L = luma(px);
  const blur1 = blur(L, w, h, 1);
  const blur4 = blur(L, w, h, 4);
  for (let i = 0; i < px.length; i += 4) {
    let r = px[i], g = px[i + 1], b = px[i + 2];
    const y = L[i], ySoft = blur1[i], yWide = blur4[i];
    const high = y - ySoft, mid = ySoft - yWide;
    let y2 = y + amount * high + local * mid;
    y2 = y2 * (1 - denoise) + yWide * denoise;
    const ratio = y > 1 ? y2 / y : 1;
    px[i] = Math.max(0, Math.min(255, r * ratio));
    px[i + 1] = Math.max(0, Math.min(255, g * ratio));
    px[i + 2] = Math.max(0, Math.min(255, b * ratio));
  }
  ctx.putImageData(data, 0, 0);
  outC.width = w; outC.height = h;
  outC.getContext("2d").drawImage(ctx.canvas, 0, 0);
}
scaleEl.dispatchEvent(new Event("input"));
