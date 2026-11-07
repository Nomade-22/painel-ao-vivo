const TARGET='https://painel-ao-vivo-jhonatan23.vercel.app/api/retorno?sync=1';
chrome.action.onClicked.addListener(async tab=>{
 if(!tab?.id||!tab.url?.startsWith('https://shop.tiktok.com/streamer/live/'))return;
 chrome.tabs.sendMessage(tab.id,{type:'V2J_TOGGLE'}).catch(()=>{});
});
chrome.runtime.onMessage.addListener((msg,sender,respond)=>{
 if(msg?.type!=='V2J_SYNC'||!sender.tab?.url?.startsWith('https://shop.tiktok.com/streamer/live/'))return;
 fetch(TARGET,{method:'PUT',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:msg.items})})
 .then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.erro||'HTTP '+r.status);respond({ok:true,...data});})
 .catch(e=>respond({ok:false,error:e.message}));
 return true;
});
