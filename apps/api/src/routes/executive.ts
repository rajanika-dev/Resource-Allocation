import type { FastifyInstance } from "fastify";
import { getExecutiveSummary } from "../services/executiveService";
import { resolveWeekStart } from "../weekStart";

export async function executiveRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { weekStart?: string } }>("/api/executive/summary", async (request, reply) => {
    const weekStart = resolveWeekStart(request.query.weekStart);
    const response = await getExecutiveSummary(weekStart);
    return reply.send(response);
  });
}
