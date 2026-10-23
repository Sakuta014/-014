import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const paths=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const entries=paths.filter(p=>!p.endsWith('.png')&&!p.endsWith('.webp')).map(path=>({path,mode:'100644',type:'blob',content:readFileSync(path,'utf8').replace(/\r\n/g,'\n')}));
process.stdout.write(JSON.stringify(entries));
