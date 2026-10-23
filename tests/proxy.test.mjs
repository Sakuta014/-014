import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateProxyRequest} from '../proxy.mjs';
const request={host:'127.0.0.1:5178',origin:'http://127.0.0.1:5178',method:'POST',authorization:'Bearer sample',body:{jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'query-meals',arguments:{}}}};
test('代理只接受同源、固定协议和只读工具',()=>{
 assert.equal(validateProxyRequest(request),null);
 assert.match(validateProxyRequest({...request,origin:'https://other.example'}),/同源/);
 assert.match(validateProxyRequest({...request,body:{...request.body,params:{name:'create-order'}}}),/工具/);
 assert.match(validateProxyRequest({...request,body:{...request.body,method:'unknown'}}),/协议/);
 assert.match(validateProxyRequest({...request,authorization:''}),/Token/);
});
