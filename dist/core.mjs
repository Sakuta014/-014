export function visibleMeals(pool, prefs, excluded=new Set()) {
 return pool.filter(m=>!excluded.has(m.id)&&(prefs.budget==null||m.price<=prefs.budget)&&(!prefs.nonSpicy||m.tags.includes('不辣'))&&(!prefs.noBeef||(m.meat!=null&&m.meat!=='beef'))&&(!prefs.notFried||m.fried===false)&&(!prefs.meat||m.meat===prefs.meat));
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
