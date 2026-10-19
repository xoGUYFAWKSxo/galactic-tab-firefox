const SETTINGS_KEY = 'galactic-tab-settings-v1';
const widgetNames = {heading:'Title', search:'Search', shortcuts:'Shortcuts', clock:'Clock & date', notes:'Notes'};
const defaultSettings = {corner:'top-right',size:300,spin:1,speed:1,density:1,twinkle:true,galaxy:true,opacity:.85,clock24:false,widgets:{heading:true,search:true,shortcuts:true,clock:true,notes:false},order:Object.keys(widgetNames),notes:''};
function normalizeSettings(raw) {
  const clean = structuredClone(defaultSettings);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return clean;
  for (const [key, min, max] of [['size',100,500],['spin',0,2],['speed',0,3],['density',.25,2],['opacity',.2,1]]) {
    if (typeof raw[key] === 'number' && Number.isFinite(raw[key])) clean[key] = Math.max(min,Math.min(max,raw[key]));
  }
  for (const key of ['twinkle','galaxy','clock24']) if (typeof raw[key] === 'boolean') clean[key] = raw[key];
  if (['top-right','top-left','bottom-right','bottom-left'].includes(raw.corner)) clean.corner = raw.corner;
  for (const key of Object.keys(widgetNames)) if (typeof raw.widgets?.[key] === 'boolean') clean.widgets[key] = raw.widgets[key];
  if (Array.isArray(raw.order)) clean.order = [...new Set([...raw.order.filter(key => Object.hasOwn(widgetNames,key)),...clean.order])];
  if (typeof raw.notes === 'string') clean.notes = raw.notes.slice(0,20000);
  return clean;
}
// Each page tags its writes so storage.onChanged can skip its own echoes.
const settingsWriter = crypto.randomUUID();
let galacticSettings = structuredClone(defaultSettings);
// browser.storage.local survives history and site-data clearing; localStorage does not.
const settingsLoaded = (async () => {
  try {
    const stored = (await browser.storage.local.get(SETTINGS_KEY))[SETTINGS_KEY];
    if (stored !== undefined) { galacticSettings = normalizeSettings(stored); return; }
    const legacy = localStorage.getItem(SETTINGS_KEY);
    if (legacy === null) return;
    galacticSettings = normalizeSettings(JSON.parse(legacy));
    await browser.storage.local.set({[SETTINGS_KEY]: galacticSettings});
    localStorage.removeItem(SETTINGS_KEY);
  } catch { /* Defaults remain in place. */ }
})();
