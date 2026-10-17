// Run against the running backend: node server/smoke.js
// Uses the bundled synthetic SQL and generated speech, not your microphone.
import axios from 'axios';
import FormData from 'form-data';
const base='http://127.0.0.1:3001/api';
const sql=`CREATE VIEW stitched AS SELECT c.id, COALESCE(c.email, l.email) AS primary_email FROM customers c LEFT JOIN legacy l ON c.id = l.id;
CREATE VIEW final_contacts AS SELECT id, primary_email AS contact_email FROM stitched;`;
async function run(){
const health=(await axios.get(base+'/health')).data;
console.log('Backend healthy; key configured:',health.configured);
const analysis=(await axios.post(base+'/analyze',{sql},{timeout:150000})).data;
console.log('Sarvam SQL analysis:',analysis.nodes.length,'nodes,',analysis.edges.length,'edges,',analysis.columns.length,'column mappings');
const answer=(await axios.post(base+'/ask',{sql,analysis,question:'Where does contact_email come from? Explain the coalesce precedence.'},{timeout:150000})).data;
console.log('Sarvam answer:',answer.answer,'Highlighted nodes:',answer.relatedNodeIds.length);
const speech=(await axios.post(base+'/speak',{text:'Where does the contact email come from?'},{timeout:150000})).data;
const wav=Buffer.from(speech.audios[0],'base64');
if(wav.length<44)throw new Error('Speech audio is empty');
console.log('Bulbul speech:',wav.length,'bytes');
const form=new FormData();form.append('audio',wav,{filename:'question.wav',contentType:'audio/wav'});
const transcript=(await axios.post(base+'/transcribe',form,{headers:form.getHeaders(),timeout:150000})).data;
console.log('Saaras transcription:',transcript.transcript);
console.log('All four live API checks passed.');
}
run().catch(e=>{console.error('Smoke check failed:',e.response?.data?.error||e.message);process.exitCode=1});
