import {readFile,writeFile} from 'node:fs/promises';
import {McpClient} from '../dist/mcp.mjs';
import {MealService} from '../dist/adapter.mjs';
let token=(await readFile(process.argv[2],'utf8')).trim().replace(/^\uFEFF/,'').replace(/^Bearer\s+/i,'');
const client=new McpClient(token);
try{
 await client.connect();const service=new MealService(client);
 const city=process.argv[3],keyword=process.argv[4]||city;if(!city)throw new Error('请传入测试城市和地标');
 const stores=await service.stores(city,keyword),store=stores.find(s=>s.businessStatus===true);
 if(!store)throw new Error('测试区域当前没有营业门店');
 const result=await service.load(store);console.log(JSON.stringify({store:store.storeName,count:result.meals.length,meals:result.meals.map(m=>({name:m.name,priceFen:m.price,items:m.items,image:!!m.image})),failures:result.failures},null,2));
 await writeFile(new URL('../.local/live-meals.json',import.meta.url),JSON.stringify({store,...result},null,2));
 const rechecked=await service.quote(result.meals[0],store);console.log(JSON.stringify({recheck:true,before:result.meals[0].price,after:rechecked.price}));
 if(result.meals.length<2)throw new Error('真实候选不足两项');
}catch(e){console.error(e.message);process.exitCode=1}finally{client.disconnect();token='';}
