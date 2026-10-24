import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {dirname} from 'node:path';
import {McpClient} from './dist/mcp.mjs';
import {unwrapResult} from './dist/adapter.mjs';
import {OrderService} from './orders.mjs';
export function validateOrderRequest(req){if(req.headers.host!=='127.0.0.1:5178'||req.headers.origin!=='http://127.0.0.1:5178')return '仅允许本机同源网页访问';if(req.method!=='POST')return '仅支持 POST';return null;}
export async function createOrderHandler({token,statePath}){
 let records=[];try{records=JSON.parse(await readFile(statePath,'utf8'));if(!Array.isArray(records))throw Error('订单记录格式错误');}catch(e){if(e.code!=='ENOENT')throw e;}
 let writing=Promise.resolve();
 const persist=records=>{const content=JSON.stringify(records);writing=writing.catch(()=>{}).then(async()=>{await mkdir(dirname(statePath),{recursive:true});await writeFile(statePath+'.tmp',content,{mode:0o600});await rename(statePath+'.tmp',statePath);});return writing;};
 const call=async(name,args)=>{if(!['query-nearby-stores','query-meal-detail','calculate-price','create-order','query-order'].includes(name))throw Error('不支持此操作');
  const client=new McpClient(token);try{await client.connect();return unwrapResult(await client.request('tools/call',{name,arguments:args}));}finally{client.disconnect();}
 };
 const service=new OrderService({call,persist,records});
 return async(req,res)=>{
  const send=(code,data)=>res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(data));
  const error=validateOrderRequest(req);if(error){send(403,{error});return;}if(!token){send(503,{error:'餐厅账号尚未连接'});return;}
  try{
   const action=req.url.slice('/api/order/'.length);if(!['prepare','submit','status'].includes(action)){send(404,{error:'操作不存在'});return;}
   let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>128*1024){send(413,{error:'请求过大'});return;}chunks.push(chunk);}
   let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{send(400,{error:'请求格式错误'});return;}
   const result=await service[action](input);send(200,result);
  }catch(e){send(409,{error:e.message||'订单处理暂未完成，请在麦当劳 App 核实'});}
 };
}
