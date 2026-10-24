export const dietaryOptions=[
 {key:'nonSpicy',label:'不辣',hint:'只选明确标注不辣的'},
 {key:'noBeef',label:'不吃牛肉',hint:'避开牛肉主餐'},
 {key:'noChicken',label:'不吃鸡肉',hint:'避开鸡肉主餐'},
 {key:'noFish',label:'不吃鱼肉',hint:'避开鱼肉主餐'},
 {key:'noPork',label:'不吃猪肉',hint:'避开猪肉、培根和火腿'},
 {key:'avoidFried',label:'主餐不油炸',hint:'配餐仍可能有薯条'}
];
export function visibleMeals(pool, prefs, excluded=new Set()) {
 return pool.filter(m=>{
  if(excluded.has(m.id)||(prefs.budget!=null&&m.price>prefs.budget))return false;
  if(prefs.nonSpicy&&!m.tags.includes('不辣'))return false;
  const names=(m.items||[]).join(' ');
  for(const [key,meat,pattern] of [['noBeef','beef',/牛|巨无霸|吉士汉堡/],['noChicken','chicken',/鸡/],['noFish','fish',/鱼|鳕/],['noPork','pork',/猪|培根|火腿/]]){
   if(prefs[key]&&(m.meat==null||m.meat===meat||pattern.test(names)))return false;
  }
  return (!(prefs.notFried||prefs.avoidFried)||m.fried===false)&&(!prefs.meat||m.meat===prefs.meat);
 });
}
export function nextSpinPool(pool, previous){
 if(!previous)return pool;
 const rest=pool.filter(m=>m.id!==previous.id);
 const different=rest.filter(m=>m.meat!==previous.meat);
 return different.length?different:rest;
}
export function undoRemoval(id,pool,prefs,excluded){
 if(!visibleMeals(pool,prefs).some(m=>m.id===id))return false;
 excluded.delete(id);return true;
}
export function quoteValid(quote,store,minutes,now=Date.now()) {return !!quote&&quote.store===store&&now-quote.at>=0&&now-quote.at<minutes*60000;}
export function quoteResponseMatches(requestVersion,currentVersion,requestedId,currentId){return requestVersion===currentVersion&&requestedId===currentId;}
export function selectIndex(count,random=()=>{const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]/4294967296;}){
 if(count<1)throw new Error('没有可抽餐盘');return Math.floor(random()*count);
}
export function landingRotation(current,index,count){const target=(360-(index+.5)*360/count)%360;return current+360*5+((target-current%360+360)%360);}
