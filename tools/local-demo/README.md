# Local development services

Set `CODEXSUN_LOCAL_DEMO=true` in the root `.env`, then run `npm.cmd run dev`.
Startup waits for five isolated Docker services to pass their health checks.
Chat connects automatically when opened from the local development web app.

| Service | Local URL |
| --- | --- |
| Platform web | http://127.0.0.1:5173 |
| Zetro web | http://127.0.0.1:5175 |
| Zetro API | http://127.0.0.1:4150 |
| Chat API | http://127.0.0.1:9051 |
| Image agent | http://127.0.0.1:4211 |
| Article agent | http://127.0.0.1:4212 |
| Sales coach agent | http://127.0.0.1:4213 |
| Social agent | http://127.0.0.1:4214 |

These services simulate replies. They do not use an LLM or contact real users.
The public development token `local-demo-only` is valid only for these services.
Each service stores its data in a separate Docker volume. Restarts preserve data.
Zetro also keeps workspace conversation history in browser storage.

Stop the services with `docker compose -f tools/local-demo/compose.json down`.
This command preserves the data volumes. To use real services later, set
`CODEXSUN_LOCAL_DEMO=false`, configure the normal agent registry and provider
credentials, and restart development. Production builds cannot auto-connect
Chat through the development flag.
