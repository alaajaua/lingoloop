import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {config} from 'dotenv';
import {PrismaClient} from '@prisma/client';
import {contentSchema} from '../apps/api/src/content/content.schema';
import {ContentService} from '../apps/api/src/content/content.service';
import {AUDIO_ROOT,bundledAudioExists} from '../apps/api/src/content/audio';
config({path:'.env.test',override:true,quiet:true});
const payload=(audioUrl:string)=>({lemma:'audio-test',displayWord:'audio-test',partOfSpeech:'noun',difficulty:1,meanings:[{meaningKo:'테스트',examples:[{sentenceEn:'An apple.',sentenceKo:'사과 하나.',targetForm:'apple',explanation:'예시',difficulty:1,audioUrl}]}]});
test('bundled audio is restricted to existing named WAV files; publication rejects missing files',async()=>{
 assert.equal(new URL(process.env.DATABASE_URL!).pathname,'/lingoloop_test');
 const names=readdirSync(AUDIO_ROOT).filter(n=>n.endsWith('.wav'));assert.ok(names.length>=5);
 for(const name of names){assert.ok(bundledAudioExists('/audio/'+name));const b=readFileSync(resolve(AUDIO_ROOT,name));assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WAVE');assert.ok(b.length>1000);}
 for(const url of ['/audio/../secret.wav','http://example.com/test.wav','file:///secret.wav','//example.com/a.wav'])assert.equal(contentSchema.safeParse(payload(url)).success,false);
 const db=new PrismaClient();const svc=new ContentService(db);let id='';
 try{
 let w=await svc.create(payload('/audio/'+'0'.repeat(64)+'.wav'),'audio-test');id=w.id;
 w=await svc.transition(id,{status:'review',revision:w.revision},'audio-test');
 await assert.rejects(()=>svc.transition(id,{status:'published',revision:w.revision},'audio-test'));
 w=await svc.transition(id,{status:'draft',revision:w.revision},'audio-test');
 w=await svc.update(id,{...payload('/audio/'+names[0]),revision:w.revision},'audio-test');
 w=await svc.transition(id,{status:'review',revision:w.revision},'audio-test');
 w=await svc.transition(id,{status:'published',revision:w.revision},'audio-test');assert.equal(w.status,'published');
 }finally{if(id)await db.word.delete({where:{id}});await db.$disconnect();}
});
