import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateOrderRequest} from '../order-http.mjs';
import {safePaymentUrl} from '../orders.mjs';
test('下单接口拒绝跨站来源及非 POST，支付链接仅接受官方 HTTPS',()=>{
 const req={method:'POST',headers:{host:'127.0.0.1:5178',origin:'http://127.0.0.1:5178'}};assert.equal(validateOrderRequest(req),null);assert.match(validateOrderRequest({...req,headers:{...req.headers,origin:'https://evil.example'}}),/同源/);assert.match(validateOrderRequest({...req,method:'GET'}),/POST/);assert.equal(safePaymentUrl('https://m.mcd.cn/mcp/scanToPay?a=1'),'https://m.mcd.cn/mcp/scanToPay?a=1');for(const url of ['javascript:alert(1)','https://mcd.cn.evil.example/pay','https://evil.example/pay','http://m.mcd.cn/pay'])assert.equal(safePaymentUrl(url),null);
});
