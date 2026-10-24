export function unwrapResult(result){
 let body=result.structuredContent;
 if(!body)for(const c of result.content||[])if(c.type==='text'){try{body=JSON.parse(c.text);break;}catch{}}
 if(!body)throw new Error('官方响应格式无法识别');
 if(result.isError||body.success===false||(body.code!=null&&![0,200,'0','200'].includes(body.code)))throw new Error(body.message||'官方业务查询失败');
 if(body.data==null)throw new Error(body.message||'官方没有返回可用数据');return body.data;
}
export function officialImage(input){try{const u=new URL(input);return u.protocol==='https:'&&(u.hostname==='mcd.cn'||u.hostname.endsWith('.mcd.cn'))?u.href:null;}catch{return null;}}
function modification(config){
 const values=[];
 for(const group of config?.items||[]){
  const selected=(group.values||[]).filter(v=>v.selectedQuantity>0),count=selected.length;
  if(count<(group.minValues||0)||(group.maxValues>=0&&count>group.maxValues))throw new Error('默认特制配置不完整');
  for(const v of group.values||[]){const quantity=v.selectedQuantity||0,key=quantity>0?v.selectedKey:v.unselectedKey;if(key)values.push({code:v.code,key,quantity});else if(quantity>0)throw new Error('默认特制缺少选项键');}
 }
 return values.length?{values}:undefined;
}
export function defaultConfiguration(detail){
 if(!detail.code||!detail.name)throw new Error('缺少餐品编码或名称');
 const item={productCode:detail.code,quantity:1},parts=[];
 const mod=modification(detail.modification);if(mod)item.modification=mod;
 if(detail.rounds?.length){
  item.roundList=detail.rounds.map(round=>{
   const selected=(round.choices||[]).filter(c=>c.isDefault===1&&c.quantity>0);
   const count=selected.reduce((n,c)=>n+c.quantity,0);
   if(count<(round.minQuantity||0)||(round.maxQuantity>=0&&count>round.maxQuantity))throw new Error('套餐必选项缺少默认配置');
   return {round:String(round.id),comboItemList:selected.map(c=>{if(!c.code)throw new Error('默认子项编码缺失');parts.push({code:c.code,name:c.name,quantity:c.quantity,supportModify:!!c.supportModify});const choice={code:c.code,quantity:c.quantity},m=modification(c.modification);if(m)choice.modification=m;return choice;})};
  });
 }else parts.push({code:detail.code,name:detail.name,quantity:1,supportModify:!!detail.supportModify});
 if(parts.length<2)throw new Error('候选不是完整单人套餐');
 return {item,parts,signature:JSON.stringify(item.roundList||item)};
}
export function readQuote(data){
 if(!Number.isSafeInteger(data?.price)||data.price<=0)throw new Error('核价没有返回有效的整数分金额');
 return {price:data.price,discount:Number.isSafeInteger(data.discount)?data.discount:0,products:data.productList||[]};
}
export function menuCandidates(menu){
 const priority=['麦辣鸡腿','麦香鱼','板烧鸡腿','双层吉士','巨无霸','吉士汉堡包','麦香鸡','安格斯'];
 const result=Object.entries(menu.meals||{}).filter(([,m])=>/套餐|三件套/.test(m.name)&&!/双人|多人|亲子|开心乐园|学生|儿童/.test(m.name)&&!m.canWithOrder&&!m.withOrder).map(([code,m])=>({code,...m}));
 return result.sort((a,b)=>{const rank=x=>{const i=priority.findIndex(p=>x.name.includes(p));return i<0?100:i};return rank(a)-rank(b)});
}
function attributes(parts,menu){
 const name=parts[0]?.name||'',tags=parts.flatMap(p=>{const found=menu.categories?.flatMap(c=>c.meals||[]).find(x=>x.code===p.code);return found?.tags||[]});
 let meat=/鸡/.test(name)?'chicken':/鱼|鳕/.test(name)?'fish':/猪|培根|火腿/.test(name)?'pork':/牛|巨无霸|吉士汉堡|不素之霸/.test(name)?'beef':null;
 const fried=/板烧|烤/.test(name)?false:/麦辣|麦香鸡|鱼|鸡排|酥/.test(name)?true:null;
 return {meat,fried,tags,mainCode:parts[0]?.code};
}
export class MealService{
 constructor(client){this.client=client;}
 async call(name,args){return unwrapResult(await this.client.call(name,args));}
 async stores(city,keyword){const data=await this.call('query-nearby-stores',{beType:1,searchType:2,city,keyword:keyword||city});if(!Array.isArray(data))throw new Error('门店列表格式不匹配');return data;}
 async quote(meal,store){
  const data=await this.call('calculate-price',{storeCode:store.storeCode,orderType:1,beType:1,items:[meal.requestItem],needTableware:false});
  const quoted=readQuote(data);return {...meal,price:quoted.price,discount:quoted.discount,quote:{at:Date.now(),store:store.storeCode},quotedProducts:quoted.products};
 }
 async load(store,onProgress=()=>{}){
  if(store.businessStatus!==true)throw new Error('该门店当前暂停营业，请选择其他门店');
  await this.call('now-time-info',{});
  const menu=await this.call('query-meals',{storeCode:store.storeCode,orderType:1,beType:1});
  const candidates=menuCandidates(menu),meals=[],seen=new Set(),failures=[];
  // 查询少量不同主餐，不遍历全菜单；会员随单购套餐在选候选时排除。
  for(const candidate of candidates.slice(0,24)){
   if(meals.length===12)break;
   onProgress(`准备真实餐盘 ${meals.length+1}/12…`);
   try{
    const detail=await this.call('query-meal-detail',{storeCode:store.storeCode,orderType:1,beType:1,code:candidate.code});
    const config=defaultConfiguration(detail);if(seen.has(config.signature))continue;
    const attr=attributes(config.parts,menu);
    if(meals.some(m=>m.mainCode===attr.mainCode))continue;
    const meal={id:`${store.storeCode}:${candidate.code}`,code:candidate.code,name:detail.name,image:officialImage(detail.image||candidate.image),icon:'🍽️',items:config.parts.map(p=>`${p.name}${p.supportModify?'【可特调】':''} × ${p.quantity}`),parts:config.parts,requestItem:config.item,signature:config.signature,...attr};
    const priced=await this.quote(meal,store);meals.push(priced);seen.add(config.signature);
   }catch(e){failures.push({name:candidate.name,message:e.message});}
  }
  if(!meals.length)throw new Error('当前没有组成完整且核价成功的单人餐，请重试或换店');
  return {meals,failures};
 }
}
