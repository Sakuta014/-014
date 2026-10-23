import {test} from 'node:test';
import assert from 'node:assert/strict';
import {demoMeals} from '../dist/demo.mjs';
import {officialImage} from '../dist/adapter.mjs';
test('演示盘也必须使用官方完整套餐图，不能退回食物表情或单品',()=>{
 assert.ok(demoMeals.length>6);
 for(const meal of demoMeals){assert.ok(officialImage(meal.image));assert.match(meal.name,/套餐|三件套/);assert.ok(meal.items.length>=3);assert.equal(meal.quote.store,'demo');}
});
