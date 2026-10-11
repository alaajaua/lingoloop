// @ts-nocheck
import { Buffer } from "node:buffer";
function externalFetch(url, options={}) {return fetch(url, {...options, headers:{"User-Agent":"LingoLoop/1.0 (https://lingoloop-hp-cards.sone8056.chatgpt.site)"}});}
const pronunciations = new Map();
async function wiktionaryPronunciation(word) {
 const response = await externalFetch('https://en.wiktionary.org/w/api.php?action=parse&prop=wikitext&format=json&page='+encodeURIComponent(word), {signal:AbortSignal.timeout(2500)});
 const data = await response.json();
 const text = data.parse?.wikitext?.['*'] ?? '';
 const files = [...text.matchAll(/\{\{audio\|en\|([^|}]+)/gi)].map(m=>m[1].trim());
 const file = files.find(f=>/^en[-_][a-z'-]+\.ogg$/i.test(f));
 if(!file) return [{phonetics:[]}];
 const info = await externalFetch('https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url&format=json&titles='+encodeURIComponent('File:'+file), {signal:AbortSignal.timeout(2500)});
 const json = await info.json();
 const page = Object.values(json.query?.pages ?? {})[0];
 const media = page?.imageinfo?.[0];
 return [{phonetics:media ? [{audio:media.url,sourceUrl:'https://commons.wikimedia.org/w/index.php?curid='+page.pageid}] : []}];
}

export async function GET(request: Request) {
 let status=200, headers={}, result:Response|undefined;
 const req={method:request.method};
 const res={writeHead:(s,h={})=>{status=s;headers=h},end:(body)=>{result=new Response(body,{status,headers})}};
 const path=new URL(request.url).pathname;
 try { await (async()=>{
  if(path.startsWith('/pronunciation/')) {
   if(req.method !== 'GET' && req.method !== 'HEAD'){res.writeHead(405);res.end();return;}
   const commons = path.match(/^\/pronunciation\/commons\/([0-9]{1,12})$/);
   if(commons) {
    let cached = pronunciations.get(path);
    if(!cached) {
     const info = await externalFetch('https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url&format=json&pageids='+commons[1], {signal:AbortSignal.timeout(6000)});
     if(!info.ok) throw new Error('source unavailable '+info.status);
     const json = await info.json();
     const mediaUrl = json.query?.pages?.[commons[1]]?.imageinfo?.[0]?.url;
     if(!mediaUrl || new URL(mediaUrl).hostname !== 'upload.wikimedia.org' || !/\.(ogg|mp3|wav)(\?|$)/i.test(mediaUrl)) {res.writeHead(404);res.end();return;}
     const media = await externalFetch(mediaUrl, {signal:AbortSignal.timeout(10000)});
     if(!media.ok) throw new Error('audio unavailable');
     const bytes = Buffer.from(await media.arrayBuffer());
     if(bytes.length > 2_000_000) throw new Error('audio too large');
     cached = {bytes,type:media.headers.get('content-type') || 'audio/ogg'};
     if(pronunciations.size >= 20) pronunciations.delete(pronunciations.keys().next().value);
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
     const response = await externalFetch('https://api.dictionaryapi.dev/'+endpoint+encodeURIComponent(value), {signal:AbortSignal.timeout(isAudio ? 6000 : 2500)});
     if(!response.ok) throw new Error('dictionary unavailable');
     bytes = Buffer.from(await response.arrayBuffer());
    } catch(error) {
     if(isAudio) throw error;
     bytes = Buffer.from(JSON.stringify(await wiktionaryPronunciation(value)));
    }
    if(bytes.length > 2_000_000){res.writeHead(502);res.end();return;}
    cached = {bytes, type:isAudio ? 'audio/mpeg' : 'application/json'};
    if(pronunciations.size >= 20) pronunciations.delete(pronunciations.keys().next().value);
    pronunciations.set(path,cached);
   }
   res.writeHead(200,{'Content-Type':cached.type,'Cache-Control':'public, max-age=86400','X-Content-Type-Options':'nosniff'});
   res.end(req.method === 'HEAD' ? undefined : cached.bytes);return;
  }
 })(); }catch(error) {console.error("Pronunciation request failed", error instanceof Error ? error.message : "unknown");return new Response("음성 연결을 확인해 주세요.",{status:502});}
 return result ?? new Response("Not found",{status:404});
}
export const HEAD=GET;
