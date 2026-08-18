import { buildServer } from "./server";
// Loading @resource-verification/database (via ./server) also loads the
// repo-root .env as a side effect, so API_PORT below is already set.

const port = Number(process.env.API_PORT ?? 3001);

const app = buildServer();

app
  .listen({ port, host: "0.0.0.0" })
  .catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
