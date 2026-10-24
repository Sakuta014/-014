import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {proxyMcp} from './proxy.mjs';
import {createOrderHandler} from './order-http.mjs';
import {VisitorSessions} from './sessions.mjs';
import {sameOrigin} from './origin.mjs';
import {McpClient} from './dist/mcp.mjs';
import {fileURLToPath} from 'node:url';
const root=resolve(import.meta.dirname,'dist');
// Visitors use only their own temporary sessions. Author environment credentials are never loaded.
export function createAppServer({visitorSessions,handlerFactory=createOrderHandler}={}){
const sessions=visitorSessions||new VisitorSessions({verify:async token=>{const client=new McpClient(token);try{await client.connect();}finally{client.disconnect();}}});
const handlers=new Map(),inflight=new Map();
function pruneHandlers(){const active=sessions.activeKeys();for(const key of handlers.keys())if(!active.has(key)&&!inflight.get(key))handlers.delete(key);}
const sweep=setInterval(pruneHandlers,60000);sweep.unref();
const secure=(process.env.PUBLIC_ORIGIN||'').startsWith('https:')?'; Secure':'';
const cookie=(id,age)=>`mcd_session=${id}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure}`;
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp'};
const server=http.createServer(async(req,res)=>{
 const send=(status,data,headers={})=>res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store',...headers}).end(JSON.stringify(data));
 try{
  if((req.url==='/api/session'||req.url==='/api/runtime')&&req.method==='GET'){send(200,sessions.status(req));return;}
  if(req.url==='/api/session/connect'||req.url==='/api/session/disconnect'){
   if(req.method!=='POST'||!sameOrigin(req.headers.host,req.headers.origin)){send(403,{error:'请求来源不允许'});return;}
   sessions.disconnect(req);pruneHandlers();
   if(req.url.endsWith('/disconnect')){send(200,{connected:false},{'Set-Cookie':cookie('',0)});return;}
   let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>8192){send(413,{error:'输入过长'},{'Set-Cookie':cookie('',0)});return;}chunks.push(chunk);}
   let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{send(400,{error:'请输入有效的连接信息'},{'Set-Cookie':cookie('',0)});return;}
   try{const session=await sessions.connect(body.token);send(200,{connected:true,expiresAt:session.expiresAt},{'Set-Cookie':cookie(session.id,1800)});}catch{send(401,{error:'连接失败，请检查自己的 Token 是否有效；未使用其他账号'},{'Set-Cookie':cookie('',0)});}return;
  }
  if(req.url==='/api/mcp'||req.url?.startsWith('/api/order/')){
   const session=sessions.get(req);if(!session){send(401,{error:'请先连接你自己的麦当劳账号'});return;}
   if(req.url==='/api/mcp'){await proxyMcp(req,res,session.token);return;}
   inflight.set(session.key,(inflight.get(session.key)||0)+1);
   try{
   if(!handlers.has(session.key))handlers.set(session.key,handlerFactory({token:session.token,statePath:resolve(import.meta.dirname,'.local','visitors',`orders-${session.key}.json`)}));
   let handler;try{handler=await handlers.get(session.key);}catch(e){handlers.delete(session.key);throw e;}await handler(req,res);
   }finally{inflight.set(session.key,inflight.get(session.key)-1);if(!inflight.get(session.key))inflight.delete(session.key);pruneHandlers();}return;
  }
  const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403).end();return;}
  const file=path===root?resolve(root,'index.html'):path;const body=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(body);
 }catch{if(!res.headersSent){if(req.url?.startsWith('/api/'))send(503,{error:'服务暂不可用，请稍后重试'});else res.writeHead(404).end('Not found');}else res.end();}
});
server.on('close',()=>clearInterval(sweep));return server;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))createAppServer().listen(Number(process.env.PORT)||5178,process.env.HOST||'127.0.0.1',()=>console.log('Meal wheel service ready'));
