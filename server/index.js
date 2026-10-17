import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import dotenv from 'dotenv';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {z} from 'zod';
import {input,analysis,answer,shape} from './schema.js';
import {chat as validatedChat} from './chat.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const envPath=path.join(root,'server/.env');
function key(){dotenv.config({path:envPath,override:process.env.NODE_ENV!=='production'});return process.env.SARVAM_API_KEY?.trim();}
const app=express();app.disable('x-powered-by');app.use(express.json({limit:'1mb'}));
app.use('/api',(req,res,next)=>{const origin=req.headers.origin;const allowed=['http://localhost:5173','http://127.0.0.1:5173','http://localhost:3001','http://127.0.0.1:3001',process.env.RENDER_EXTERNAL_URL,process.env.APP_ORIGIN].filter(Boolean);if(origin&&!allowed.includes(origin))return res.status(403).json({error:'Origin not allowed'});next();});
const route=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
async function sarvam(endpoint,data,headers={}){const token=key();if(!token){const e=new Error('Add SARVAM_API_KEY to E:\\sarvam\\server\\.env and save, then retry.');e.status=503;throw e;}return (await axios.post('https://api.sarvam.ai'+endpoint,data,{headers:{...headers,'api-subscription-key':token},timeout:120000,maxContentLength:20000000,maxBodyLength:15000000})).data;}
const chat=(system,payload,schema)=>validatedChat(sarvam,system,payload,schema);
app.get('/api/health',(req,res)=>res.json({ok:true,configured:!!key(),model:'sarvam-105b'}));
app.post('/api/analyze',route(async(req,res)=>{const {sql}=input.parse(req.body);res.json(await chat('You are a meticulous data lineage engineer. Analyze all supplied SQL views together, resolve view-to-view dependencies irrespective of definition order, CTEs, table aliases, column renames, joins, filters, aggregates and COALESCE input order. Never execute SQL. Include source nodes, transformation nodes and final view nodes with edges in data-flow direction. Deduplicate shared sources and connect views across statements. Give exact qualified source columns for each output; do not invent missing schemas or wildcard expansions. Explain uncertainty in warnings. Output precisely this shape (all fields required, arrays may be empty): '+JSON.stringify(shape),{sql},analysis));}));
app.post('/api/ask',route(async(req,res)=>{const body=input.extend({question:z.string().trim().min(1).max(2000),analysis:analysis}).parse(req.body);const result=await chat('Answer the question about this SQL and lineage. Trace upstream across all views when asked; discuss renames and COALESCE precedence accurately. Keep answer under 2000 characters. Return {"answer":"explanation","relatedNodeIds":["existing node ID"]}. Use only IDs in the provided analysis. Answer in English.',body,answer);const ids=new Set(body.analysis.nodes.map(n=>n.id));if(result.relatedNodeIds.some(id=>!ids.has(id)))throw Object.assign(new Error('Sarvam returned unknown node references. Please retry.'),{status:502});res.json(result);}));
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:10000000,files:1}});
app.post('/api/transcribe',upload.single('audio'),route(async(req,res)=>{if(!req.file)throw Object.assign(new Error('Audio file is required'),{status:400});const formats={'audio/webm':'webm','audio/ogg':'ogg','audio/mp4':'m4a','audio/wav':'wav'};const ext=formats[req.file.mimetype.split(';')[0]];if(!ext)throw Object.assign(new Error('Unsupported audio format'),{status:400});const form=new FormData();form.append('file',req.file.buffer,{filename:'question.'+ext,contentType:req.file.mimetype});form.append('model','saaras:v4');form.append('language_code','unknown');const result=await sarvam('/speech-to-text',form,form.getHeaders());res.json(z.object({transcript:z.string().min(1)}).parse(result));}));
app.post('/api/speak',route(async(req,res)=>{const {text}=z.object({text:z.string().trim().min(1).max(2500)}).parse(req.body);const result=await sarvam('/text-to-speech',{text,model:'bulbul:v3',language_code:'en-IN',speaker:'shubh',output_audio_codec:'wav'});res.json(z.object({audios:z.array(z.string().min(1)).min(1)}).parse(result));}));
app.use(express.static(path.join(root,'dist')));app.get('*',(req,res)=>res.sendFile(path.join(root,'dist/index.html')));
app.use((err,req,res,next)=>{const status=err instanceof z.ZodError?400:err instanceof multer.MulterError?413:err.status|| (err.response?502:500);const message=err instanceof z.ZodError?'Invalid input or response structure. Check the SQL and try again.':err.response?`Sarvam API returned ${err.response.status}. Check your API key, model access, quota and request size.`:err.code==='ECONNABORTED'?'Sarvam timed out. Please retry.':err.message||'Request failed';res.status(status).json({error:message});});
key();const port=process.env.PORT||3001;const host=process.env.NODE_ENV==='production'?'0.0.0.0':'127.0.0.1';app.listen(port,host,()=>console.log(`SQL Whisperer listening on ${host}:${port}`));

