# Local development services

This optional simulation is never started by `npm.cmd run dev`. Start it explicitly with `docker compose -f tools/local-demo/compose.json up -d --wait`.
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

Stop the optional simulation with `docker compose -f tools/local-demo/compose.json down`.
This command preserves the data volumes. Configure the normal agent registry and provider credentials before using real services. Production builds do not auto-connect to this simulation.
