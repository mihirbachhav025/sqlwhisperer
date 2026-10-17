# Deploy on Render Free

1. Open https://dashboard.render.com/ and choose New > Blueprint.
2. Connect GitHub and select `mihirbachhav025/sqlwhisperer`.
3. Render reads `render.yaml`. Enter `SARVAM_API_KEY` when prompted, then deploy.
4. Open the HTTPS URL Render assigns after the deploy succeeds.

Do not upload `server/.env`. The same service serves the frontend and API. Free services sleep after inactivity; the first visit may take longer. Sarvam usage still consumes your API credits. This MVP has no sign-in: anyone with the deployed URL can use its AI features.

If using New > Web Service instead, select the repository and configure:

- Instance: Free
- Build: `npm ci --include=dev && npm run build`
- Start: `npm start`
- Environment: `NODE_ENV=production`, `NODE_VERSION=22`, `SARVAM_API_KEY=your_key`

Render supplies `PORT` and `RENDER_EXTERNAL_URL`. Set `APP_ORIGIN` to the exact HTTPS origin if adding a custom domain.
