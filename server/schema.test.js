import test from 'node:test';
import assert from 'node:assert/strict';
import {analysis,input,answer} from './schema.js';
import {chat,parseCompletion,lineageJSONSchema} from './chat.js';
const fixture={summary:'test',warnings:[],nodes:[{id:'source',label:'customers',kind:'source',explanation:'Source',columns:['email']},{id:'view',label:'contacts',kind:'view',explanation:'Renamed email',columns:['primary_email']}],edges:[{id:'e1',source:'source',target:'view',label:'supplies'}],tables:[{name:'customers',alias:'c',view:'contacts'}],columns:[{view:'contacts',output:'primary_email',expression:'c.email',sources:['customers.email'],operation:'rename',nodeId:'view'}],joins:[],filters:[],aggregations:[]};
test('accepts a complete lineage response',()=>assert.equal(analysis.parse(fixture).nodes.length,2));
test('rejects edges pointing to missing nodes',()=>assert.equal(analysis.safeParse({...fixture,edges:[{...fixture.edges[0],source:'invented'}]}).success,false));
test('rejects duplicate node IDs',()=>assert.equal(analysis.safeParse({...fixture,nodes:[fixture.nodes[0],fixture.nodes[0]]}).success,false));
test('rejects invalid column node references',()=>assert.equal(analysis.safeParse({...fixture,columns:[{...fixture.columns[0],nodeId:'missing'}]}).success,false));
test('rejects missing fields and malformed types',()=>{assert.equal(analysis.safeParse({summary:'only'}).success,false);assert.equal(analysis.safeParse({...fixture,nodes:'oops'}).success,false)});
test('rejects blank and excessive input',()=>{assert.equal(input.safeParse({sql:'  '}).success,false);assert.equal(input.safeParse({sql:'x'.repeat(60001)}).success,false)});
test('limits speech answers and requires answer text',()=>{assert.equal(answer.safeParse({answer:'',relatedNodeIds:[]}).success,false);assert.equal(answer.safeParse({answer:'x'.repeat(2501),relatedNodeIds:[]}).success,false)});
test('accepts JSON fences but rejects incomplete data',()=>{
  assert.equal(parseCompletion({choices:[{message:{content:'```json\n'+JSON.stringify(fixture)+'\n```'}}]},analysis).nodes.length,2);
  assert.throws(()=>parseCompletion({choices:[{message:{content:'{"summary":"incomplete"}'}}]},analysis),/Required/);
  assert.throws(()=>parseCompletion({choices:[{finish_reason:'length',message:{content:'{}'}}]},analysis),/truncated/);
});
test('requests constrained JSON and retries invalid output on Sarvam',async()=>{
  let calls=0;
  const mock=async(url,body)=>{calls++;assert.equal(body.response_format.type,'json_schema');assert.equal(body.response_format.json_schema.strict,true);if(calls===2)assert.match(body.messages.at(-1).content,/Regenerate/);return{choices:[{message:{content:JSON.stringify(calls===1?{summary:'incomplete'}:fixture)}}]}};
  assert.equal((await chat(mock,'Analyze',{sql:'SELECT email FROM customers'},analysis)).nodes.length,2);
  assert.equal(calls,2);
  assert.deepEqual(lineageJSONSchema.properties.nodes.items.properties.kind.enum,['source','transformation','view']);
});
test('stops after two invalid responses without inventing lineage',async()=>{
  let calls=0;await assert.rejects(()=>chat(async()=>{calls++;return{choices:[{message:{content:'{}'}}]}},'Analyze',{sql:'SELECT 1'},analysis),/after an automatic retry/);assert.equal(calls,2);
});
