const form = document.querySelector(".search");
const input = document.querySelector("#search-query");
const message = document.querySelector(".message");

// Perspective expansion gives a continuous flight toward the galaxy.
const canvas = document.querySelector("#star-flight");
const ctx = canvas.getContext("2d", { alpha: true });
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let width = 0, height = 0, stars = [], meteors = [], nextMeteor = 4, request = null, elapsed = 0, last = null;
// "auto" follows the system's reduce-motion setting; "on" and "off" override it.
function sceneAnimates() {
  return galacticSettings.motion === 'on' || (galacticSettings.motion === 'auto' && !reducedMotion.matches);
}
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
    tint: Math.random() < .18 ? 1 : 0
  }));
  drawSpace();
}
function launchMeteor() {
  const leftward = Math.random() < .5, angle = (leftward ? 145 : 35) * Math.PI / 180 + (Math.random() - .5) * .3;
  const speed = Math.max(width, height) * (.55 + Math.random() * .35);
  meteors.push({ x: width * (leftward ? .35 + Math.random() * .6 : .05 + Math.random() * .6), y: height * Math.random() * .45,
    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, age: 0, life: .7 + Math.random() * .5 });
}
function drawMeteors(step) {
  if (galacticSettings.shooting && sceneAnimates() && elapsed >= nextMeteor) { launchMeteor(); nextMeteor = elapsed + 5 + Math.random() * 9; }
  const color = themes[galacticSettings.theme].stars[0];
  meteors = meteors.filter(meteor => (meteor.age += step) < meteor.life);
  for (const meteor of meteors) {
    const x = meteor.x + meteor.vx * meteor.age, y = meteor.y + meteor.vy * meteor.age;
    const fade = Math.sin(Math.PI * meteor.age / meteor.life);
    const tail = ctx.createLinearGradient(x, y, x - meteor.vx * .12, y - meteor.vy * .12);
    tail.addColorStop(0, `rgba(${color},${fade * .9})`); tail.addColorStop(1, `rgba(${color},0)`);
    ctx.strokeStyle = tail; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - meteor.vx * .12, y - meteor.vy * .12); ctx.stroke();
  }
}
function drawSpace(step = 0) {
  ctx.clearRect(0, 0, width, height);
  const colors = themes[galacticSettings.theme].stars, twinkles = galacticSettings.twinkle && sceneAnimates();
  for (const star of stars) {
    const depth = (star.phase + elapsed * galacticSettings.speed / 45) % 1;
    const scale = .025 * Math.pow(80, depth);
    const x = width / 2 + star.x * scale, y = height / 2 + star.y * scale;
    if (x < -10 || x > width + 10 || y < -10 || y > height + 10) continue;
    const fade = Math.min(1, depth * 8) * Math.min(1, (1 - depth) * 10);
    const pulse = star.twinkle && twinkles ? .72 + .28 * Math.sin(elapsed * Math.PI * 2 / star.period + star.offset) : 1;
    const alpha = fade * (.24 + .7 * depth) * pulse;
    const radius = star.radius * (.32 + depth * .9), color = colors[star.tint];
    ctx.fillStyle = `rgba(${color},${alpha * .12})`;
    ctx.beginPath(); ctx.arc(x, y, radius * 3.4, 0, Math.PI * 2); ctx.fill();
    // Short streaks on approaching stars reinforce depth without a warp-speed effect.
    if (depth > .68) {
      ctx.strokeStyle = `rgba(${color},${alpha * .26})`;
      ctx.lineWidth = radius * .75;
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.lineTo(x - star.x * scale * .002, y - star.y * scale * .002); ctx.stroke();
    }
    ctx.fillStyle = `rgba(${color},${alpha})`;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
  }
  drawMeteors(step);
}
function animateSpace(timestamp) {
  request = null;
  const step = last === null ? 0 : Math.min((timestamp - last) / 1000, .05);
  elapsed += step;
  last = timestamp;
  drawSpace(step);
  if (!document.hidden && sceneAnimates()) request = requestAnimationFrame(animateSpace);
}
function resumeSpace() {
  if (request !== null) cancelAnimationFrame(request);
  request = null; last = null;
  if (!sceneAnimates()) meteors = [];
  document.documentElement.classList.toggle('motion-off', !sceneAnimates());
  drawSpace();
  if (!document.hidden && sceneAnimates()) request = requestAnimationFrame(animateSpace);
}
addEventListener("resize", resizeSpace);
document.addEventListener("visibilitychange", resumeSpace);
reducedMotion.addEventListener("change", resumeSpace);
resizeSpace();
resumeSpace();

let searchEngines = [];
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = input.value.trim();
  if (!query) {
    input.focus();
    return;
  }

  try {
    const engine = searchEngines.find(item => item.name === galacticSettings.engine);
    if (engine) await browser.search.search({ query, engine: engine.name });
    else await browser.search.query({ text: query });
  } catch {
    message.textContent = "Search could not start. You can still search from the address bar.";
  }
});
function labelSearch() {
  const engine = searchEngines.find(item => item.name === galacticSettings.engine) || searchEngines.find(item => item.isDefault);
  input.placeholder = engine ? `Search with ${engine.name}` : 'Search the web';
}
async function loadEngines() {
  try { searchEngines = await browser.search.get(); } catch { /* Generic search label remains available. */ }
  labelSearch();
  document.dispatchEvent(new Event('engines-loaded'));
}

// Pinned shortcuts come first, then Firefox's own new-tab sites that are not hidden.
let topSiteList = [], topSitesFailed = false;
async function loadTopSites() {
  try {
    const sites = await browser.topSites.get({ newtab: true, includeFavicon: true, limit: 40 });
    topSiteList = sites.flatMap(site => {
      const url = cleanUrl(site.url);
      return url ? [{ url, title: site.title || new URL(url).hostname, favicon: site.favicon }] : [];
    });
  } catch { topSitesFailed = true; }
  renderShortcuts();
}
function siteTile(site, pinned) {
  const url = new URL(site.url), tile = document.createElement('div');
  tile.className = 'site-tile';
  const link = document.createElement('a');
  link.className = 'site'; link.href = url.href;
  const title = site.title || url.hostname.replace(/^www\./, '');
  link.title = title;
  const icon = document.createElement('span'); icon.className = 'site-icon';
  icon.textContent = url.hostname.replace(/^www\./, '').slice(0, 1).toUpperCase();
  const favicon = site.favicon || topSiteList.find(item => new URL(item.url).hostname === url.hostname)?.favicon;
  if (favicon && /^(data:image\/|https?:)/.test(favicon)) {
    const img = document.createElement('img'); img.alt = ''; img.src = favicon;
    img.addEventListener('error', () => img.remove()); icon.append(img);
  }
  const label = document.createElement('span'); label.className = 'site-label'; label.textContent = title;
  link.append(icon, label);
  const actions = document.createElement('div'); actions.className = 'site-actions';
  const action = (text, name, handler) => {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = text;
    button.title = name; button.setAttribute('aria-label', `${name}: ${title}`);
    button.addEventListener('click', handler); actions.append(button);
  };
  if (pinned) action('✕', 'Unpin', () => updateShortcuts(() => { galacticSettings.pins = galacticSettings.pins.filter(pin => pin.url !== site.url); }));
  else {
    if (galacticSettings.pins.length < 16) action('📌', 'Pin', () => updateShortcuts(() => { galacticSettings.pins.push({ title: site.title.slice(0, 60), url: site.url }); }));
    action('✕', 'Hide', () => updateShortcuts(() => { galacticSettings.hidden = [...galacticSettings.hidden, site.url].slice(-50); }));
  }
  tile.append(link, actions);
  return tile;
}
function renderShortcuts() {
  const grid = document.querySelector('#top-sites'), status = document.querySelector('#sites-message');
  const pinned = new Set(galacticSettings.pins.map(pin => pin.url)), hidden = new Set(galacticSettings.hidden);
  const extra = galacticSettings.topSites ? topSiteList.filter(site => !pinned.has(site.url) && !hidden.has(site.url)) : [];
  const tiles = [...galacticSettings.pins.map(pin => siteTile(pin, true)), ...extra.map(site => siteTile(site, false))].slice(0, galacticSettings.siteCount);
  grid.replaceChildren(...tiles);
  grid.style.setProperty('--site-columns', Math.max(1, Math.min(8, tiles.length)));
  status.textContent = tiles.length ? '' : galacticSettings.topSites && topSitesFailed
    ? 'Reload Galactic Tab and allow its shortcut permission to display your Firefox sites.'
    : 'Pin sites in Customize › Shortcuts, or they will appear here as you browse.';
}
loadTopSites();
loadEngines();
