import cors from "@fastify/cors";
import { queryClient } from "@resource-verification/database";
import Fastify from "fastify";

export function buildServer() {
  const app = Fastify({ logger: true });

  app.register(cors, { origin: true });

  app.get("/health", async (_request, reply) => {
    try {
      await queryClient`SELECT 1`;
      return reply.send({ status: "ok", database: "connected" });
    } catch (error) {
      app.log.error(error, "Health check database connectivity failed");
      return reply.status(503).send({ status: "error", database: "unreachable" });
    }
  });

  return app;
}
