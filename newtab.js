const form = document.querySelector(".search");
const input = document.querySelector("#search-query");
const message = document.querySelector(".message");

// Perspective expansion gives a continuous flight toward the galaxy.
const canvas = document.querySelector("#star-flight");
const ctx = canvas.getContext("2d", { alpha: true });
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let width = 0, height = 0, stars = [], request = null, elapsed = 0, last = null;
function resizeSpace() {
  width = innerWidth;
  height = innerHeight;
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  stars = Array.from({ length: Math.max(800, Math.min(1800, Math.round(width * height / 1000))) * galacticSettings.density }, () => ({
    x: (Math.random() - .5) * width * 2,
    y: (Math.random() - .5) * height * 2,
    phase: Math.random(), radius: .4 + Math.random() * 1.25,
    twinkle: Math.random() < .32, offset: Math.random() * Math.PI * 2,
    period: 2.8 + Math.random() * 3.2,
    color: Math.random() < .18 ? "234,211,255" : "199,220,255"
  }));
  drawSpace();
}
function drawSpace() {
  ctx.clearRect(0, 0, width, height);
  for (const star of stars) {
    const depth = (star.phase + elapsed * galacticSettings.speed / 45) % 1;
    const scale = .025 * Math.pow(80, depth);
    const x = width / 2 + star.x * scale, y = height / 2 + star.y * scale;
    if (x < -10 || x > width + 10 || y < -10 || y > height + 10) continue;
    const fade = Math.min(1, depth * 8) * Math.min(1, (1 - depth) * 10);
    const pulse = star.twinkle && galacticSettings.twinkle && !reducedMotion.matches ? .72 + .28 * Math.sin(elapsed * Math.PI * 2 / star.period + star.offset) : 1;
    const alpha = fade * (.24 + .7 * depth) * pulse;
    const radius = star.radius * (.32 + depth * .9);
    ctx.fillStyle = `rgba(${star.color},${alpha * .12})`;
    ctx.beginPath(); ctx.arc(x, y, radius * 3.4, 0, Math.PI * 2); ctx.fill();
    // Short streaks on approaching stars reinforce depth without a warp-speed effect.
    if (depth > .68) {
      ctx.strokeStyle = `rgba(${star.color},${alpha * .26})`;
      ctx.lineWidth = radius * .75;
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.lineTo(x - star.x * scale * .002, y - star.y * scale * .002); ctx.stroke();
    }
    ctx.fillStyle = `rgba(${star.color},${alpha})`;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
  }
}
function animateSpace(timestamp) {
  request = null;
  if (last !== null) elapsed += Math.min((timestamp - last) / 1000, .05);
  last = timestamp;
  drawSpace();
  if (!document.hidden && !reducedMotion.matches) request = requestAnimationFrame(animateSpace);
}
function resumeSpace() {
  if (request !== null) cancelAnimationFrame(request);
  request = null; last = null;
  drawSpace();
  if (!document.hidden && !reducedMotion.matches) request = requestAnimationFrame(animateSpace);
}
addEventListener("resize", resizeSpace);
document.addEventListener("visibilitychange", resumeSpace);
reducedMotion.addEventListener("change", resumeSpace);
resizeSpace();
resumeSpace();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = input.value.trim();
  if (!query) {
    input.focus();
    return;
  }

  try {
    await browser.search.query({ text: query });
  } catch {
    message.textContent = "Search could not start. You can still search from the address bar.";
  }
});

// Read Firefox's own new-tab shortcuts, including its pinned entries.
async function loadShortcuts() {
  const grid = document.querySelector('#top-sites');
  const status = document.querySelector('#sites-message');
  try {
    const sites = await browser.topSites.get({ newtab: true, includeFavicon: true, limit: 8 });
    for (const site of sites) {
      let url;
      try { url = new URL(site.url); } catch { continue; }
      if (!['https:', 'http:'].includes(url.protocol)) continue;
      const link = document.createElement('a');
      link.className = 'site'; link.href = url.href;
      const title = site.title || url.hostname;
      link.title = title;
      const icon = document.createElement('span'); icon.className = 'site-icon';
      icon.textContent = url.hostname.replace(/^www\./, '').slice(0, 1).toUpperCase();
      if (site.favicon && /^(data:image\/|https?:)/.test(site.favicon)) {
        const img = document.createElement('img'); img.alt = ''; img.src = site.favicon;
        img.addEventListener('error', () => img.remove()); icon.append(img);
      }
      const label = document.createElement('span'); label.className = 'site-label'; label.textContent = title;
      link.append(icon, label); grid.append(link);
    }
    if (!grid.children.length) status.textContent = 'Your Firefox shortcuts will appear here as you browse.';
  } catch {
    status.textContent = 'Reload Galactic Tab and allow its shortcut permission to display your Firefox sites.';
  }
}
async function nameSearch() {
  try {
    const engines = await browser.search.get();
    const engine = engines.find(item => item.isDefault);
    if (engine) input.placeholder = `Search with ${engine.name}`;
  } catch { /* Generic search label remains available. */ }
}
loadShortcuts();
nameSearch();
