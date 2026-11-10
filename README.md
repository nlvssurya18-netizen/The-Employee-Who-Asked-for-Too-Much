# Sentinel Research

Authorization-first enterprise research agent built with Next.js for local evaluation and Vercel deployment.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. The three scenario buttons load the supplied test inputs. `Run secure research` calls the server-side `/api/research` route. Candidate documents are scored, then authorization is evaluated before content is included in evidence synthesis. Denied matches appear only as metadata in the audit trail.

## Production

```bash
npm run build
npm start
```

The app is ready to import into Vercel. No environment variables are required for the local deterministic evaluator.
