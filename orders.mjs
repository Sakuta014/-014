import {randomUUID} from 'node:crypto';
import {defaultConfiguration,officialImage,readQuote} from './dist/adapter.mjs';
const activeStates=new Set(['checking','submitting','created','unknown']);
const terminalStatus=new Set(['6','7','8','已完成','已取消','已评价']);
export function safePaymentUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&['mcd.cn','mcdchina.net'].some(d=>u.hostname===d||u.hostname.endsWith('.'+d))?u.href:null;}catch{return null;}}
function takeWays(data){const seen=new Set();return (data.takeWayList||[]).filter(w=>typeof w.code==='string'&&w.code&&typeof w.title==='string'&&w.title&&!seen.has(w.code)&&seen.add(w.code)).map(w=>({code:w.code,title:w.title,subtitle:String(w.subtitle||'')}));}
export class OrderService{
 constructor({call,persist=async()=>{},records=[],now=Date.now}){this.call=call;this.persist=persist;this.now=now;this.records=new Map(records.map(r=>[r.id,{...r,state:r.state==='submitting'||r.state==='checking'?'unknown':r.state}]));this.preparations=new Map();}
 public(r){return {id:r.id,state:r.state,price:r.price,meal:r.meal,store:r.store,takeWays:r.takeWays,expiresAt:r.expiresAt,orderId:r.orderId||null,payUrl:r.payUrl||null,status:r.status||null,pickupCode:r.pickupCode||'',totalAmount:r.totalAmount||''};}
 async save(){await this.persist([...this.records.values()].map(r=>structuredClone(r)));}
 async prepare(input){
  if(!input||!['storeCode','productCode','city','keyword'].every(k=>typeof input[k]==='string'&&input[k].trim()&&input[k].length<=150))throw Error('请选择有效餐厅和套餐');
  const key=JSON.stringify([input.storeCode,input.productCode]);
  const previous=[...this.records.values()].find(r=>r.key===key&&((activeStates.has(r.state)&&!terminalStatus.has(r.status))||(r.state==='prepared'&&r.expiresAt>this.now()&&r.budget===(input.budget??null)&&(!input.signature||r.signature===input.signature))));
  if(previous)return this.public(previous);
  const preparationKey=JSON.stringify([key,input.budget??null,input.signature||'']);
  if(this.preparations.has(preparationKey))return this.preparations.get(preparationKey);
  const pending=this.prepareNew(input,key);this.preparations.set(preparationKey,pending);try{return await pending;}finally{this.preparations.delete(preparationKey);}
 }
 async prepareNew(input,key){
  const stores=await this.call('query-nearby-stores',{beType:1,searchType:2,city:input.city,keyword:input.keyword});
  const store=stores.find(s=>String(s.storeCode)===input.storeCode&&s.businessStatus===true);if(!store)throw Error('这家餐厅当前不可下单，请重新选择');
  const detail=await this.call('query-meal-detail',{storeCode:input.storeCode,orderType:1,beType:1,code:input.productCode});
  const config=defaultConfiguration(detail);if(input.signature&&input.signature!==config.signature)throw Error('套餐配置已变化，请重新加载餐厅');
  const args={storeCode:input.storeCode,orderType:1,beType:1,items:[config.item],needTableware:false};
  const quote=await this.call('calculate-price',args),{price}=readQuote(quote),ways=takeWays(quote);
  if(!ways.length)throw Error('餐厅没有返回可用取餐方式，暂时不能下单');
  if(input.budget!=null&&(!Number.isSafeInteger(input.budget)||input.budget<=0||price>input.budget))throw Error('最新价格超过预算，请先调整预算');
  const record={id:randomUUID(),key,signature:config.signature,state:'prepared',args,price,budget:input.budget??null,takeWays:ways,expiresAt:this.now()+5*60000,meal:{name:detail.name,image:officialImage(detail.image),items:config.parts.map(p=>`${p.name} × ${p.quantity}`)},store:{storeCode:store.storeCode,storeName:store.storeName,address:store.address}};
  this.records.set(record.id,record);await this.save();return this.public(record);
 }
 async submit(input){
  const r=this.records.get(input?.id);if(!r)throw Error('确认信息已失效，请重新选择套餐');
  if(r.state!=='prepared')throw Error('这份订单已提交或正在处理中，请查看已有订单，勿重复下单');
  if([...this.records.values()].some(other=>other.id!==r.id&&other.key===r.key&&activeStates.has(other.state)&&!terminalStatus.has(other.status)))throw Error('已有相同套餐的订单正在处理，请勿重复下单');
  if(input.confirmed!==true||input.price!==r.price||!r.takeWays.some(w=>w.code===input.takeWayCode))throw Error('请确认最新金额和有效取餐方式');
  if(this.now()>=r.expiresAt){r.state='expired';throw Error('报价已过期，请重新确认');}
  r.state='checking';
  try{
   const latest=await this.call('calculate-price',r.args),{price}=readQuote(latest);
   if(price!==r.price||(r.budget!=null&&price>r.budget)){r.state='expired';throw Error('价格已变化，请重新打开下单确认页');}
   if(!takeWays(latest).some(w=>w.code===input.takeWayCode)){r.state='expired';throw Error('取餐方式已变化，请重新确认');}
  }catch(e){if(r.state==='checking')r.state='prepared';throw e;}
  r.state='submitting';r.takeWayCode=input.takeWayCode;
  // Persist before sending: a crash or uncertain response must never trigger an automatic retry.
  await this.save();
  try{
   const data=await this.call('create-order',{...r.args,takeWayCode:r.takeWayCode});
   const id=data.orderId||data.orderDetail?.orderId;if(!id||typeof id!=='string')throw Error('未返回可核实的订单号');
   r.orderId=id;r.payUrl=safePaymentUrl(data.payH5Url);r.status=String(data.orderDetail?.orderStatus||'');r.state='created';await this.save();
  }catch{r.state='unknown';await this.save();}
  return this.public(r);
 }
 async status(input){const r=this.records.get(input?.id);if(!r)throw Error('订单记录不存在');if(!r.orderId)return this.public(r);
  const detail=await this.call('query-order',{orderId:r.orderId});if(detail.orderId&&detail.orderId!==r.orderId)throw Error('订单响应不匹配，请在麦当劳 App 核实');r.state='created';r.status=String(detail.orderStatus||detail.status||'');r.pickupCode=String(detail.pickupCode||'');r.totalAmount=String(detail.realTotalAmount||detail.totalAmount||'');await this.save();return this.public(r);
 }
}
