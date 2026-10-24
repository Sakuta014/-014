const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>`¥${(n/100).toFixed(2)}`;
const statusNames={'1':'待支付','2':'已支付 · 配餐中','4':'配送中','6':'已完成','7':'已取消','8':'已完成','10':'餐厅配餐中'};
export function mountCheckout(getSelection){
 const dialog=document.getElementById('order-dialog'),body=document.getElementById('order-content'),close=document.getElementById('order-close'),view=document.getElementById('view-order');
 let busy=false,last=null,lastId='';try{lastId=sessionStorage.getItem('meal-order-id')||'';}catch{}
 view.hidden=!lastId;
 function remember(id){lastId=id;view.hidden=false;try{sessionStorage.setItem('meal-order-id',id);}catch{}}
 function setBusy(value){busy=value;close.disabled=value;}
 close.onclick=()=>{if(!busy)dialog.close();};dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
 async function api(action,input){const response=await fetch('/api/order/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),credentials:'omit',redirect:'error'});const data=await response.json();if(!response.ok)throw Error(data.error||'订单处理暂不可用');return data;}
 function show(){if(!dialog.open)dialog.showModal();}
 function error(message){body.innerHTML=`<span class="eyebrow">CHECK AGAIN</span><h2>还没确认好</h2><p class="order-message" role="alert">${escape(message)}</p><button class="primary" id="prepare-again">重新核价</button>`;document.getElementById('prepare-again').onclick=open;}
 function renderDraft(d){
  last=d;body.innerHTML=`<span class="eyebrow">ONE LAST CHECK</span><h2>确认一下，再下单</h2><div class="order-store"><strong>${escape(d.store.storeName)}</strong><span>${escape(d.store.address)}</span></div><div class="order-meal"><h3>${escape(d.meal.name)}</h3><ul>${d.meal.items.map(i=>`<li>${escape(i.replaceAll('【可特调】',''))}</li>`).join('')}</ul></div><fieldset class="takeway-field"><legend>怎么取餐？</legend>${d.takeWays.map(w=>`<label class="takeway-option"><input name="takeway" type="radio" value="${escape(w.code)}"><span><strong>${escape(w.title)}</strong>${w.subtitle?`<small>${escape(w.subtitle)}</small>`:''}</span><i aria-hidden="true">✓</i></label>`).join('')}</fieldset><div class="order-total"><span>应付金额</span><strong>${money(d.price)}</strong></div><p class="order-note">采用套餐默认配置。确认后会创建真实订单，支付需要你自行完成。</p><p id="order-error" role="alert" class="order-message" hidden></p><button id="confirm-order" class="primary order-confirm" disabled>确认下单 · ${money(d.price)}</button>`;
  const button=document.getElementById('confirm-order');body.querySelectorAll('[name=takeway]').forEach(input=>input.onchange=()=>button.disabled=false);
  button.onclick=async()=>{
   const choice=body.querySelector('[name=takeway]:checked');if(busy||!choice)return;
   setBusy(true);button.disabled=true;button.textContent='正在创建订单…';remember(d.id);
   try{const result=await api('submit',{id:d.id,confirmed:true,price:d.price,takeWayCode:choice.value});renderOrder(result);}
   catch(e){
    // A lost response is not evidence of failure. Recover the same intent; never resubmit automatically.
    try{const recovered=await api('status',{id:d.id});if(recovered.state==='prepared'||recovered.state==='expired'){error(e.message);}else renderOrder(recovered);}
    catch{body.innerHTML='<h2>提交结果暂未确认</h2><p class="order-message">请在麦当劳 App 查看订单，先不要重复下单。</p><button id="recover-order">查看订单状态</button>';document.getElementById('recover-order').onclick=refresh;}
   }finally{setBusy(false);}
  };
 }
 function renderOrder(d){
  last=d;remember(d.id);if(d.state==='expired'){error('报价已过期，请重新核价确认');return;}if(d.state==='prepared'){renderDraft(d);return;}
  const uncertain=d.state==='unknown'||d.state==='submitting'||d.state==='checking',paid=['2','4','6','8','10','已支付','已完成','配餐中','配送中'].includes(d.status),cancelled=['7','已取消'].includes(d.status);
  body.innerHTML=`<span class="eyebrow">YOUR ORDER</span><h2>${uncertain?'正在核实订单结果':cancelled?'订单已取消':paid?'订单进度':'订单已创建'}</h2><div class="order-store"><strong>${escape(d.store?.storeName)}</strong><span>${escape(d.store?.address)}</span></div><h3>${escape(d.meal?.name)}</h3>${d.orderId?`<p class="order-number">订单号 <strong>${escape(d.orderId)}</strong></p>`:''}<div class="order-total"><span>${escape(statusNames[d.status]||d.status||'请核实支付状态')}</span><strong>${money(d.price)}</strong></div>${d.pickupCode?`<p class="pickup-code">取餐码 <strong>${escape(d.pickupCode)}</strong></p>`:''}<p class="order-note">${uncertain?'提交结果暂未确认，请先在麦当劳 App 查看订单，勿重复下单。':paid?'支付状态已从官方订单查询。请按餐厅提示取餐。':cancelled?'本订单已取消。':'打开官方付款页面或麦当劳 App 自行支付，完成后回来查询状态。'}</p>${d.payUrl&&!paid&&!cancelled&&!uncertain?`<a class="primary order-pay" href="${escape(d.payUrl)}" target="_blank" rel="noopener noreferrer">打开官方付款页面 ↗</a>`:''}${d.orderId||['submitting','checking'].includes(d.state)?'<button id="refresh-order" class="order-refresh">查看订单状态</button>':''}<p id="status-error" role="alert" class="order-message" hidden></p>`;
  const refreshButton=document.getElementById('refresh-order');if(refreshButton)refreshButton.onclick=refresh;
 }
 async function refresh(){if(busy||!lastId)return;setBusy(true);const button=document.getElementById('refresh-order')||document.getElementById('recover-order');if(button){button.disabled=true;button.textContent='查询中…';}try{renderOrder(await api('status',{id:lastId}));}catch(e){const alert=document.getElementById('status-error');if(alert){alert.hidden=false;alert.textContent=e.message;}}finally{setBusy(false);if(button){button.disabled=false;button.textContent='查看订单状态';}}}
 async function open(){if(busy)return;const selected=getSelection();if(!selected?.meal||!selected.store)return;show();setBusy(true);body.innerHTML='<span class="eyebrow">ONE LAST CHECK</span><h2>正在核实这份套餐…</h2><p>确认餐厅、价格和取餐方式，请稍候。</p>';
  try{const d=await api('prepare',{storeCode:String(selected.store.storeCode),productCode:selected.meal.code,signature:selected.meal.signature,city:selected.city,keyword:selected.keyword||selected.city,budget:selected.budget});if(d.state==='prepared')renderDraft(d);else renderOrder(d);}catch(e){error(e.message);}finally{setBusy(false);}
 }
 view.onclick=async()=>{if(busy||!lastId)return;show();setBusy(true);body.innerHTML='<h2>正在查询订单…</h2>';try{renderOrder(await api('status',{id:lastId}));}catch(e){body.innerHTML=`<h2>暂时查不到订单</h2><p class="order-message">${escape(e.message)}，请在麦当劳 App 核实，勿重复下单。</p>`;}finally{setBusy(false);}};
 return {open};
}
