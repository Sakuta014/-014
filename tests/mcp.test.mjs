import {test} from 'node:test';
import assert from 'node:assert/strict';
import {McpClient,parseSSE} from '../dist/mcp.mjs';
test('SSE 忽略通知并读取对应响应',()=>assert.deepEqual(parseSSE('data: {"method":"ping"}\r\n\r\ndata: {"id":2,"result":{"tools":[]}}\r\n\r\n',2),{id:2,result:{tools:[]}}));
test('握手先初始化再通知，再发现工具，并传会话头',async()=>{
 const calls=[];const c=new McpClient('test-only',async(url,options)=>{const body=JSON.parse(options.body);calls.push({body,headers:options.headers});if(body.method==='notifications/initialized')return new Response(null,{status:202});return new Response(JSON.stringify({jsonrpc:'2.0',id:body.id,result:body.method==='initialize'?{protocolVersion:'2025-03-26'}:{tools:[{name:'query-meals',inputSchema:{}}]}}),{headers:{'Content-Type':'application/json','Mcp-Session-Id':'sample'}})});
 assert.equal((await c.connect())[0].name,'query-meals');assert.deepEqual(calls.map(x=>x.body.method),['initialize','notifications/initialized','tools/list']);assert.equal(calls[2].headers['Mcp-Session-Id'],'sample');c.disconnect();assert.equal(c.token,'');
});
test('未知工具和写操作不能发送请求',async()=>{let count=0;const c=new McpClient('test-only',()=>{count++});await assert.rejects(c.call('create-order',{}));await assert.rejects(c.call('claim-coupon',{}));assert.equal(count,0)});
test('401 转成可理解的鉴权错误',async()=>{const c=new McpClient('test-only',async()=>new Response(null,{status:401}));await assert.rejects(c.connect(),/Token 无效/)});
test('fetch 调用不绑定客户端实例，兼容浏览器原生 fetch',async()=>{
 const c=new McpClient('test-only',async function(url,options){assert.equal(this,undefined);const request=JSON.parse(options.body);return new Response(JSON.stringify({id:request.id,result:{ok:true}}),{headers:{'Content-Type':'application/json'}})});
 assert.deepEqual(await c.request('initialize',{}),{ok:true});
});
