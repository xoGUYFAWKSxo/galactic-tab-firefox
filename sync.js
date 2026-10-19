// Sync stores two items so each stays under storage.sync's 8 KB per-item limit:
// the look and layout, and the pinned and hidden shortcuts. Notes and to-dos never leave this computer.
const syncToggle = document.querySelector('#sync-enabled');
const syncStatus = document.querySelector('#sync-status');
const syncChoice = document.querySelector('#sync-choice');
let syncTimer = null, lastPushed = '', pendingRemote = null;
function syncedParts(settings) {
  const look = {...settings};
  for (const key of [...localOnlyKeys, 'pins', 'hidden', 'writer']) delete look[key];
  return {look, sites:{pins:settings.pins, hidden:settings.hidden}};
}
const syncedText = settings => JSON.stringify(syncedParts(settings));
function saveDevice() {
  return browser.storage.local.set({[DEVICE_KEY]: deviceSettings}).catch(() => {});
}
function showSyncStatus() {
  syncToggle.checked = deviceSettings.sync;
  syncStatus.textContent = deviceSettings.sync
    ? `On. ${deviceSettings.syncedAt ? `Last synced ${new Date(deviceSettings.syncedAt).toLocaleString([], {dateStyle:'medium', timeStyle:'short'})}. ` : ''}Notes, to-dos and your background image stay on this computer.`
    : 'Off. Turn on to share your look, widgets and shortcuts with every Firefox signed in to your account.';
}
function queueSync() {
  if (!deviceSettings.sync) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(pushSync, 1500);
}
async function pushSync(force = false) {
  const text = syncedText(galacticSettings);
  if (!force && text === lastPushed) return;
  const {look, sites} = syncedParts(galacticSettings), updated = Date.now();
  try {
    await browser.storage.sync.set({[SYNC_KEY]:{settings:look, updated, writer:settingsWriter}, [SYNC_SITES_KEY]:{settings:sites, updated, writer:settingsWriter}});
    lastPushed = text; deviceSettings.syncedAt = updated; await saveDevice(); showSyncStatus();
  } catch (error) {
    syncStatus.textContent = `Sync failed: ${error.message}. Your settings are still saved on this computer.`;
  }
}
function useRemote(look, sites) {
  adoptSynced(look, sites);
  lastPushed = syncedText(galacticSettings);
  refreshPage(); showSyncStatus();
}
syncToggle.addEventListener('change', async () => {
  syncChoice.hidden = true; pendingRemote = null;
  if (!syncToggle.checked) {
    clearTimeout(syncTimer); deviceSettings.sync = false; await saveDevice(); showSyncStatus();
    return;
  }
  try {
    const remote = await browser.storage.sync.get([SYNC_KEY, SYNC_SITES_KEY]);
    const look = remote[SYNC_KEY], sites = remote[SYNC_SITES_KEY];
    deviceSettings.sync = true;
    if (look && syncedText(normalizeSettings({...look.settings, ...sites?.settings})) !== syncedText(galacticSettings)) {
      // Another computer got there first; let the person choose which copy wins.
      deviceSettings.sync = false; pendingRemote = {look, sites};
      syncChoice.hidden = false;
      syncStatus.textContent = 'Your Firefox account already has Galactic Tab settings from another computer. Which should every computer use?';
      return;
    }
    await saveDevice(); await pushSync(true);
  } catch (error) {
    deviceSettings.sync = false; syncToggle.checked = false;
    syncStatus.textContent = `Sync is not available: ${error.message}`;
  }
});
document.querySelector('#sync-use-remote').addEventListener('click', () => {
  if (!pendingRemote) return;
  deviceSettings.sync = true; syncChoice.hidden = true;
  useRemote(pendingRemote.look, pendingRemote.sites); pendingRemote = null;
});
document.querySelector('#sync-use-local').addEventListener('click', async () => {
  deviceSettings.sync = true; syncChoice.hidden = true; pendingRemote = null;
  await saveDevice(); await pushSync(true);
});
browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[DEVICE_KEY]?.newValue) {
    deviceSettings = {sync:changes[DEVICE_KEY].newValue.sync === true, syncedAt:Number(changes[DEVICE_KEY].newValue.syncedAt) || 0};
    showSyncStatus();
  }
  if (area !== 'sync' || !deviceSettings.sync) return;
  const look = changes[SYNC_KEY]?.newValue;
  if (!look || look.writer === settingsWriter || !(look.updated > deviceSettings.syncedAt)) return;
  browser.storage.sync.get(SYNC_SITES_KEY).then(remote => useRemote(look, remote[SYNC_SITES_KEY]), () => {});
});
