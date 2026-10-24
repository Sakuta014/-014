export function sameOrigin(host,origin,publicOrigin=process.env.PUBLIC_ORIGIN||'http://127.0.0.1:5178'){
 try{const expected=new URL(publicOrigin);return host===expected.host&&origin===expected.origin;}catch{return false;}
}
