/* global fetch, AbortSignal */
// Same-origin mobile preview. Never serves workspace source or admin endpoints.
import http from 'node:http';
import { URL } from 'node:url';
import console from 'node:console';
import { Buffer } from 'node:buffer';
const pronunciations = new Map();
async function wiktionaryPronunciation(word) {
 const response = await fetch('https://en.wiktionary.org/w/api.php?action=parse&prop=wikitext&format=json&page='+encodeURIComponent(word), {signal:AbortSignal.timeout(2500)});
 const data = await response.json();
 const text = data.parse?.wikitext?.['*'] ?? '';
 const files = [...text.matchAll(/\{\{audio\|en\|([^|}]+)/gi)].map(m=>m[1].trim());
 const file = files.find(f=>/^en[-_][a-z'-]+\.ogg$/i.test(f));
 if(!file) return [{phonetics:[]}];
 const info = await fetch('https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url&format=json&titles='+encodeURIComponent('File:'+file), {signal:AbortSignal.timeout(2500)});
 const json = await info.json();
 const page = Object.values(json.query?.pages ?? {})[0];
 const media = page?.imageinfo?.[0];
 return [{phonetics:media ? [{audio:media.url,sourceUrl:'https://commons.wikimedia.org/w/index.php?curid='+page.pageid}] : []}];
}
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve('apps/mobile/dist');
const mime = {'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.ico':'image/x-icon','.ttf':'font/ttf','.woff2':'font/woff2','.wav':'audio/wav'};
http.createServer(async (req,res)=>{
 try {
  const path = new URL(req.url,'http://localhost').pathname;
  if(path.startsWith('/pronunciation/')) {
   if(req.method !== 'GET' && req.method !== 'HEAD'){res.writeHead(405);res.end();return;}
   const commons = path.match(/^\/pronunciation\/commons\/([0-9]{1,12})$/);
   if(commons) {
    let cached = pronunciations.get(path);
    if(!cached) {
     const info = await fetch('https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url&format=json&pageids='+commons[1], {signal:AbortSignal.timeout(6000)});
     if(!info.ok) throw new Error('source unavailable');
     const json = await info.json();
     const mediaUrl = json.query?.pages?.[commons[1]]?.imageinfo?.[0]?.url;
     if(!mediaUrl || new URL(mediaUrl).hostname !== 'upload.wikimedia.org' || !/\.(ogg|mp3|wav)(\?|$)/i.test(mediaUrl)) {res.writeHead(404);res.end();return;}
     const media = await fetch(mediaUrl, {signal:AbortSignal.timeout(10000)});
     if(!media.ok) throw new Error('audio unavailable');
     const bytes = Buffer.from(await media.arrayBuffer());
     if(bytes.length > 2_000_000) throw new Error('audio too large');
     cached = {bytes,type:media.headers.get('content-type') || 'audio/ogg'};
     if(pronunciations.size >= 200) pronunciations.delete(pronunciations.keys().next().value);
     pronunciations.set(path,cached);
    }
    res.writeHead(200,{'Content-Type':cached.type,'Cache-Control':'public, max-age=86400','X-Content-Type-Options':'nosniff'});res.end(req.method === 'HEAD' ? undefined : cached.bytes);return;
   }
   const match = path.match(/^\/pronunciation\/(lookup|audio)\/([a-zA-Z%0-9' -]+(?:\.mp3)?)$/);
   const value = match ? decodeURIComponent(match[2]) : '';
   if(!match || !/^[a-zA-Z' -]{1,80}(?:\.mp3)?$/.test(value)){res.writeHead(404);res.end();return;}
   const isAudio = match[1] === 'audio';
   if(isAudio && !/^[a-zA-Z'-]+\.mp3$/.test(value)){res.writeHead(404);res.end();return;}
   const endpoint = isAudio ? 'media/pronunciations/en/' : 'api/v2/entries/en/';
   let cached = pronunciations.get(path);
   if(!cached) {
    let bytes;
    try {
     const response = await fetch('https://api.dictionaryapi.dev/'+endpoint+encodeURIComponent(value), {signal:AbortSignal.timeout(isAudio ? 6000 : 2500)});
     if(!response.ok) throw new Error('dictionary unavailable');
     bytes = Buffer.from(await response.arrayBuffer());
    } catch(error) {
     if(isAudio) throw error;
     bytes = Buffer.from(JSON.stringify(await wiktionaryPronunciation(value)));
    }
    if(bytes.length > 2_000_000){res.writeHead(502);res.end();return;}
    cached = {bytes, type:isAudio ? 'audio/mpeg' : 'application/json'};
    if(pronunciations.size >= 200) pronunciations.delete(pronunciations.keys().next().value);
    pronunciations.set(path,cached);
   }
   res.writeHead(200,{'Content-Type':cached.type,'Cache-Control':'public, max-age=86400','X-Content-Type-Options':'nosniff'});
   res.end(req.method === 'HEAD' ? undefined : cached.bytes);return;
  }
  if(path.startsWith('/api/')) {
   const upstreamPath=path.slice(4)+new URL(req.url,'http://localhost').search;
   if(path.includes('%')){res.writeHead(404);res.end();return;}
   if(!/^\/(auth|learning|progress|level-test|audio|health)(\/|\?|$)/.test(upstreamPath)||!['GET','POST','HEAD'].includes(req.method)) {res.writeHead(404);res.end();return;}
   const headers={...req.headers,host:'127.0.0.1:3001'};delete headers.origin;delete headers['x-forwarded-for'];delete headers['x-forwarded-host'];
   const upstream=http.request({hostname:'127.0.0.1',port:3001,path:upstreamPath,method:req.method,headers},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res)});
   upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502,{'Content-Type':'application/json'});res.end(JSON.stringify({message:'서버 연결을 확인해 주세요.'}))});req.pipe(upstream);return;
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  const relative=decodeURIComponent(path).replace(/^\/+/, '');
  let file=resolve(root,relative||'index.html');
  if(!file.startsWith(root+sep)){res.writeHead(404);res.end();return;}
  try {if((await stat(file)).isDirectory())file=resolve(file,'index.html');}catch{file=extname(file)?file: file+'.html';}
  let data;try{data=await readFile(file)}catch{if(extname(path)){res.writeHead(404);res.end();return;}file=resolve(root,'index.html');data=await readFile(file);}
  res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);
 }catch{res.writeHead(502);res.end();}
}).listen(8090,'127.0.0.1',()=>console.log('Mobile preview on 127.0.0.1:8090'));
