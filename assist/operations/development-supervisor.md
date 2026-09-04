# Development Supervisor

Run `npm.cmd run dev` for the full supervised stack. Services are independent: a Chat, Zetro, web, or application failure retries with backoff and does not stop Platform API or Identity. Only an explicit interrupt stops the full supervisor.

Use single-service scripts for focused work. Keep Vite hot reload disabled unless explicitly needed; service recovery is distinct from framework restart.
