let stripQueue=Promise.resolve();
function queueStrip(job){const result=stripQueue.then(job);stripQueue=result.catch(()=>{});return result;}
async function applyStrip(settings){
 if(!settings.enabled){await browser.theme.reset();return;}
 const suffix=value=>value==='still'?'-still':value==='slow'?'-slow':'';
 const images={theme_frame:`assets/strip/stars-${settings.preset}${suffix(settings.speed)}.png`};
 const properties={color_scheme:'dark',content_color_scheme:'dark'};
 if(settings.galaxy){images.additional_backgrounds=[`assets/strip/galaxy-${settings.size}${suffix(settings.spin)}.png`];properties.additional_backgrounds_alignment=[settings.position];properties.additional_backgrounds_tiling=['no-repeat'];}
 await browser.theme.update({images,properties,colors:{frame:settings.frame,toolbar:settings.toolbar,toolbar_text:settings.text,tab_background_text:settings.text,tab_text:settings.text,tab_selected:settings.toolbar,tab_line:settings.accent,toolbar_field:settings.toolbar,toolbar_field_text:settings.text}});
}
browser.runtime.onMessage.addListener(message=>{
 if(message?.type==='strip-get')return queueStrip(async()=>cleanStrip((await browser.storage.local.get('browserStrip')).browserStrip));
 if(message?.type==='strip-apply')return queueStrip(async()=>{
  const current=cleanStrip((await browser.storage.local.get('browserStrip')).browserStrip);
  const next=cleanStrip(message.settings);
  try{await applyStrip(next);await browser.storage.local.set({browserStrip:next});return {ok:true,settings:next};}
  catch(error){try{await applyStrip(current);}catch{} return {ok:false,error:error.message};}
 });
});
async function restoreStrip(){const data=await browser.storage.local.get('browserStrip');if(data.browserStrip?.enabled)await applyStrip(cleanStrip(data.browserStrip));}
browser.runtime.onStartup.addListener(()=>queueStrip(restoreStrip));
browser.runtime.onInstalled.addListener(()=>queueStrip(restoreStrip));
