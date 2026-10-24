const endpoint='https://mcp.mcd.cn';
const allowed=new Set(['now-time-info','query-nearby-stores','query-meals','query-meal-detail','query-store-coupons','calculate-price','list-nutrition-foods']);
export async function probeConnection(fetcher=fetch,url=endpoint){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetcher(url,{method:'POST',headers:{Authorization:'Bearer connection-check-not-a-token','Content-Type':'application/json',Accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'meal-wheel-connection-check',version:'0.1.0'}}}),credentials:'omit',redirect:'error',signal:controller.signal});
  await response.body?.cancel();
  return {reachable:true,status:response.status,message:`浏览器可以读取官方响应（HTTP ${response.status}）。这只验证初始连接；仍需个人 Token 验证握手、会话与工具。`};
 }catch(e){return {reachable:false,message:e.name==='AbortError'?'连接检查超时，请检查网络后重试。':'当前浏览器无法读取官方接口：可能是跨域限制、网络或服务拦截。请勿反复更换 Token；先排查连接环境。'};}
 finally{clearTimeout(timer);}
}
export function parseSSE(text,id){
 for(const event of text.replace(/\r\n/g,'\n').split('\n\n')){
  const raw=event.split('\n').filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');
  if(!raw)continue;try{const value=JSON.parse(raw);if(value.id===id)return value;}catch{}
 }
 throw new Error('未收到匹配的 MCP 响应');
}
export class McpClient{
 constructor(token,fetcher=fetch,url=endpoint){this.token=token;this.fetcher=fetcher;this.url=url;this.id=0;this.session=null;this.version=null;this.controllers=new Set();}
 disconnect(){for(const c of this.controllers)c.abort();this.controllers.clear();this.token='';this.session=null;}
 async request(method,params,notification=false){
  if(!this.token)throw new Error('请先填写个人 Token');
  const id=++this.id,controller=new AbortController();this.controllers.add(controller);
  const timer=setTimeout(()=>controller.abort(),20000);let stage='发送请求';
  try{
   const headers={'Content-Type':'application/json','Accept':'application/json, text/event-stream'};
   if(this.token==='local-file-credential'&&this.url==='/api/mcp')headers['X-Mcd-Local-Credential']='1';else headers.Authorization=`Bearer ${this.token}`;
   if(this.session)headers['Mcp-Session-Id']=this.session;if(this.version)headers['MCP-Protocol-Version']=this.version;
   const response=await (0,this.fetcher)(this.url,{method:'POST',headers,body:JSON.stringify({jsonrpc:'2.0',...(!notification?{id}:{}),method,params}),signal:controller.signal,credentials:'same-origin',redirect:'error'});
   if(!response.ok)throw new Error(response.status===401?'Token 无效或已过期':`MCP 请求失败（HTTP ${response.status}）`);
   stage='读取响应头';const session=response.headers.get('Mcp-Session-Id');if(session)this.session=session;
   if(notification)return;
   const type=response.headers.get('content-type')||'';
   let data;
   if(type.includes('text/event-stream')){
    stage='读取流式响应';const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
    try{while(true){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});try{data=parseSSE(buffer,id);break;}catch{}}}finally{await reader.cancel();}
    if(!data)data=parseSSE(buffer,id);
   }else {stage='读取 JSON 响应';data=await response.json();}
   if(data.error)throw new Error('MCP 返回协议错误，请检查输入或连接');
   if(data.id!==id)throw new Error('MCP 响应编号不匹配');return data.result;
  }catch(e){if(e.name==='AbortError')throw new Error('连接超时或已断开，请重试');if(e instanceof TypeError)throw new Error(`连接在${stage}阶段失败（${method}），请检查网络或官方服务 CORS 支持`);throw e;}
  finally{clearTimeout(timer);this.controllers.delete(controller);}
 }
 async connect(){const init=await this.request('initialize',{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'meal-wheel',version:'0.1.0'}});this.version=init.protocolVersion;await this.request('notifications/initialized',{},true);let cursor,tools=[];do{const page=await this.request('tools/list',cursor?{cursor}:{});tools.push(...page.tools);cursor=page.nextCursor;}while(cursor);return tools;}
 async call(name,args){if(!allowed.has(name))throw new Error('首版仅允许已明确列出的查询和核价工具');const result=await this.request('tools/call',{name,arguments:args});if(result.isError)throw new Error('工具执行失败，请核对参数和业务条件');return result;}
}
