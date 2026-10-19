const panel = document.querySelector('#customize-panel');
const settingsStatus = document.querySelector('#settings-status');
const launcher = document.querySelector('#open-customize');
const notes = document.querySelector('#personal-notes');
function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(galacticSettings)); settingsStatus.textContent = 'Saved on this device.'; }
  catch { settingsStatus.textContent = 'Settings could not be saved. Export a backup to keep your changes.'; }
}
function updateClock() {
  const date = new Date();
  document.querySelector('#clock-time').textContent = date.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',hour12:!galacticSettings.clock24});
  document.querySelector('#clock-time').dateTime = date.toISOString();
  document.querySelector('#clock-date').textContent = date.toLocaleDateString([], {weekday:'long',month:'long',day:'numeric'});
}
function applySettings() {
  const scene = document.querySelector('.galaxy');
  scene.style.setProperty('--galaxy-size', `min(${galacticSettings.size}px, 24vw, 32vh)`);
  const [vertical,horizontal] = galacticSettings.corner.split('-');
  for (const edge of ['top','bottom','left','right']) scene.style[edge] = edge === vertical || edge === horizontal ? 'var(--galaxy-inset)' : 'auto';
  scene.hidden = !galacticSettings.galaxy;
  scene.style.animationDuration = `${45 / (galacticSettings.spin || 1)}s`;
  scene.style.animationPlayState = galacticSettings.spin === 0 ? 'paused' : 'running';
  document.documentElement.style.setProperty('--card-opacity',galacticSettings.opacity);
  for (const [index,key] of galacticSettings.order.entries()) {
    const element = document.querySelector(`[data-widget="${key}"]`);
    element.hidden = !galacticSettings.widgets[key]; element.style.order = index;
  }
  for (const control of panel.querySelectorAll('[data-setting]')) {
    const value = galacticSettings[control.dataset.setting];
    if (control.type === 'checkbox') control.checked = value; else control.value = value;
  }
  for (const output of panel.querySelectorAll('[data-value]')) {
    const key = output.dataset.value, value = galacticSettings[key];
    output.textContent = key === 'size' ? `${value}px` : key === 'opacity' ? `${Math.round(value*100)}%` : `${Number(value.toFixed(2))}×`;
  }
  if (document.activeElement !== notes) notes.value = galacticSettings.notes;
  updateClock();
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
launcher.addEventListener('click', () => panel.showModal());
document.querySelector('#close-customize').addEventListener('click', () => panel.close());
panel.addEventListener('close', () => launcher.focus());
panel.addEventListener('input', event => {
  const control = event.target, key = control.dataset.setting; if (!key) return;
  galacticSettings[key] = control.type === 'checkbox' ? control.checked : control.type === 'range' ? Number(control.value) : control.value;
  applySettings(); if (key === 'density') resizeSpace(); saveSettings();
});
notes.addEventListener('input', () => { galacticSettings.notes = notes.value; saveSettings(); });
for (const button of panel.querySelectorAll('[data-preset]')) button.addEventListener('click', () => {
  const preset = button.dataset.preset;
  galacticSettings = {...structuredClone(defaultSettings), notes:galacticSettings.notes};
  if (preset === 'minimal') { galacticSettings.widgets = {heading:false,search:true,shortcuts:true,clock:false,notes:false}; galacticSettings.density=.5; }
  if (preset === 'productive') { galacticSettings.widgets.notes=true; galacticSettings.speed=.5; galacticSettings.order=['clock','search','shortcuts','notes','heading']; }
  if (preset === 'space') { galacticSettings.widgets={heading:false,search:true,shortcuts:false,clock:true,notes:false}; galacticSettings.density=1.5; galacticSettings.size=500; galacticSettings.opacity=.4; }
  applySettings(); renderWidgetControls(); resizeSpace(); saveSettings();
});
document.querySelector('#reset-settings').addEventListener('click', () => {
  galacticSettings = {...structuredClone(defaultSettings),notes:galacticSettings.notes};
  applySettings(); renderWidgetControls(); resizeSpace(); saveSettings();
});
document.querySelector('#export-settings').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify({format:'galactic-tab',version:1,settings:galacticSettings},null,2)],{type:'application/json'}));
  const a = document.createElement('a'); a.href=url; a.download='galactic-tab-settings.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
});
const fileInput = document.querySelector('#import-file');
document.querySelector('#import-settings').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change',async () => {
  const file=fileInput.files[0]; if (!file) return;
  try {
    if (file.size > 200000) throw new Error('File is too large.');
    const data=JSON.parse(await file.text());
    if (data.format !== 'galactic-tab' || data.version !== 1 || !data.settings || typeof data.settings !== 'object' || Array.isArray(data.settings)) throw new Error('Choose a Galactic Tab backup file.');
    galacticSettings=normalizeSettings(data.settings); applySettings(); renderWidgetControls(); resizeSpace(); saveSettings();
  } catch (error) { settingsStatus.textContent=`Import failed: ${error.message}`; }
  fileInput.value='';
});
addEventListener('storage', event => {
  if (event.key !== SETTINGS_KEY) return;
  try { galacticSettings=normalizeSettings(JSON.parse(event.newValue)); applySettings(); renderWidgetControls(); resizeSpace(); }
  catch { settingsStatus.textContent='Could not read changes from another tab.'; }
});
applySettings(); renderWidgetControls(); setInterval(updateClock,1000);
