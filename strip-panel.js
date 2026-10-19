const stripStatus=document.querySelector('#strip-status');
const stripSection=document.querySelector('#strip-controls');
let appliedStrip={...stripDefaults},stripReady=false,stripColorTimer;
function readStrip(){const result={};for(const key of Object.keys(stripDefaults)){const el=document.querySelector(`#strip-${key}`);result[key]=el.type==='checkbox'?el.checked:el.value;}return cleanStrip(result);}
function showStrip(settings){for(const key of Object.keys(stripDefaults)){const el=document.querySelector(`#strip-${key}`);if(el.type==='checkbox')el.checked=settings[key];else el.value=settings[key];}}
async function commitStrip(settings){
 try{
  const response=await browser.runtime.sendMessage({type:'strip-apply',settings});
  if(!response?.ok)throw new Error(response?.error||'Firefox could not apply the theme.');
  appliedStrip=response.settings;stripStatus.textContent=settings.enabled?'Browser visuals applied and saved.':'Browser customization is off. Your installed theme is restored.';
 }catch(error){stripStatus.textContent=`Could not apply: ${error.message}. Try reloading Galactic Tab, then Apply visuals again.`;}
}
async function initializeStrip(){
 stripSection.querySelectorAll('input,select,button').forEach(el=>el.disabled=true);
 try{appliedStrip=cleanStrip(await browser.runtime.sendMessage({type:'strip-get'}));showStrip(appliedStrip);stripReady=true;stripStatus.textContent=appliedStrip.enabled?'Your saved browser visuals are ready.':'Enable to customize your browser strip.';stripSection.querySelectorAll('input,select,button').forEach(el=>el.disabled=false);}
 catch{stripStatus.textContent='Reload Galactic Tab to activate its new browser-theme permissions.';}
}
stripSection.addEventListener('input',event=>{
 if(!stripReady)return;
 if(event.target.type==='color'){
  clearTimeout(stripColorTimer);
  stripColorTimer=setTimeout(()=>{
   if(!appliedStrip.enabled){stripStatus.textContent='Colors selected. Enable and Apply to use them.';return;}
   const draft=readStrip();commitStrip({...appliedStrip,frame:draft.frame,toolbar:draft.toolbar,text:draft.text,accent:draft.accent});
  },180);
 }else if(event.target.id!=='strip-enabled')stripStatus.textContent='Visual changes are ready. Click Apply visuals.';
});
document.querySelector('#strip-enabled').addEventListener('change',()=>{clearTimeout(stripColorTimer);commitStrip(readStrip());});
document.querySelector('#strip-apply').addEventListener('click',()=>{clearTimeout(stripColorTimer);const settings=readStrip();settings.enabled=true;showStrip(settings);commitStrip(settings);});
document.querySelector('#strip-match').addEventListener('click',()=>{
 const draft=readStrip();draft.galaxy=galacticSettings.galaxy;draft.position=galacticSettings.corner.endsWith('left')?'left top':'right top';
 draft.size=galacticSettings.size<220?'48':galacticSettings.size>380?'96':'72';draft.spin=galacticSettings.spin===0?'still':galacticSettings.spin<.75?'slow':'normal';
 draft.speed=galacticSettings.speed===0?'still':galacticSettings.speed<.75?'slow':'normal';draft.preset=!galacticSettings.twinkle?'steady':galacticSettings.density>1?'rich':'gentle';showStrip(draft);
 stripStatus.textContent='Closest new-tab presets selected. Click Apply visuals. Colors stay as selected.';
});
document.querySelector('#strip-export').addEventListener('click',()=>{
 const url=URL.createObjectURL(new Blob([JSON.stringify({format:'galactic-strip',version:1,settings:readStrip()},null,2)],{type:'application/json'}));
 const link=document.createElement('a');link.href=url;link.download='galactic-strip-settings.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
const stripFile=document.querySelector('#strip-file');
document.querySelector('#strip-import').addEventListener('click',()=>stripFile.click());
stripFile.addEventListener('change',async()=>{
 const file=stripFile.files[0];if(!file)return;
 try{if(file.size>20000)throw new Error('File is too large.');const data=JSON.parse(await file.text());if(data.format!=='galactic-strip'||data.version!==1||!data.settings||typeof data.settings!=='object')throw new Error('Choose a Galactic Strip backup.');showStrip(cleanStrip(data.settings));stripStatus.textContent='Backup loaded. Click Apply visuals.';}
 catch(error){stripStatus.textContent=`Import failed: ${error.message}`;}
 stripFile.value='';
});
initializeStrip();
