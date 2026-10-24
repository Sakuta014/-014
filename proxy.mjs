import {sameOrigin} from './origin.mjs';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
const tools=new Set(['now-time-info','query-nearby-stores','query-meals','query-meal-detail','query-store-coupons','calculate-price','list-nutrition-foods']);
export function validateProxyRequest({host,origin,method,authorization,body}){
 if(!sameOrigin(host,origin))return '仅允许本机同源网页访问';
 if(method!=='POST')return '仅支持 POST';
 if(!/^Bearer \S+$/.test(authorization||''))return '需要个人 Token';
 if(!body||body.jsonrpc!=='2.0'||!['initialize','notifications/initialized','tools/list','tools/call'].includes(body.method))return '不支持的协议方法';
 if(body.method==='tools/call'&&!tools.has(body.params?.name))return '不允许此工具；仅支持查询与核价';
 return null;
}
export async function proxyMcp(req,res,localCredential=''){
 const fail=(status,message)=>{if(!res.headersSent)res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify({error:message}));};
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),25000);
 res.on('close',()=>abort.abort());
 try{
  let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>256*1024){fail(413,'请求过大');return;}chunks.push(chunk);}
  let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{fail(400,'参数不是有效 JSON');return;}
  const error=validateProxyRequest({host:req.headers.host,origin:req.headers.origin,method:req.method,authorization:localCredential?'Bearer visitor-session':'',body});
  if(error){fail(403,error);return;}
  if(!localCredential){fail(401,'请先连接你自己的麦当劳账号');return;}
  const headers={Authorization:`Bearer ${localCredential}`,'Content-Type':'application/json',Accept:'application/json, text/event-stream'};
  for(const name of ['mcp-session-id','mcp-protocol-version'])if(req.headers[name])headers[name]=req.headers[name];
  const response=await fetch('https://mcp.mcd.cn',{method:'POST',headers,body:JSON.stringify(body),redirect:'error',signal:abort.signal});
  const output={'Content-Type':response.headers.get('content-type')||'application/json','Cache-Control':'no-store'};
  const session=response.headers.get('mcp-session-id');if(session)output['Mcp-Session-Id']=session;
  res.writeHead(response.status,output);
  if(response.body)await pipeline(Readable.fromWeb(response.body),res);else res.end();
 }catch{fail(502,'官方服务暂时无法连接，请稍后重试');}
 finally{clearTimeout(timer);}
}
