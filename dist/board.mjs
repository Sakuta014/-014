import {selectIndex,visibleMeals} from './core.mjs';
export function chooseBoard(pool,previousIds=[],limit=6,random){
 const shuffled=[...pool];
 for(let i=shuffled.length-1;i>0;i--){const j=selectIndex(i+1,random);[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
 const selected=shuffled.slice(0,limit),previous=new Set(previousIds);
 // 候选足够时确保“换一批”确实换入新套餐，盘面内仍等权抽取。
 if(selected.length&&shuffled.length>limit&&selected.every(m=>previous.has(m.id))){const replacement=shuffled.slice(limit).find(m=>!previous.has(m.id));if(replacement)selected[selected.length-1]=replacement;}
 return selected.map(m=>m.id);
}
export function boardMeals(pool,ids,prefs,excluded){
 const eligible=new Map(visibleMeals(pool,prefs,excluded).map(m=>[m.id,m]));
 return ids.flatMap(id=>eligible.has(id)?[eligible.get(id)]:[]);
}
export function restoreBoardItem(ids,id,limit=6){
 if(ids.includes(id))return ids;
 return [...ids.slice(0,limit-1),id];
}
