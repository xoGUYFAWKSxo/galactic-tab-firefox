const stripDefaults={enabled:false,preset:'gentle',speed:'slow',size:'72',spin:'normal',position:'right top',galaxy:true,frame:'#06091b',toolbar:'#0a0e24',text:'#e8edff',accent:'#8289e8'};
function cleanStrip(raw={}) {
 const result={...stripDefaults};
 for(const [key,values] of Object.entries({preset:['gentle','rich','steady'],speed:['slow','normal','still'],size:['48','72','96'],spin:['normal','slow','still'],position:['right top','center top','left top']})) if(values.includes(raw[key]))result[key]=raw[key];
 for(const key of ['enabled','galaxy'])if(typeof raw[key]==='boolean')result[key]=raw[key];
 for(const key of ['frame','toolbar','text','accent'])if(/^#[0-9a-f]{6}$/i.test(raw[key]))result[key]=raw[key];
 return result;
}
