import {test} from 'node:test';
import assert from 'node:assert/strict';
import {unwrapResult,defaultConfiguration,readQuote,menuCandidates,officialImage} from '../dist/adapter.mjs';
test('MCP 文本/结构化业务错误不冒充成功',()=>{
 assert.deepEqual(unwrapResult({content:[{type:'text',text:'{"success":true,"data":{"x":1}}'}]}),{x:1});
 assert.throws(()=>unwrapResult({structuredContent:{success:false,message:'售罄'}}),/售罄/);
});
test('必选子项与未选特制键完整保留',()=>{
 const detail={code:'combo',name:'套餐',rounds:[{id:1,minQuantity:1,maxQuantity:1,choices:[{code:'burger',name:'鸡肉汉堡',isDefault:1,quantity:1,modification:{items:[{minValues:0,maxValues:2,values:[{code:'a',selectedQuantity:1,selectedKey:'yes'},{code:'b',selectedQuantity:0,selectedKey:'yes',unselectedKey:'no'}]}]}}]}]};
 detail.rounds.push({id:2,minQuantity:1,maxQuantity:1,choices:[{code:'drink',name:'饮品',isDefault:1,quantity:1}]});
 const result=defaultConfiguration(detail);assert.equal(result.item.roundList[0].comboItemList[0].code,'burger');assert.deepEqual(result.item.roundList[0].comboItemList[0].modification.values,[{code:'a',key:'yes',quantity:1},{code:'b',key:'no',quantity:0}]);
 detail.rounds[0].choices[0].isDefault=0;assert.throws(()=>defaultConfiguration(detail),/默认|必选/);
});
test('真实核价严格采用整数分，缺失和零价拒绝',()=>{assert.equal(readQuote({price:3450}).price,3450);assert.throws(()=>readQuote({price:'34.5'}));assert.throws(()=>readQuote({price:0}));assert.throws(()=>readQuote({}));});
test('菜单候选排除多人、会员随单购及单品',()=>{const menu={meals:{a:{name:'鸡腿堡三件套'},b:{name:'双人套餐'},c:{name:'麦金卡套餐',canWithOrder:true},d:{name:'中薯条'}}};assert.deepEqual(menuCandidates(menu).map(m=>m.code),['a']);});
test('图片只接受官方 https 地址',()=>{assert.equal(officialImage('https://menu-img.mcd.cn/a.png'),'https://menu-img.mcd.cn/a.png');assert.equal(officialImage('javascript:alert(1)'),null);assert.equal(officialImage('https://evil.example/img.png'),null);});
