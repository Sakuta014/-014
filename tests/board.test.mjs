import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chooseBoard,boardMeals,restoreBoardItem} from '../dist/board.mjs';
const meals=Array.from({length:12},(_,i)=>({id:String(i),price:1000+i*100,meat:i%2?'beef':'chicken',tags:['不辣']}));
test('换一批只从符合条件的候选取六份且不重复',()=>{
 const eligible=meals.filter(m=>m.price<=1800),board=chooseBoard(eligible,[],6,()=>.2);
 assert.equal(board.length,6);assert.equal(new Set(board).size,6);assert.ok(board.every(id=>eligible.some(m=>m.id===id)));
 assert.notDeepEqual(new Set(chooseBoard(eligible,board,6,()=>.2)),new Set(board));
});
test('移除后不补位，只有明确刷新才重新选一盘',()=>{
 const ids=chooseBoard(meals,[],6,()=>.5),removed=new Set([ids[0]]);
 assert.equal(boardMeals(meals,ids,{budget:null},removed).length,5);
 assert.equal(chooseBoard(meals,ids,6,()=>.7).length,6);
});
test('候选不足六份如实展示，不复制、不绕过条件',()=>{
 assert.equal(chooseBoard(meals.slice(0,2),[],6,()=>0).length,2);
 assert.deepEqual(chooseBoard([],[],6),[]);
 assert.equal(boardMeals(meals,['0','1'],{budget:1000},new Set()).length,1);
});
test('移除、重建盘面再撤销时，餐品实际回到盘面且不超过六份',()=>{
 const removed=new Set(['0']),ids=chooseBoard(meals.filter(m=>!removed.has(m.id)),[],6,()=>.3);
 assert.ok(!ids.includes('0'));removed.delete('0');
 const restored=restoreBoardItem(ids,'0');assert.equal(restored.length,6);assert.ok(boardMeals(meals,restored,{budget:null},removed).some(m=>m.id==='0'));
 assert.equal(restoreBoardItem(restored,'0').length,6);
});
