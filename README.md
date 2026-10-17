# SQL Whisperer

Local React + Vite + Tailwind + React Flow application with an Express backend. All SQL interpretation, explanations, column mappings and lineage inference run on Sarvam infrastructure. No SQL is executed and there is no local inference or parser fallback.

## Start

1. Put your key in `server/.env`: `SARVAM_API_KEY=your_actual_key` (already created; do not put the key in frontend files).
2. Run `npm install` once.
3. Run `npm run dev` and open http://localhost:5173.

The backend rereads the key on each request, so saving the key does not require restarting. Backend listens only on 127.0.0.1:3001. `npm run build` creates the production frontend; `npm start` serves it at http://localhost:3001. Node 18.12+ is supported; a maintained Node LTS is recommended for future development.

## Use

Load the two-view sample or add tabs for your SQL. Include CREATE VIEW statements for explicit view names (tab labels only organize the editor). Click Analyze all views. All tabs are sent together to sarvam-105b. Click nodes or use the selector to inspect explanations and upstream/downstream dependencies. The Back button returns to previous inspected nodes. Columns shows source columns, output names, expressions and operations including COALESCE precedence as inferred by Sarvam. Operations lists joins, filters and aggregations. Download validated JSON using the JSON button.

Ask a typed question or record up to 25 seconds. Saaras v4 transcribes your question, sarvam-105b answers using SQL and the existing graph IDs, and Bulbul v3 speaks the answer. Related nodes are highlighted. Audio has playback controls if autoplay is blocked. Allow browser microphone access on localhost. Questions require current analysis; editing SQL requires reanalysis.

## Models and official API references

- `sarvam-105b`: https://docs.sarvam.ai/api/api-guides-tutorials/chat-completion/overview — POST /v1/chat/completions, Strict JSON Schema output, backend schema and referential integrity validation, and one Sarvam correction retry for invalid responses.
- `saaras:v4`: https://docs.sarvam.ai/api-reference/speech-to-text/transcribe — multipart POST /speech-to-text.
- `bulbul:v3`: https://docs.sarvam.ai/api-reference/text-to-speech/convert — POST /text-to-speech, WAV audio. English answers use en-IN.

## Limits and data handling

SQL is sent to Sarvam only when Analyze or Ask is used. Recorded audio and answer text are sent to Sarvam for speech processing. The app has no database connector or SQL execution route. SQL, graph and recording data are held in memory; refreshing clears the workspace. The key lives in backend `.env`, ignored by Git, and never enters the frontend bundle. This is a loopback-only local tool, not a public multi-user deployment.

AI lineage needs review. Unknown schemas, wildcards, dialect-specific expressions and dynamic SQL can be ambiguous; the model is asked to report warnings instead of inventing columns. Large analyses may exceed the 4096 output-token cap; reduce the number of views if prompted. Maximum SQL input is 60,000 characters and maximum graph is 150 nodes / 400 edges. Cross-view backtracking traverses Sarvam-returned graph edges; the client only lays out and navigates the returned data.

## Verification

`npm test` runs schema and graph-reference rejection tests. `npm run build` checks frontend compilation. Live integration tests require a valid Sarvam key with access and quota. Microphone permissions and actual playback require a browser/audio device.

