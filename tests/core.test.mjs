import {test} from 'node:test';
import assert from 'node:assert/strict';
import {visibleMeals, nextSpinPool, undoRemoval, quoteValid, quoteResponseMatches, selectIndex, landingRotation} from '../dist/core.mjs';
const meals=[{id:'a',price:2000,meat:'chicken',fried:true,tags:['不辣']},{id:'b',price:3000,meat:'beef',fried:false,tags:['不辣']},{id:'c',price:4000,meat:'fish',fried:true,tags:[]}];
test('预算放宽恢复基础池，但保留手动排除',()=>{
 assert.deepEqual(visibleMeals(meals,{budget:3500},new Set(['a'])).map(m=>m.id),['b']);
 assert.deepEqual(visibleMeals(meals,{budget:null},new Set(['a'])).map(m=>m.id),['b','c']);
});
test('重抽先更新池，优先切换肉类；不恢复已移除项',()=>{
 assert.deepEqual(nextSpinPool(meals,meals[0]).map(m=>m.id),['b','c']);
 assert.deepEqual(nextSpinPool([meals[0]],meals[0]),[]);
});
test('未知标签不能当作满足忌口',()=>assert.deepEqual(visibleMeals(meals,{budget:null,nonSpicy:true},new Set()).map(m=>m.id),['a','b']));
test('撤销时条件冲突保留排除记录',()=>{
 const excluded=new Set(['c']); assert.equal(undoRemoval('c',meals,{budget:3500},excluded),false);assert.ok(excluded.has('c'));
 assert.equal(undoRemoval('c',meals,{budget:null},excluded),true);assert.equal(excluded.size,0);
});
test('报价过期及门店变化都失效',()=>{
 const q={at:1000,store:'x'};assert.ok(quoteValid(q,'x',5,2000));assert.ok(!quoteValid(q,'y',5,2000));assert.ok(!quoteValid(q,'x',5,301000));
});
test('旧会话或已切换餐品的核价响应不能确认当前餐单',()=>{
 assert.equal(quoteResponseMatches(1,2,'a','a'),false);
 assert.equal(quoteResponseMatches(2,2,'a','b'),false);
 assert.equal(quoteResponseMatches(2,2,'a','a'),true);
});
test('等权抽取边界及指针落点一致',()=>{
 assert.equal(selectIndex(8,()=>0),0);assert.equal(selectIndex(8,()=>.999999),7);
 for(let n=2;n<=8;n++)for(let i=0;i<n;i++){const r=landingRotation(1234,i,n);assert.ok(r>1234);assert.ok(Math.abs(((r+(i+.5)*360/n)%360))<1e-7);}
});
