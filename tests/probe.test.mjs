import {test} from 'node:test';
import assert from 'node:assert/strict';
import {probeConnection} from '../dist/mcp.mjs';
test('无需个人 Token 的预检能区分可读 401 与网络跨域失败',async()=>{
 let request;
 const result=await probeConnection(async(url,options)=>{request=options;return new Response(null,{status:401});});
 assert.equal(result.reachable,true);assert.equal(result.status,401);
 assert.equal(request.headers.Authorization,'Bearer connection-check-not-a-token');
 assert.equal(request.credentials,'omit');
 const failed=await probeConnection(async()=>{throw new TypeError('Failed to fetch')});assert.equal(failed.reachable,false);assert.match(failed.message,/跨域|网络/);
});
