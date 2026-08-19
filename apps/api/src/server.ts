import cors from "@fastify/cors";
import { queryClient } from "@resource-verification/database";
import Fastify, { type FastifyError } from "fastify";
import { ApiError, isDatabaseUnavailableError } from "./errors";
import { employeeRoutes } from "./routes/employee";
import { executiveRoutes } from "./routes/executive";
import { managerRoutes } from "./routes/manager";
import { syncRoutes } from "./routes/sync";

export function buildServer(options: { logger?: boolean } = {}) {
  const app = Fastify({ logger: options.logger ?? process.env.NODE_ENV !== "test" });

  app.register(cors, { origin: true });

  app.setErrorHandler((error: FastifyError, _request, reply) => {
    if (error instanceof ApiError) {
      return reply.status(error.statusCode).send({ error: error.message });
    }
    if (isDatabaseUnavailableError(error)) {
      return reply.status(503).send({ error: "Database is unavailable. Please try again shortly." });
    }
    // Preserve Fastify's own 4xx errors (e.g. malformed JSON body) instead of masking them as 500.
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (typeof statusCode === "number" && statusCode >= 400 && statusCode < 500) {
      return reply.status(statusCode).send({ error: error.message });
    }
    app.log.error(error);
    return reply.status(500).send({ error: "Internal server error" });
  });

  app.get("/health", async (_request, reply) => {
    try {
      await queryClient`SELECT 1`;
      return reply.send({ status: "ok", database: "connected" });
    } catch (error) {
      app.log.error(error, "Health check database connectivity failed");
      return reply.status(503).send({ status: "error", database: "unreachable" });
    }
  });

  app.register(syncRoutes);
  app.register(employeeRoutes);
  app.register(managerRoutes);
  app.register(executiveRoutes);

  return app;
}
