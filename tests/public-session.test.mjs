import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {VisitorSessions} from '../sessions.mjs';
import {createAppServer} from '../server.mjs';
test('公开首页可看，作者凭证标记无效，两位访客通过各自会话调用官方接口',async()=>{
 const originalFetch=globalThis.fetch,oldOrigin=process.env.PUBLIC_ORIGIN;const forwarded=[];
 const sessions=new VisitorSessions({verify:async token=>{if(token.includes('invalid'))throw Error('invalid');}});
 const server=createAppServer({visitorSessions:sessions,handlerFactory:async({token})=>async(req,res)=>{res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify({accountMarker:token.endsWith('A')?'A':'B'}));}});
 server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;process.env.PUBLIC_ORIGIN=base;
 globalThis.fetch=async(url,options)=>{if(String(url)==='https://mcp.mcd.cn'){forwarded.push(options.headers.Authorization);const b=JSON.parse(options.body);return new Response(JSON.stringify({id:b.id,result:{ok:true}}),{headers:{'Content-Type':'application/json'}});}return originalFetch(url,options);};
 const request=(path,body,cookie='',extra={})=>originalFetch(base+path,{method:'POST',headers:{Origin:base,'Content-Type':'application/json',Cookie:cookie,...extra},body:JSON.stringify(body)});
 try{
  assert.equal((await originalFetch(base+'/')).status,200);assert.deepEqual(await (await originalFetch(base+'/api/session')).json(),{connected:false,expiresAt:null});
  assert.equal((await request('/api/mcp',{},'',{Authorization:'Bearer local-file-credential','X-Mcd-Local-Credential':'1'})).status,401);
  assert.equal((await request('/api/order/submit',{confirmed:true})).status,401);
  assert.equal((await request('/api/session/connect',{token:'fake-token-for-visitor-A'},'',{Origin:'https://evil.example'})).status,403);
  const a=await request('/api/session/connect',{token:'fake-token-for-visitor-A'}),b=await request('/api/session/connect',{token:'fake-token-for-visitor-B'});assert.equal(a.status,200);assert.equal(b.status,200);assert.match(a.headers.get('set-cookie'),/HttpOnly/);assert.match(a.headers.get('set-cookie'),/SameSite=Strict/);
  const cookieA=a.headers.get('set-cookie').split(';')[0],cookieB=b.headers.get('set-cookie').split(';')[0];assert.notEqual(cookieA,cookieB);
  const rpc={jsonrpc:'2.0',id:1,method:'initialize',params:{}};
  assert.equal((await request('/api/mcp',rpc,cookieA,{Authorization:'Bearer fake-token-for-visitor-B'})).status,200);assert.equal((await request('/api/mcp',rpc,cookieB)).status,200);assert.deepEqual(forwarded,['Bearer fake-token-for-visitor-A','Bearer fake-token-for-visitor-B']);
  assert.equal((await (await request('/api/order/status',{},cookieA)).json()).accountMarker,'A');assert.equal((await (await request('/api/order/status',{},cookieB)).json()).accountMarker,'B');
  await request('/api/session/disconnect',{},cookieA);assert.equal((await request('/api/mcp',rpc,cookieA)).status,401);assert.equal((await request('/api/mcp',rpc,cookieB)).status,200);
  const invalid=await request('/api/session/connect',{token:'invalid-token-for-test'},cookieB);assert.equal(invalid.status,401);assert.equal((await request('/api/mcp',rpc,cookieB)).status,401);
 }finally{globalThis.fetch=originalFetch;if(oldOrigin==null)delete process.env.PUBLIC_ORIGIN;else process.env.PUBLIC_ORIGIN=oldOrigin;await new Promise(resolve=>server.close(resolve));}
});

test('退出重连时，进行中的订单继续复用同一个账户处理器',async()=>{
 const oldOrigin=process.env.PUBLIC_ORIGIN;let factories=0,release,entered;
 const blocked=new Promise(r=>release=r),started=new Promise(r=>entered=r);
 const sessions=new VisitorSessions({verify:async()=>{}});
 const server=createAppServer({visitorSessions:sessions,handlerFactory:async()=>{factories++;let submitting=false;return async(req,res)=>{if(submitting){res.writeHead(409).end();return;}submitting=true;entered();await blocked;res.writeHead(200).end();};}});
 server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;process.env.PUBLIC_ORIGIN=base;
 const post=(path,body,cookie='')=>fetch(base+path,{method:'POST',headers:{Origin:base,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(body)});
 try{
  const first=await post('/api/session/connect',{token:'fake-visitor-concurrent-token'}),cookie=first.headers.get('set-cookie').split(';')[0];
  const pending=post('/api/order/submit',{},cookie);await started;
  await post('/api/session/disconnect',{},cookie);
  const second=await post('/api/session/connect',{token:'fake-visitor-concurrent-token'}),again=second.headers.get('set-cookie').split(';')[0];
  assert.equal((await post('/api/order/submit',{},again)).status,409);assert.equal(factories,1);
  release();assert.equal((await pending).status,200);
 }finally{release();if(oldOrigin==null)delete process.env.PUBLIC_ORIGIN;else process.env.PUBLIC_ORIGIN=oldOrigin;await new Promise(r=>server.close(r));}
});
