const panel = document.querySelector('#customize-panel');
const settingsStatus = document.querySelector('#settings-status');
const launcher = document.querySelector('#open-customize');
const notes = document.querySelector('#personal-notes');
let backgroundUrl = null, savedSetups = [];
function saveSettings() {
  browser.storage.local.set({[SETTINGS_KEY]: {...galacticSettings, writer: settingsWriter}}).then(
    () => { settingsStatus.textContent = 'Saved on this device.'; },
    () => { settingsStatus.textContent = 'Settings could not be saved. Export a backup to keep your changes.'; });
  queueSync();
}
const personalPart = () => Object.fromEntries(personalKeys.map(key => [key, structuredClone(galacticSettings[key])]));
function applySettings() {
  const root = document.documentElement, scene = document.querySelector('.galaxy');
  const theme = themes[galacticSettings.theme], art = artworks[galacticSettings.art];
  root.style.setProperty('--accent', theme.accent);
  theme.nebula.forEach((rgb, index) => root.style.setProperty(`--nebula-${index + 1}`, rgb));
  root.style.setProperty('--art-hue', `${theme.hue === null ? 0 : theme.hue - art.hue}deg`);
  if (scene.getAttribute('src') !== art.src) scene.src = art.src;
  scene.classList.toggle('no-spin', !art.spins);
  // A custom background without its image on this computer (for example, synced from another) shows the nebula.
  root.dataset.background = galacticSettings.background === 'custom' && !backgroundUrl ? 'nebula' : galacticSettings.background;
  root.style.setProperty('--bg-dim', galacticSettings.dim);
  scene.style.setProperty('--galaxy-size', `min(${galacticSettings.size}px, 24vw, 32vh)`);
  const [vertical,horizontal] = galacticSettings.corner.split('-');
  for (const edge of ['top','bottom','left','right']) scene.style[edge] = edge === vertical || edge === horizontal ? 'var(--galaxy-inset)' : 'auto';
  scene.hidden = !galacticSettings.galaxy;
  scene.style.animationDuration = `${45 / (galacticSettings.spin || 1)}s`;
  scene.style.animationPlayState = galacticSettings.spin === 0 || !art.spins ? 'paused' : 'running';
  document.documentElement.style.setProperty('--card-opacity',galacticSettings.opacity);
  for (const [index,key] of galacticSettings.order.entries()) {
    const element = document.querySelector(`[data-widget="${key}"]`);
    element.hidden = !galacticSettings.widgets[key]; element.style.order = index;
  }
  for (const control of panel.querySelectorAll('[data-setting]')) {
    if (control === document.activeElement && control.type === 'text') continue;
    const value = galacticSettings[control.dataset.setting];
    if (control.type === 'checkbox') control.checked = value; else control.value = value;
  }
  for (const output of panel.querySelectorAll('[data-value]')) {
    const key = output.dataset.value, value = galacticSettings[key];
    output.textContent = key === 'size' ? `${value}px` : ['opacity','dim'].includes(key) ? `${Math.round(value*100)}%` : `${Number(value.toFixed(2))}×`;
  }
  panel.querySelector('[data-setting="spin"]').disabled = !art.spins;
  document.querySelector('#spin-note').hidden = art.spins;
  document.querySelector('#background-image-controls').hidden = galacticSettings.background !== 'custom';
  document.querySelector('#background-note').textContent = backgroundUrl ? 'Image saved on this computer.' : 'No image yet. Choose one to use it.';
  document.querySelector('#remove-background').disabled = !backgroundUrl;
  if (document.activeElement !== notes) notes.value = galacticSettings.notes;
  updateClock(); renderTodos(); labelSearch(); resumeSpace();
}
function refreshPage() {
  applySettings(); renderWidgetControls(); renderShortcutControls(); renderShortcuts(); resizeSpace();
}
function reorder(key, targetIndex) {
  const order = galacticSettings.order; order.splice(order.indexOf(key),1); order.splice(targetIndex,0,key);
  applySettings(); renderWidgetControls(); saveSettings();
}
let draggedWidget = null;
function renderWidgetControls() {
  const list = document.querySelector('#widget-settings'); list.replaceChildren();
  galacticSettings.order.forEach((key,index) => {
    const row = document.createElement('div'); row.className = 'widget-row'; row.draggable = true;
    const label = document.createElement('label'); label.className = 'toggle';
    const check = document.createElement('input'); check.type = 'checkbox'; check.checked = galacticSettings.widgets[key];
    check.addEventListener('change', () => { galacticSettings.widgets[key] = check.checked; applySettings(); saveSettings(); });
    label.append(check,document.createTextNode(widgetNames[key])); row.append(label);
    for (const [delta,text] of [[-1,'Up'],[1,'Down']]) {
      const button = document.createElement('button'); button.textContent = delta < 0 ? '↑' : '↓'; button.setAttribute('aria-label',`Move ${widgetNames[key]} ${text.toLowerCase()}`);
      button.disabled = index+delta < 0 || index+delta >= galacticSettings.order.length;
      button.addEventListener('click', () => { reorder(key,index+delta); list.children[index+delta].querySelector('input').focus(); }); row.append(button);
    }
    row.addEventListener('dragstart', event => { draggedWidget = key; event.dataTransfer.setData('text/plain',key); event.dataTransfer.effectAllowed = 'move'; });
    row.addEventListener('dragover', event => { if (draggedWidget) event.preventDefault(); });
    row.addEventListener('drop', event => { event.preventDefault(); if (draggedWidget && draggedWidget !== key) reorder(draggedWidget,index); draggedWidget = null; });
    row.addEventListener('dragend', () => { draggedWidget = null; }); list.append(row);
  });
}
function fillSelect(select, entries) {
  const current = select.value;
  select.replaceChildren(...entries.map(([value, text]) => new Option(text, value)));
  select.value = current;
}
fillSelect(panel.querySelector('[data-setting="theme"]'), Object.entries(themes).map(([key, theme]) => [key, theme.name]));
fillSelect(panel.querySelector('[data-setting="art"]'), Object.entries(artworks).map(([key, art]) => [key, art.name]));
fillSelect(panel.querySelector('[data-setting="background"]'), Object.entries(backgrounds));
try {
  const zones = Intl.supportedValuesOf('timeZone').map(zone => [zone, `${zoneName(zone)} (${zone.split('/')[0]})`]).sort((a, b) => a[1].localeCompare(b[1]));
  fillSelect(panel.querySelector('[data-setting="zone2"]'), [['', 'None'], ...zones]);
} catch { /* Older Firefox: only "None" is offered. */ }
function fillEngines() {
  const select = panel.querySelector('[data-setting="engine"]');
  fillSelect(select, [['', 'Firefox default'], ...searchEngines.map(engine => [engine.name, engine.name])]);
  // An engine synced from another computer may not be installed here; the default is used until it is.
  if (galacticSettings.engine && !searchEngines.some(engine => engine.name === galacticSettings.engine)) select.add(new Option(`${galacticSettings.engine} (not installed here)`, galacticSettings.engine));
  select.value = galacticSettings.engine;
}
document.addEventListener('engines-loaded', fillEngines);

launcher.addEventListener('click', () => panel.showModal());
document.querySelector('#close-customize').addEventListener('click', () => panel.close());
panel.addEventListener('close', () => launcher.focus());
panel.addEventListener('input', event => {
  const control = event.target, key = control.dataset.setting; if (!key) return;
  galacticSettings[key] = control.type === 'checkbox' ? control.checked : control.type === 'range' || 'number' in control.dataset ? Number(control.value) : control.value;
  applySettings();
  if (key === 'density') resizeSpace();
  if (['topSites','siteCount'].includes(key)) renderShortcuts();
  saveSettings();
});
notes.addEventListener('input', () => { galacticSettings.notes = notes.value; saveSettings(); });
for (const button of panel.querySelectorAll('[data-preset]')) button.addEventListener('click', () => {
  const preset = button.dataset.preset, next = {...structuredClone(defaultSettings), ...personalPart()};
  if (preset === 'minimal') { Object.assign(next.widgets, {heading:false,search:true,shortcuts:true,clock:false,notes:false}); next.density=.5; }
  if (preset === 'productive') { Object.assign(next.widgets, {notes:true,todo:true}); next.speed=.5; next.order=['clock','search','shortcuts','todo','notes','heading']; }
  if (preset === 'space') { Object.assign(next.widgets, {heading:false,search:true,shortcuts:false,clock:true,notes:false}); next.density=1.5; next.size=500; next.opacity=.4; }
  galacticSettings = normalizeSettings(next); refreshPage(); saveSettings();
});
document.querySelector('#reset-settings').addEventListener('click', () => {
  galacticSettings = normalizeSettings({...structuredClone(defaultSettings), ...personalPart()});
  refreshPage(); saveSettings();
});

// Background image: reduced to at most 2560 px and saved as JPEG so it stays well under a megabyte.
const backgroundFile = document.querySelector('#background-file');
async function showBackground(dataUrl) {
  if (backgroundUrl) URL.revokeObjectURL(backgroundUrl);
  backgroundUrl = null;
  if (typeof dataUrl === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(dataUrl)) {
    try { backgroundUrl = URL.createObjectURL(await (await fetch(dataUrl)).blob()); } catch { backgroundUrl = null; }
  }
  document.documentElement.style.setProperty('--bg-image', backgroundUrl ? `url("${backgroundUrl}")` : 'none');
  applySettings();
}
document.querySelector('#choose-background').addEventListener('click', () => backgroundFile.click());
backgroundFile.addEventListener('change', async () => {
  const file = backgroundFile.files[0]; backgroundFile.value = ''; if (!file) return;
  try {
    if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
    if (file.size > 25e6) throw new Error('Choose an image under 25 MB.');
    const bitmap = await createImageBitmap(file), scale = Math.min(1, 2560 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', .86);
    await browser.storage.local.set({[BACKGROUND_KEY]: dataUrl});
    galacticSettings.background = 'custom';
    await showBackground(dataUrl); saveSettings();
  } catch (error) { settingsStatus.textContent = `Image not used: ${error.message}`; }
});
document.querySelector('#remove-background').addEventListener('click', async () => {
  await browser.storage.local.remove(BACKGROUND_KEY).catch(() => {});
  galacticSettings.background = 'nebula';
  await showBackground(null); saveSettings();
});

// Shortcuts: pins can be added here or from the page; hidden sites can be brought back.
function updateShortcuts(change) {
  change(); renderShortcuts(); renderShortcutControls(); saveSettings();
}
function renderShortcutControls() {
  const list = document.querySelector('#pin-list');
  list.replaceChildren(...galacticSettings.pins.map((pin, index) => {
    const row = document.createElement('div'); row.className = 'pin-row';
    const name = document.createElement('span'); name.textContent = pin.title || new URL(pin.url).hostname; name.title = pin.url;
    row.append(name);
    for (const [text, label, delta] of [['↑','Move up',-1],['↓','Move down',1],['✕','Unpin',0]]) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = text;
      button.setAttribute('aria-label', `${label}: ${name.textContent}`);
      button.disabled = delta !== 0 && (index + delta < 0 || index + delta >= galacticSettings.pins.length);
      button.addEventListener('click', () => updateShortcuts(() => {
        const [moved] = galacticSettings.pins.splice(index, 1);
        if (delta) galacticSettings.pins.splice(index + delta, 0, moved);
      }));
      row.append(button);
    }
    return row;
  }));
  const restore = document.querySelector('#restore-hidden');
  restore.disabled = !galacticSettings.hidden.length;
  restore.textContent = galacticSettings.hidden.length ? `Show ${galacticSettings.hidden.length} hidden site${galacticSettings.hidden.length === 1 ? '' : 's'} again` : 'No hidden sites';
  document.querySelector('#pin-form button').disabled = galacticSettings.pins.length >= 16;
}
document.querySelector('#pin-form').addEventListener('submit', event => {
  event.preventDefault();
  const title = document.querySelector('#pin-title'), address = document.querySelector('#pin-url'), url = cleanUrl(address.value);
  if (!url) { settingsStatus.textContent = 'Enter a web address such as example.com.'; address.focus(); return; }
  if (galacticSettings.pins.some(pin => pin.url === url)) { settingsStatus.textContent = 'That site is already pinned.'; return; }
  updateShortcuts(() => { galacticSettings.pins.push({title:title.value.trim().slice(0,60), url}); galacticSettings.hidden = galacticSettings.hidden.filter(item => item !== url); });
  title.value = ''; address.value = ''; title.focus();
});
document.querySelector('#restore-hidden').addEventListener('click', () => updateShortcuts(() => { galacticSettings.hidden = []; }));

// Saved setups hold the look and layout; notes, to-dos, shortcuts and the name are left alone.
function setupPart(settings) {
  const part = structuredClone(settings);
  for (const key of [...personalKeys, 'writer']) delete part[key];
  return part;
}
function saveSetups() {
  browser.storage.local.set({[SETUPS_KEY]: savedSetups}).catch(() => { settingsStatus.textContent = 'Setups could not be saved.'; });
}
function cleanSetups(raw) {
  return Array.isArray(raw) ? raw.flatMap(setup => typeof setup?.name === 'string' && setup.name.trim() && setup.settings && typeof setup.settings === 'object'
    ? [{name:setup.name.trim().slice(0,40), settings:setupPart(normalizeSettings(setup.settings))}] : []).slice(0,12) : [];
}
function renderSetups() {
  const list = document.querySelector('#setup-list');
  list.replaceChildren(...savedSetups.map((setup, index) => {
    const row = document.createElement('div'); row.className = 'pin-row';
    const name = document.createElement('span'); name.textContent = setup.name;
    const load = document.createElement('button'); load.type = 'button'; load.textContent = 'Use';
    load.setAttribute('aria-label', `Use setup ${setup.name}`);
    load.addEventListener('click', () => {
      galacticSettings = normalizeSettings({...setup.settings, ...personalPart()}); refreshPage(); saveSettings();
      settingsStatus.textContent = `Switched to “${setup.name}”.`;
    });
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '✕';
    remove.setAttribute('aria-label', `Delete setup ${setup.name}`);
    remove.addEventListener('click', () => { savedSetups.splice(index, 1); renderSetups(); saveSetups(); });
    row.append(name, load, remove);
    return row;
  }));
  document.querySelector('#setup-empty').hidden = savedSetups.length > 0;
}
document.querySelector('#setup-form').addEventListener('submit', event => {
  event.preventDefault();
  const input = document.querySelector('#setup-name'), name = input.value.trim().slice(0,40);
  if (!name) return;
  const existing = savedSetups.findIndex(setup => setup.name.toLowerCase() === name.toLowerCase());
  if (existing < 0 && savedSetups.length >= 12) { settingsStatus.textContent = 'You can keep up to 12 setups. Delete one first.'; return; }
  const setup = {name, settings:setupPart(galacticSettings)};
  if (existing >= 0) savedSetups[existing] = setup; else savedSetups.push(setup);
  renderSetups(); saveSetups(); input.value = '';
  settingsStatus.textContent = existing >= 0 ? `Updated “${name}”.` : `Saved “${name}”.`;
});

document.querySelector('#export-settings').addEventListener('click', async () => {
  const background = (await browser.storage.local.get(BACKGROUND_KEY).catch(() => ({})))[BACKGROUND_KEY] || null;
  const url = URL.createObjectURL(new Blob([JSON.stringify({format:'galactic-tab',version:2,settings:galacticSettings,setups:savedSetups,background},null,2)],{type:'application/json'}));
  const a = document.createElement('a'); a.href=url; a.download='galactic-tab-settings.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
});
const fileInput = document.querySelector('#import-file');
document.querySelector('#import-settings').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change',async () => {
  const file=fileInput.files[0]; if (!file) return;
  try {
    if (file.size > 12e6) throw new Error('File is too large.');
    const data=JSON.parse(await file.text());
    if (data.format !== 'galactic-tab' || ![1,2].includes(data.version) || !data.settings || typeof data.settings !== 'object' || Array.isArray(data.settings)) throw new Error('Choose a Galactic Tab backup file.');
    galacticSettings=normalizeSettings(data.settings);
    if (Array.isArray(data.setups)) { savedSetups = cleanSetups(data.setups); renderSetups(); saveSetups(); }
    if (typeof data.background === 'string' && data.background.length < 10e6 && /^data:image\/(jpeg|png|webp);base64,/.test(data.background)) {
      await browser.storage.local.set({[BACKGROUND_KEY]: data.background}); await showBackground(data.background);
    }
    refreshPage(); saveSettings();
  } catch (error) { settingsStatus.textContent=`Import failed: ${error.message}`; }
  fileInput.value='';
});
browser.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes[BACKGROUND_KEY]) showBackground(changes[BACKGROUND_KEY].newValue);
  if (changes[SETUPS_KEY]) { savedSetups = cleanSetups(changes[SETUPS_KEY].newValue); renderSetups(); }
  const change = changes[SETTINGS_KEY];
  if (!change || change.newValue?.writer === settingsWriter) return;
  galacticSettings = normalizeSettings(change.newValue); refreshPage();
});
settingsLoaded.then(async () => {
  const stored = await browser.storage.local.get([BACKGROUND_KEY, SETUPS_KEY]).catch(() => ({}));
  savedSetups = cleanSetups(stored[SETUPS_KEY]); renderSetups();
  if (stored[BACKGROUND_KEY]) await showBackground(stored[BACKGROUND_KEY]);
  lastPushed = syncedText(galacticSettings);
  refreshPage(); fillEngines(); showSyncStatus(); setInterval(updateClock,1000);
  document.documentElement.classList.remove('loading');
});
