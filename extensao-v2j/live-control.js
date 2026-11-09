// Atua exclusivamente no botão visível de início, sem tentar confirmar diálogos.
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
 if(message?.type!=='V2J_CLICK_START_LIVE')return;
 const buttons=[...document.querySelectorAll('button')];
 const button=buttons.find(el=>el.getAttribute('data-tid')==='m4b_button' && /^Iniciar LIVE$/i.test((el.innerText||'').trim())) ||
   buttons.find(el=>/^Iniciar LIVE$/i.test((el.innerText||'').trim()));
 if(!button){respond({ok:false,message:'Botão “Iniciar LIVE” não encontrado. Confira se a aba do Gerenciador está aberta.'});return;}
 if(button.disabled || button.getAttribute('aria-disabled')==='true'){
  respond({ok:false,message:'O botão “Iniciar LIVE” está desativado no TikTok.'});return;
 }
 button.click();
 respond({ok:true,message:'Clique enviado ao botão do TikTok. Confira a aba para possíveis confirmações; a LIVE ainda não foi verificada como iniciada.'});
});
