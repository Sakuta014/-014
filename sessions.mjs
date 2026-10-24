import {randomBytes,createHash} from 'node:crypto';
export class VisitorSessions{
 constructor({verify,ttl=30*60000,now=Date.now}){this.verify=verify;this.ttl=ttl;this.now=now;this.sessions=new Map();}
 id(req){return /(?:^|;\s*)mcd_session=([A-Za-z0-9_-]{40,50})(?:;|$)/.exec(req.headers.cookie||'')?.[1]||'';}
 sweep(){for(const [id,value] of this.sessions)if(value.expiresAt<=this.now())this.sessions.delete(id);}
 get(req){this.sweep();return this.sessions.get(this.id(req))||null;}
 status(req){const value=this.get(req);return {connected:!!value,expiresAt:value?.expiresAt||null};}
 async connect(input){const token=String(input||'').trim().replace(/^Bearer\s+/i,'');if(!/^[A-Za-z0-9._~-]{16,512}$/.test(token))throw Error('请填写有效的个人 Token');await this.verify(token);this.sweep();if(this.sessions.size>=1000)throw Error('当前连接较多，请稍后重试');const id=randomBytes(32).toString('base64url'),value={token,key:createHash('sha256').update(token).digest('hex'),expiresAt:this.now()+this.ttl};this.sessions.set(id,value);return {id,expiresAt:value.expiresAt};}
 disconnect(req){this.sessions.delete(this.id(req));}
 activeKeys(){this.sweep();return new Set([...this.sessions.values()].map(v=>v.key));}
}
