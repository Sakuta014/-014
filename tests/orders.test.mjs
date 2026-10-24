import {test} from 'node:test';
import assert from 'node:assert/strict';
import {OrderService} from '../orders.mjs';
const store={storeCode:'s',storeName:'餐厅',address:'门店地址',businessStatus:true};
const detail={code:'combo',name:'鸡肉套餐',rounds:[{id:1,minQuantity:1,maxQuantity:1,choices:[{code:'chicken',name:'鸡肉堡',isDefault:1,quantity:1}]},{id:2,minQuantity:1,maxQuantity:1,choices:[{code:'drink',name:'可乐',isDefault:1,quantity:1}]}]};
const input={city:'南京',keyword:'新街口',storeCode:'s',productCode:'combo',budget:3500};
function setup(){let price=2800,creates=0,fail=false;const journal=[];const service=new OrderService({call:async(name,args)=>{
 if(name==='query-nearby-stores')return [store];if(name==='query-meal-detail')return detail;
 if(name==='calculate-price')return {price,takeWayList:[{code:'take',title:'打包带走'}]};
 if(name==='create-order'){creates++;assert.equal(args.takeWayCode,'take');assert.equal(args.beCode,undefined);assert.equal(args.items[0].roundList.length,2);if(fail)throw Error('timeout');return {orderId:'order1',payH5Url:'https://m.mcd.cn/mcp/scanToPay?example=1',orderDetail:{orderStatus:'1'}};}
 if(name==='query-order')return {orderId:'order1',orderStatus:'2',pickupCode:'A123',realTotalAmount:'28.00'};
 throw Error(name);
 },persist:async records=>journal.push(structuredClone(records))});return {service,journal,get creates(){return creates;},set price(v){price=v;},set fail(v){fail=v;}};}
const confirm=id=>({id,confirmed:true,price:2800,takeWayCode:'take'});
test('准备订单只查询，必须明确确认金额和官方取餐方式',async()=>{const f=setup(),draft=await f.service.prepare(input);assert.equal(f.creates,0);assert.equal(draft.meal.name,'鸡肉套餐');assert.equal(draft.price,2800);assert.equal(draft.takeWays[0].code,'take');await assert.rejects(f.service.submit({...confirm(draft.id),confirmed:false}));await assert.rejects(f.service.submit({...confirm(draft.id),price:1}));await assert.rejects(f.service.submit({...confirm(draft.id),takeWayCode:'fake'}));assert.equal(f.creates,0);});
test('价格变化或过期不提交订单，不能强行超预算',async()=>{const f=setup();await assert.rejects(f.service.prepare({...input,budget:100}));const d=await f.service.prepare(input);f.price=3000;await assert.rejects(f.service.submit(confirm(d.id)),/价格/);assert.equal(f.creates,0);});
test('连续提交只创建一次，并且在发送前持久记录提交状态',async()=>{const f=setup(),d=await f.service.prepare(input);const results=await Promise.allSettled([f.service.submit(confirm(d.id)),f.service.submit(confirm(d.id))]);assert.equal(f.creates,1);assert.ok(results.some(x=>x.status==='fulfilled'&&x.value.orderId==='order1'));assert.ok(f.journal.some(records=>records.some(r=>r.state==='submitting')));const again=await f.service.prepare(input);assert.equal(again.orderId,'order1');const status=await f.service.status({id:d.id});assert.equal(status.status,'2');assert.equal(status.pickupCode,'A123');});
test('提交超时不自动重试，持久状态重载后仍拦截重复单',async()=>{const f=setup(),d=await f.service.prepare(input);f.fail=true;const result=await f.service.submit(confirm(d.id));assert.equal(result.state,'unknown');await assert.rejects(f.service.submit(confirm(d.id)));assert.equal((await f.service.prepare(input)).state,'unknown');const records=f.journal.at(-1);const reloaded=new OrderService({records,call:async()=>{throw Error('不应重新下单');},persist:async()=>{}});assert.equal((await reloaded.prepare(input)).state,'unknown');assert.equal(f.creates,1);});
test('日志写入失败时不发送真实订单',async()=>{const f=setup(),d=await f.service.prepare(input);f.service.persist=async()=>{throw Error('disk full');};await assert.rejects(f.service.submit(confirm(d.id)));assert.equal(f.creates,0);});

test('不同预算产生的两个确认页也不能创建重复订单',async()=>{const f=setup(),a=await f.service.prepare(input),b=await f.service.prepare({...input,budget:4000});assert.notEqual(a.id,b.id);await Promise.allSettled([f.service.submit(confirm(a.id)),f.service.submit(confirm(b.id))]);assert.equal(f.creates,1);});
test('过期确认页不提交订单',async()=>{const f=setup(),d=await f.service.prepare(input);f.service.now=()=>d.expiresAt;await assert.rejects(f.service.submit(confirm(d.id)),/过期/);assert.equal(f.creates,0);});

test('并发确认页不能借用更高预算的准备结果',async()=>{const f=setup();const results=await Promise.allSettled([f.service.prepare(input),f.service.prepare({...input,budget:2000})]);assert.equal(results[0].status,'fulfilled');assert.equal(results[1].status,'rejected');assert.equal(f.creates,0);});
