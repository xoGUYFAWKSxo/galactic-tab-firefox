const SETTINGS_KEY = 'galactic-tab-settings-v1';
const BACKGROUND_KEY = 'galactic-tab-background';
const SETUPS_KEY = 'galactic-tab-setups';
const DEVICE_KEY = 'galactic-tab-device';
const SYNC_KEY = 'galactic-tab-sync';
const SYNC_SITES_KEY = 'galactic-tab-sync-sites';
const widgetNames = {heading:'Title', greeting:'Greeting', search:'Search', shortcuts:'Shortcuts', clock:'Clock & date', todo:'To-do list', notes:'Notes'};
// Themes recolor the artwork by turning its hue toward `hue`; Classic keeps each piece's own colors.
const themes = {
  classic:{name:'Classic', accent:'#7883df', hue:null, stars:['199,220,255','234,211,255'], nebula:['122,130,221','105,62,150','48,69,149']},
  ice:{name:'Icy blue', accent:'#4c9fd6', hue:205, stars:['208,238,255','168,212,255'], nebula:['80,160,230','52,104,190','40,140,175']},
  gold:{name:'Warm gold', accent:'#c9913a', hue:38, stars:['255,234,196','255,208,160'], nebula:['205,145,70','160,84,52','124,92,58']},
  violet:{name:'Purple nebula', accent:'#a06ade', hue:285, stars:['228,208,255','255,196,240'], nebula:['160,90,225','190,70,170','92,62,185']},
  emerald:{name:'Emerald', accent:'#36ad83', hue:158, stars:['204,255,234','172,240,255'], nebula:['60,180,140','36,118,132','52,150,108']},
  rose:{name:'Rose', accent:'#d9668a', hue:340, stars:['255,216,228','255,192,212'], nebula:['220,92,132','168,60,120','124,62,142']},
};
const artworks = {
  galaxy:{name:'Spiral galaxy', src:'assets/galaxy.png', hue:245, spins:true},
  nebula:{name:'Nebula', src:'assets/art/nebula.webp', hue:265, spins:true},
  blackhole:{name:'Black hole', src:'assets/art/blackhole.webp', hue:30, spins:true},
  planet:{name:'Ringed planet', src:'assets/art/planet.webp', hue:30, spins:false},
};
const backgrounds = {nebula:'Nebula glow', twilight:'Twilight', black:'Deep black', custom:'Your image'};
const defaultSettings = {
  corner:'top-right', size:300, spin:1, speed:1, density:1, twinkle:true, galaxy:true, opacity:.85, clock24:false,
  widgets:{heading:true,greeting:false,search:true,shortcuts:true,clock:true,todo:false,notes:false}, order:Object.keys(widgetNames), notes:'',
  theme:'classic', art:'galaxy', background:'nebula', dim:.35, shooting:true, motion:'auto',
  name:'', clockSeconds:false, dateFormat:'long', zone2:'', engine:'',
  topSites:true, siteCount:8, pins:[], hidden:[], todos:[],
};
// Personal content survives presets, resets and saved setups.
const personalKeys = ['notes','todos','pins','hidden','name'];
// Notes and to-dos can be long, so they stay on this computer when syncing.
const localOnlyKeys = ['notes','todos'];
function cleanUrl(text) {
  if (typeof text !== 'string' || text.length > 500) return null;
  const trimmed = text.trim();
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return ['https:','http:'].includes(url.protocol) && url.hostname ? url.href : null;
  } catch { return null; }
}
function validZone(zone) {
  if (typeof zone !== 'string' || !zone || zone.length > 64) return false;
  try { new Intl.DateTimeFormat('en', {timeZone:zone}); return true; } catch { return false; }
}
// New widgets join next to their default neighbour instead of at the end.
function mergeOrder(saved) {
  const order = saved.filter((key,index) => Object.hasOwn(widgetNames,key) && saved.indexOf(key) === index);
  const defaults = Object.keys(widgetNames);
  defaults.forEach((key,index) => {
    if (order.includes(key)) return;
    const before = defaults.slice(0,index).reverse().find(item => order.includes(item));
    order.splice(before ? order.indexOf(before) + 1 : 0, 0, key);
  });
  return order;
}
function normalizeSettings(raw) {
  const clean = structuredClone(defaultSettings);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return clean;
  for (const [key, min, max] of [['size',100,500],['spin',0,2],['speed',0,3],['density',.25,2],['opacity',.2,1],['dim',0,.8]]) {
    if (typeof raw[key] === 'number' && Number.isFinite(raw[key])) clean[key] = Math.max(min,Math.min(max,raw[key]));
  }
  for (const key of ['twinkle','galaxy','clock24','shooting','clockSeconds','topSites']) if (typeof raw[key] === 'boolean') clean[key] = raw[key];
  for (const [key, values] of [['corner',['top-right','top-left','bottom-right','bottom-left']],['theme',Object.keys(themes)],['art',Object.keys(artworks)],
    ['background',Object.keys(backgrounds)],['motion',['auto','on','off']],['dateFormat',['long','short','numeric','none']],['siteCount',[4,8,12,16]]]) {
    if (values.includes(raw[key])) clean[key] = raw[key];
  }
  for (const key of Object.keys(widgetNames)) if (typeof raw.widgets?.[key] === 'boolean') clean.widgets[key] = raw.widgets[key];
  if (Array.isArray(raw.order)) clean.order = mergeOrder(raw.order);
  if (typeof raw.notes === 'string') clean.notes = raw.notes.slice(0,20000);
  if (typeof raw.name === 'string') clean.name = raw.name.slice(0,40);
  if (typeof raw.engine === 'string') clean.engine = raw.engine.slice(0,100);
  if (validZone(raw.zone2)) clean.zone2 = raw.zone2;
  if (Array.isArray(raw.pins)) clean.pins = raw.pins.flatMap(pin => {
    const url = cleanUrl(pin?.url);
    return url ? [{title:typeof pin.title === 'string' ? pin.title.trim().slice(0,60) : '', url}] : [];
  }).slice(0,16);
  if (Array.isArray(raw.hidden)) clean.hidden = [...new Set(raw.hidden.filter(url => typeof url === 'string' && url.length <= 500))].slice(-50);
  if (Array.isArray(raw.todos)) clean.todos = raw.todos.flatMap(item => typeof item?.text === 'string' && item.text.trim()
    ? [{id:typeof item.id === 'string' ? item.id.slice(0,40) : crypto.randomUUID(), text:item.text.trim().slice(0,200), done:item.done === true}] : []).slice(0,100);
  return clean;
}
// Each page tags its writes so storage.onChanged can skip its own echoes.
const settingsWriter = crypto.randomUUID();
let galacticSettings = structuredClone(defaultSettings);
let deviceSettings = {sync:false, syncedAt:0};
// browser.storage.local survives history and site-data clearing; localStorage does not.
const settingsLoaded = (async () => {
  try {
    const stored = await browser.storage.local.get([SETTINGS_KEY, DEVICE_KEY]);
    if (stored[DEVICE_KEY]?.sync === true) deviceSettings = {sync:true, syncedAt:Number(stored[DEVICE_KEY].syncedAt) || 0};
    if (stored[SETTINGS_KEY] !== undefined) galacticSettings = normalizeSettings(stored[SETTINGS_KEY]);
    else {
      const legacy = localStorage.getItem(SETTINGS_KEY);
      if (legacy !== null) {
        galacticSettings = normalizeSettings(JSON.parse(legacy));
        await browser.storage.local.set({[SETTINGS_KEY]: galacticSettings});
        localStorage.removeItem(SETTINGS_KEY);
      }
    }
  } catch { /* Defaults remain in place. */ }
  // Pick up changes another computer made since this one last synced, before anything is drawn.
  if (deviceSettings.sync) {
    try {
      const remote = await browser.storage.sync.get([SYNC_KEY, SYNC_SITES_KEY]);
      if (remote[SYNC_KEY]?.updated > deviceSettings.syncedAt) adoptSynced(remote[SYNC_KEY], remote[SYNC_SITES_KEY]);
    } catch { /* Sync is unavailable; local settings remain. */ }
  }
})();
function adoptSynced(look, sites) {
  const kept = Object.fromEntries(localOnlyKeys.map(key => [key, galacticSettings[key]]));
  galacticSettings = normalizeSettings({...look.settings, ...sites?.settings, ...kept});
  deviceSettings.syncedAt = look.updated;
  browser.storage.local.set({[SETTINGS_KEY]: {...galacticSettings, writer: settingsWriter}, [DEVICE_KEY]: deviceSettings}).catch(() => {});
}
