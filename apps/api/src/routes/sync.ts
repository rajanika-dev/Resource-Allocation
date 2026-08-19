import type { FastifyInstance } from "fastify";
import { runSync } from "../services/syncService";
import { resolveWeekStart } from "../weekStart";

export async function syncRoutes(app: FastifyInstance) {
  app.post<{ Body: { weekStart?: string } }>("/api/sync", async (request, reply) => {
    const weekStart = resolveWeekStart(request.body?.weekStart);
    const summary = await runSync(weekStart);
    return reply.send(summary);
  });
}
