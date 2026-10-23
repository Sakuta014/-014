import {visibleMeals,nextSpinPool,undoRemoval,quoteValid,quoteResponseMatches,selectIndex,landingRotation} from './core.mjs';
import {demoMeals} from './demo.mjs';
import {McpClient,probeConnection} from './mcp.mjs';
import {MealService} from './adapter.mjs';
import {chooseBoard,boardMeals,restoreBoardItem} from './board.mjs';
const $=id=>document.getElementById(id),money=c=>`¥${(c/100).toFixed(2)}`;
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let saved={};try{saved=JSON.parse(localStorage.getItem('meal-wheel-prefs')||'{}')}catch{}
let prefs={budget:3500,nonSpicy:false,noBeef:false,...saved},ttl=Number(saved.ttl)||5;
let excluded=new Set(),undo=[],current=null,previous=null,reroll=false,rotation=0,locked=false,visible=[],client=null,tools=[],generation=0,toastTimer;
let meals=demoMeals,service=null,mode='demo',store=null,foundStores=[];
let boardIds=[];
const storeKey=()=>mode==='real'?store?.storeCode:'demo';
const priceLabel=()=>mode==='real'?'官方核价':'演示参考价';
function mealImage(m){return m.image?`<img class="food-image" src="${escape(m.image)}" alt="${escape(m.name)}" referrerpolicy="no-referrer">`:'<span class="food-placeholder">套餐图片暂缺</span>';}
const colors=['#f7d47c','#fff0cf','#eac69e','#fce4a5','#f5d9c1','#fff2d9','#e8d7ab','#ffdca3'];
const save=()=>{try{localStorage.setItem('meal-wheel-prefs',JSON.stringify({budget:prefs.budget,nonSpicy:prefs.nonSpicy,noBeef:prefs.noBeef,ttl,city:$('store-city').value.trim(),keyword:$('store-keyword').value.trim(),lastStore:store?{storeName:store.storeName,storeCode:store.storeCode}:null}))}catch{toast('浏览器未允许保存偏好')}};
function toast(message,canUndo=false){clearTimeout(toastTimer);$('toast').querySelector('span').textContent=message;$('undo').hidden=!canUndo;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,5000)}
function syncBudget(){let value=prefs.budget==null?'':String(prefs.budget);if(![...$('budget').options].some(o=>o.value===value)){const option=new Option(`${prefs.budget/100} 元以内`,value);$('budget').add(option)}$('budget').value=value}
function rebuildBoard(){const eligible=visibleMeals(meals,prefs,excluded);boardIds=chooseBoard(reroll?nextSpinPool(eligible,current):eligible,boardIds);}
function pool(){return boardMeals(meals,boardIds,prefs,excluded);}
function polar(radius,angle){const r=angle*Math.PI/180;return [250+radius*Math.sin(r),250-radius*Math.cos(r)]}
function render(){
 // 盘面重排时回到正向，避免上次转动角度让新标签侧倒。
 rotation=0;$('wheel').style.transition='none';$('wheel').style.transform='rotate(0deg)';$('wheel').getBoundingClientRect();$('wheel').style.transition='';
 visible=pool();const n=visible.length;
 $('wheel').innerHTML=visible.map((m,i)=>{const start=i*360/n,end=(i+1)*360/n,a=polar(246,start),b=polar(246,end),mid=(i+.5)*360/n,pos=polar(160,mid);const d=n===1?'M250 4 A246 246 0 1 1 249.99 4 Z':`M250 250 L${a} A246 246 0 ${end-start>180?1:0} 1 ${b} Z`;const label=m.name.replace(/中套餐|三件套|套餐/g,'').replace(/【.*?】/g,'');const image=m.image?`<image href="${escape(m.image)}" x="${pos[0]-48}" y="${pos[1]-60}" width="96" height="70" preserveAspectRatio="xMidYMid meet"/>`:`<text x="${pos[0]}" y="${pos[1]-22}" text-anchor="middle" font-size="12">套餐图片暂缺</text>`;return `<g tabindex="0" role="button" data-id="${m.id}" aria-label="${escape(m.name)}，${priceLabel()}${m.price/100}元，查看或移除"><path d="${d}" fill="${colors[i]}" stroke="#fff9ed" stroke-width="3"/>${image}<text x="${pos[0]}" y="${pos[1]+26}" text-anchor="middle" font-size="${label.length>10?10:12}" font-weight="700" fill="#493827">${escape(label)}</text><text x="${pos[0]}" y="${pos[1]+43}" text-anchor="middle" font-size="10" fill="#8b7256">套餐 · ${money(m.price)}</text></g>`}).join('');
 $('spin').disabled=locked||n===0;$('spin-center').disabled=locked||n===0;$('spin').innerHTML=n===1?'查看这一份 <span>↗</span>':'一键随机 <span>↗</span>';
 $('refresh-board').disabled=locked||meals.length===0;
 $('budget').disabled=locked;$('preferences-open').disabled=locked;$('reset').disabled=locked;$('restore').disabled=locked;$('clear').disabled=locked;
 $('count').textContent=n===1?'只剩这一份啦':`${n} 份餐盘 · 每格等概率`;
 $('empty').hidden=n!==0;$('empty').textContent=meals.length&&excluded.size===meals.length?'这轮都不想吃？恢复本轮移除，或新开一轮。':reroll?'暂时没有可重抽的餐盘，试试调整条件或新开一轮。':mode==='real'&&prefs.nonSpicy?'官方数据没有充分的不辣标签，无法确认的组合已排除。可以调整偏好。':'没有符合条件的餐盘，试试调整预算、偏好或重新加载门店。';
 $('store-name').textContent=mode==='real'?(store?.storeName||'请确认真实门店'):'演示餐厅';
 $('mode-banner').textContent=mode==='real'?'真实模式 · 官方套餐图与核价':'演示模式 · 官方套餐图 · 价格为示例';
 $('store-change').disabled=locked;$('settings-open').disabled=locked;
 $('result').querySelectorAll('button').forEach(b=>b.disabled=locked||(b.id==='go-previous'&&!previous));
 $('pref-count').textContent=[prefs.nonSpicy,prefs.noBeef].filter(Boolean).length||'＋';
 $('active-feedback').hidden=!prefs.notFried&&!prefs.meat;
 $('active-feedback').textContent=`本轮偏好：${prefs.notFried?'不吃油炸主餐 ':''}${prefs.meat?{chicken:'想吃鸡肉',beef:'想吃牛肉',fish:'想吃鱼肉'}[prefs.meat]:''} · 新开一轮可清除`;
 $('undo').hidden=undo.length===0;
}
function showMeal(id){if(locked)return;const m=visible.find(m=>m.id===id);if(!m)return;$('meal-detail').innerHTML=`${mealImage(m)}<div class="eyebrow">这一格，是完整的一顿</div><h2>${escape(m.name)}</h2><p>${m.items.map(escape).join(' + ')}</p><p>${priceLabel()} <strong>${money(m.price)}</strong></p>${mode==='real'?'<p class="muted">采用官方默认配置。标注【可特调】的子项可在官方购买时调整，修改后价格可能变化。</p>':''}<button class="primary" id="remove-meal">这顿不想吃 ×</button>`;$('meal-dialog').showModal();$('remove-meal').onclick=()=>{$('meal-dialog').close();remove(id)}}
function remove(id){if(locked||excluded.has(id))return;excluded.add(id);undo.push(id);render();toast('已移除，这轮不会自动补位',true)}
$('undo').onclick=()=>{const id=undo.at(-1);if(!id||locked)return;if(undoRemoval(id,meals,prefs,excluded)){undo.pop();boardIds=restoreBoardItem(boardIds,id);render();toast('已恢复这份餐盘')}else toast('当前条件不允许恢复，调整条件后可继续撤销',true)};
$('wheel').onclick=e=>{if(!dragged){const id=e.target.closest('[data-id]')?.dataset.id;if(id)showMeal(id)}};
$('wheel').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showMeal(e.target.closest('[data-id]')?.dataset.id)}};
async function refreshQuotes(){const version=++generation;locked=true;render();$('count').textContent='更新餐盘报价中…';try{if(mode==='real'){const next=[];for(const m of meals){try{next.push(await service.quote(m,store))}catch{}}if(version!==generation)return false;meals=next;if(!next.length)throw new Error('核价失败，请重新加载门店');}else{for(const m of meals)m.quote={at:Date.now(),store:'demo'};}return true;}catch(e){toast(e.message);return false;}finally{if(version===generation){locked=false;render()}}}
async function spin(){if(locked||!visible.length)return;if(current&&!reroll){reroll=true;rebuildBoard();render();$('result').hidden=true;if(!visible.length){toast('当前没有可重抽的套餐，试试换一批');return;}}if(visible.some(m=>!quoteValid(m.quote,storeKey(),ttl))){toast('报价已过期，先更新餐盘');if(!await refreshQuotes()||!visible.length)return;}
 const snapshot=[...visible];locked=true;render();$('result').hidden=true;
 const index=selectIndex(snapshot.length),chosen=snapshot[index];
 const duration=snapshot.length===1||matchMedia('(prefers-reduced-motion: reduce)').matches?0:3200;
 if(duration){rotation=landingRotation(rotation,index,snapshot.length);$('wheel').style.transform=`rotate(${rotation}deg)`;await new Promise(r=>setTimeout(r,duration));}
 previous=current;current=chosen;reroll=false;locked=false; // 保持抽中时的盘面，下一次重抽再更新候选。
 $('spin').disabled=false;$('spin-center').disabled=false;for(const id of ['budget','preferences-open','reset','restore','clear','settings-open','store-change','refresh-board'])$(id).disabled=false;
 showResult();
}
function showResult(confirmed=false,notice=''){
 if(!current)return;const m=current;const el=$('result');el.hidden=false;
 el.innerHTML=`<div class="eyebrow">${confirmed?'TODAY’S MEAL / 今天就定了':'A LITTLE SURPRISE / 转到了'}</div><div class="result-top"><div><h2>${escape(m.name)}</h2><ul class="meal-items">${m.items.map(item=>`<li>${escape(item.replaceAll('【可特调】',''))}</li>`).join('')}</ul></div>${mealImage(m)}</div><p class="price">${money(m.price)} <small class="muted">${priceLabel()}</small></p><p class="muted">${escape(mode==='real'?store.storeName:'演示餐厅')} · 到店取餐 · ${new Date(m.quote.at).toLocaleTimeString('zh-CN')} 核价<br>${mode==='real'?'默认配置，未主动使用个人优惠券或购买会员卡。':'本页为样例餐单。'}未创建订单，请在官方渠道自行购买。${m.discount?` 已核实优惠 ${money(m.discount)}。`:''}</p>${notice?`<p role="alert" class="price-notice">${escape(notice)}</p>`:''}<div class="result-actions">${confirmed?'<button class="primary" id="copy-meal">复制餐单</button><button id="back-wheel">回到转盘</button>':'<button class="primary" id="accept">'+(notice?'确认新价格':'就吃这个')+'</button><button id="reroll">再转一次 ↻</button><button id="go-previous" '+(!previous?'disabled':'')+'>还是上一份</button>'}</div>${confirmed?'':'<div class="feedback"><button data-feedback="expensive">太贵了</button><button data-feedback="fried">不想吃炸的</button><button data-feedback="meat">想换个肉</button><button data-feedback="portion">分量不合适</button></div><div id="feedback-choices"></div>'}`;
 el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'});
 if(confirmed){$('copy-meal').onclick=async()=>{const text=`${mode==='real'?'【真实核价餐单】':'【演示样例】'}\n${m.name}\n${m.items.join('、')}\n${mode==='real'?store.storeName+'\n'+store.address:'演示餐厅'} · 到店取餐\n参考核价 ${money(m.price)}（${new Date(m.quote.at).toLocaleString('zh-CN')}）\n未创建订单，请在官方渠道自行核实购买。`;try{await navigator.clipboard.writeText(text);toast('餐单已复制')}catch{toast('无法自动复制，请手动选取餐单内容')}};$('back-wheel').onclick=()=>{el.hidden=true;window.scrollTo({top:0,behavior:'smooth'})};return;}
 $('reroll').onclick=spin;
 $('go-previous').onclick=()=>{if(locked||!previous)return;if(excluded.has(previous.id)){toast('上一份已被移除，请先撤销或恢复');return;}if(!visibleMeals([previous],prefs).length){toast('上一份不符合当前条件，请先调整');return;}[current,previous]=[previous,current];showResult();};
 $('accept').onclick=async()=>{
  if(locked)return;if(!visibleMeals([m],prefs,excluded).length){toast('这份已不符合条件，请重新选择');return;}
  const version=++generation;locked=true;render();$('accept').disabled=true;$('accept').textContent='重新核价中…';
  try{const updated=mode==='real'?await service.quote(m,store):{...m,quote:{at:Date.now(),store:'demo'}};
   if(!quoteResponseMatches(version,generation,m.id,current?.id))return;
   const before=m.price;current=updated;meals=meals.map(x=>x.id===updated.id?updated:x);locked=false;render();
   if(prefs.budget!=null&&updated.price>prefs.budget){showResult(false,`最新价格 ${money(updated.price)}，超过预算；请先调整预算或重抽。`);$('accept').disabled=true;return;}
   if(before!==updated.price){showResult(false,`价格由 ${money(before)} 变为 ${money(updated.price)}，请重新确认。`);return;}
   showResult(true);
  }catch(e){if(version!==generation)return;locked=false;render();showResult(false,`重新核价失败：${e.message}。可重试或重新加载门店，当前尚未确定餐单。`);}
 };
 el.querySelectorAll('[data-feedback]').forEach(b=>b.onclick=()=>feedback(b.dataset.feedback));
}
function feedback(kind){if(locked)return;if(kind==='expensive'){$('budget').focus();toast('选择一个更合适的预算');return;}if(kind==='fried'){prefs.notFried=true;reroll=true;rebuildBoard();render();toast('本轮已排除油炸主餐');return;}
 const box=$('feedback-choices');box.className='feedback';box.innerHTML=kind==='meat'?'<button data-meat="chicken">鸡肉</button><button data-meat="beef">牛肉</button><button data-meat="fish">鱼肉</button>':'<p class="muted">当前演示组合还没有可靠份量分级；先用移除和重抽挑选，真实餐品接入后再开放份量调整。</p>';
 box.querySelectorAll('[data-meat]').forEach(b=>b.onclick=()=>{if(b.dataset.meat==='beef'&&prefs.noBeef){toast('与你保存的不吃牛肉偏好冲突，请先修改偏好');return;}prefs.meat=b.dataset.meat;reroll=true;rebuildBoard();render();toast('本轮肉类偏好已更新')});
}
$('spin').onclick=spin;$('spin-center').onclick=spin;
$('refresh-board').onclick=async()=>{
 if(locked)return;const previousBoard=[...boardIds];clearSession();boardIds=previousBoard;
 if(meals.some(m=>!quoteValid(m.quote,storeKey(),ttl))&&!await refreshQuotes())return;
 rebuildBoard();render();const eligible=visibleMeals(meals,prefs).length;
 toast(eligible===0?'没有满足当前预算和忌口的套餐，请调整条件':eligible>6?'已按当前预算和忌口换一批套餐':`符合预算和忌口的共 ${eligible} 份套餐，已重新打乱盘面`);
};
$('budget').onchange=()=>{if($('budget').value==='custom'){const value=prompt('这顿预算最多多少元？',prefs.budget/100||35);if(value===null){syncBudget();return;}const amount=Number(value);if(!Number.isFinite(amount)||amount<=0||amount>10000){toast('请输入 0 到 10000 之间的预算');syncBudget();return;}prefs.budget=Math.round(amount*100);}else prefs.budget=$('budget').value===''?null:Number($('budget').value);syncBudget();save();rebuildBoard();render();$('result').hidden=true};
$('preferences-open').onclick=()=>{$('non-spicy').checked=prefs.nonSpicy;$('no-beef').checked=prefs.noBeef;$('prefs-dialog').showModal()};
$('save-prefs').onclick=()=>{prefs.nonSpicy=$('non-spicy').checked;prefs.noBeef=$('no-beef').checked;save();rebuildBoard();render();$('result').hidden=true;$('prefs-dialog').close()};
$('reset').onclick=()=>{excluded.clear();undo=[];current=null;previous=null;reroll=false;delete prefs.notFried;delete prefs.meat;$('result').hidden=true;rebuildBoard();render();toast('新的一轮，保留预算和明确偏好')};
$('restore').onclick=()=>{excluded.clear();undo=[];rebuildBoard();render();toast('本轮移除已恢复，仍遵守当前条件')};
$('clear').onclick=()=>{try{localStorage.removeItem('meal-wheel-prefs')}catch{}prefs={budget:3500,nonSpicy:false,noBeef:false};ttl=5;syncBudget();rebuildBoard();render();toast('本机偏好已清除')};
$('settings-open').onclick=()=>{$('quote-ttl').value=ttl;$('settings-dialog').showModal()};$('store-change').onclick=()=>{$('settings-dialog').showModal();if(!service)toast('连接 MCP 后即可搜索真实门店')};
$('save-settings').onclick=()=>{const n=Number($('quote-ttl').value);if(!Number.isInteger(n)||n<1||n>60){toast('有效期可设为 1–60 分钟');return;}ttl=n;save();toast('设置已保存')};
$('check-connection').onclick=async()=>{const button=$('check-connection');button.disabled=true;$('probe-status').textContent='正在检查浏览器连接，不使用个人 Token…';try{const result=await probeConnection(fetch, document.getElementById("connection-route").value==='proxy'?'/api/mcp':'https://mcp.mcd.cn');$('probe-status').textContent=result.message;}finally{button.disabled=false;}};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
$('connect').onclick=async()=>{
 let token=$('token').value.trim().replace(/^Bearer\s+/i,'');if(!token){toast('请填写 Token');return;}
 client?.disconnect();service=null;generation++;locked=false;$('search-stores').disabled=false;clearSession();mode='real';meals=[];store=null;render();
 const attempt=new McpClient(token,fetch,$('connection-route').value==='proxy'?'/api/mcp':'https://mcp.mcd.cn');client=attempt;token='';$('token').value='';$('connect').disabled=true;$('store-panel').hidden=true;$('tools-panel').hidden=true;$('connection-status').textContent='连接官方 MCP 并发现工具中…';
 try{
  const discovered=await attempt.connect();if(client!==attempt)return;tools=discovered;service=new MealService(attempt);
  $('connection-status').textContent='已连接官方 MCP。请搜索并确认餐厅，再加载真实餐盘。';$('store-panel').hidden=false;
  $('tools-panel').hidden=false;$('tool-name').replaceChildren(...tools.filter(t=>['now-time-info','query-nearby-stores','query-meals','query-meal-detail','query-store-coupons','calculate-price','list-nutrition-foods'].includes(t.name)).map(t=>new Option(t.name,t.name)));schema();
 }catch(e){if(client===attempt){attempt.disconnect();client=null;service=null;$('connection-status').textContent=e.message;}}
 finally{$('connect').disabled=false;}
};
function clearSession(){excluded.clear();undo=[];current=null;previous=null;reroll=false;boardIds=[];$('result').hidden=true;}
$('search-stores').onclick=async()=>{
 if(!service)return;const city=$('store-city').value.trim(),keyword=$('store-keyword').value.trim()||city;if(!city){toast('请填写城市');return;}
 const version=++generation,active=service;$('search-stores').disabled=true;$('store-status').textContent='搜索餐厅中…';$('store-list').replaceChildren();
 try{const found=await active.stores(city,keyword);if(version!==generation)return;foundStores=found;
  $('store-status').textContent=found.some(s=>s.businessStatus)?'请选择正在营业的餐厅，加载需要几秒。':'这些餐厅当前暂停营业，请换个地标搜索。';
  $('store-list').innerHTML=found.map((s,i)=>`<article class="store-option"><b>${escape(s.storeName)}</b><p>${escape(s.address)}</p><small>${escape(s.businessStartTime||'')}–${escape(s.businessEndTime||'')} · ${s.businessStatus?'营业中':'暂停营业'}</small><button data-store="${i}" ${s.businessStatus?'':'disabled'}>${s.businessStatus?'选这家并加载餐盘':'当前不可选'}</button></article>`).join('');
  $('store-list').querySelectorAll('[data-store]').forEach(b=>b.onclick=()=>loadStore(foundStores[Number(b.dataset.store)]));
 }catch(e){if(version===generation)$('store-status').textContent=e.message;}
 finally{$('search-stores').disabled=false;}
};
async function loadStore(chosen){
 if(locked||!service)return;const version=++generation,active=service;locked=true;mode='real';store=chosen;meals=[];clearSession();render();$('search-stores').disabled=true;
 $('store-list').querySelectorAll('button').forEach(b=>b.disabled=true);
 try{const loaded=await active.load(chosen,message=>{if(version===generation){$('store-status').textContent=message;$('count').textContent=message;}});
  if(version!==generation)return;meals=loaded.meals;rebuildBoard();$('store-status').textContent=`${loaded.meals.length} 份真实餐盘已就绪${loaded.failures.length?'，部分组合未通过核价':''}`;
  $('connection-status').textContent=`已连接 · ${chosen.storeName}`;save();$('settings-dialog').close();toast('真实餐盘已加载，价格均已核实');
 }catch(e){if(version===generation)$('store-status').textContent=e.message;}
 finally{if(version===generation){locked=false;render();$('search-stores').disabled=false;$('store-list').querySelectorAll('button').forEach(b=>b.disabled=!foundStores[Number(b.dataset.store)]?.businessStatus);}}
}
$('demo-mode').onclick=()=>{if(locked)return;generation++;mode='demo';meals=demoMeals;store=null;clearSession();rebuildBoard();render();$('settings-dialog').close();toast('已切换演示，样例与真实餐单分开')};
$('connect-local').onclick=()=>{$('connection-route').value='proxy';$('token').value='local-file-credential';$('connect').click();};
fetch('/api/runtime',{credentials:'omit'}).then(r=>r.json()).then(r=>{$('connect-local').hidden=!r.localCredential;}).catch(()=>{});
function schema(){const t=tools.find(t=>t.name===$('tool-name').value);$('tool-schema').textContent=JSON.stringify(t?.inputSchema||{},null,2)}$('tool-name').onchange=schema;
$('tool-call').onclick=async()=>{if(!client)return;const attempt=client;$('tool-call').disabled=true;$('tool-output').textContent='查询中…';try{const args=JSON.parse($('tool-args').value);if(!args||Array.isArray(args)||typeof args!=='object')throw new Error('参数应为 JSON 对象');const result=await attempt.call($('tool-name').value,args);if(client===attempt)$('tool-output').textContent=JSON.stringify(result,null,2);}catch(e){if(client===attempt)$('tool-output').textContent=e.message}finally{$('tool-call').disabled=false}};
$('disconnect').onclick=()=>{generation++;client?.disconnect();client=null;service=null;tools=[];foundStores=[];locked=false;if(mode==='real'){meals=[];store=null;clearSession();render();}$('token').value='';$('tool-output').textContent='';$('tool-schema').textContent='';$('tool-args').value='{}';$('tools-panel').hidden=true;$('store-panel').hidden=true;$('store-list').replaceChildren();$('connection-status').textContent='已断开，凭证和查询内容已清除'};
let drag=null,dragged=false;
$('wheel').addEventListener('pointerdown',e=>{if(locked||e.button!==0)return;const item=e.target.closest('[data-id]');if(!item)return;dragged=false;drag={id:item.dataset.id,x:e.clientX,y:e.clientY,pointer:e.pointerId,active:false};});
$('wheel').addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.active){if(Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>12){drag=null;return;}if(Math.hypot(dx,dy)<14)return;drag.active=true;dragged=true;$('wheel').setPointerCapture(e.pointerId);document.body.classList.add('dragging');$('remove-zone').hidden=false;drag.ghost=document.createElement('div');drag.ghost.className='drag-ghost';drag.ghost.textContent=meals.find(m=>m.id===drag.id).name;document.body.append(drag.ghost);}e.preventDefault();drag.ghost.style.left=`${e.clientX+12}px`;drag.ghost.style.top=`${e.clientY-30}px`;const r=$('wheel').getBoundingClientRect();drag.outside=Math.hypot(e.clientX-r.x-r.width/2,e.clientY-r.y-r.height/2)>r.width/2+25;$('remove-zone').classList.toggle('over',drag.outside);$('remove-zone').textContent=drag.outside?'松手，移除这顿餐盘 ×':'拖到餐盘外侧移除';},{passive:false});
function endDrag(e,cancel=false){if(!drag)return;const old=drag;drag=null;if(old.active){old.ghost.remove();$('remove-zone').hidden=true;document.body.classList.remove('dragging');if(!cancel&&old.outside)remove(old.id);if($('wheel').hasPointerCapture(old.pointer))$('wheel').releasePointerCapture(old.pointer);}setTimeout(()=>dragged=false,100)}
$('wheel').addEventListener('pointerup',e=>endDrag(e));$('wheel').addEventListener('pointercancel',e=>endDrag(e,true));
 $('store-city').value=saved.city||'';$('store-keyword').value=saved.keyword||'';syncBudget();rebuildBoard();render();



