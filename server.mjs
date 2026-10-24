import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {proxyMcp} from './proxy.mjs';
import {createHash} from 'node:crypto';
import {createOrderHandler} from './order-http.mjs';
const root=resolve(import.meta.dirname,'dist');
// 可选：凭证文件只在启动时读取到本机进程内存，不传到浏览器、不写仓库。
const localCredential=process.env.MCD_TOKEN_FILE?(await readFile(process.env.MCD_TOKEN_FILE,'utf8')).trim().replace(/^\uFEFF/,'').replace(/^Bearer\s+/i,''):'';
const runtimeConfig={localCredential:!!localCredential,city:process.env.MCD_CITY||'',keyword:process.env.MCD_KEYWORD||'',storeCode:process.env.MCD_STORE_CODE||''};
const orderHandler=await createOrderHandler({token:localCredential,statePath:resolve(import.meta.dirname,'.local',`orders-${createHash('sha256').update(localCredential).digest('hex').slice(0,20)}.json`)});
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp'};
http.createServer(async(req,res)=>{if(req.url?.startsWith('/api/order/')){await orderHandler(req,res);return;}if(req.url==='/api/mcp'){await proxyMcp(req,res,localCredential);return;}if(req.url==='/api/runtime'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(runtimeConfig));return;}try{const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403).end();return;}const file=path===root?resolve(root,'index.html'):path;const body=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(body);}catch{res.writeHead(404).end('Not found');}}).listen(5178,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:5178'));
