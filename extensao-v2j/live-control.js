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

chrome.runtime.onMessage.addListener((message,sender,respond)=>{
 if(message?.type!=='V2J_REFIX_PRODUCT')return;
 const numero=Number(message.numero);
 if(!Number.isInteger(numero)||numero<1||numero>200){respond({ok:false,message:'Número inválido.'});return;}
 const leaves=[...document.querySelectorAll('span,div,button')].filter(el=>el.children.length===0&&el.textContent.trim()===String(numero));
 const possible=[];
 for(const leaf of leaves){
  let card=leaf.parentElement;
  for(let depth=0;depth<8&&card;depth++,card=card.parentElement){
   if((card.innerText||'').length>900)break;
   const target=[...card.querySelectorAll('button')].find(b=>/^(fixar|pin|refixar)$/i.test((b.innerText||b.getAttribute('aria-label')||'').trim()));
   if(target&&card.querySelector('img')){possible.push(target);break;}
  }
 }
 const buttons=[...new Set(possible)];
 if(buttons.length!==1){respond({ok:false,message:'Não encontrei um botão de fixação exclusivo do item #'+numero+'. Confira a lista aberta no TikTok.'});return;}
 const button=buttons[0];
 if(button.disabled){respond({ok:false,message:'A opção de fixar está indisponível para o item #'+numero+'.'});return;}
 button.click();
 respond({ok:true,message:'Clique em “Fixar” enviado para o item #'+numero+'. Confirme o resultado no TikTok.'});
});
