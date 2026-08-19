import type { FastifyInstance } from "fastify";
import { getEmployeeWeek } from "../services/employeeWeekService";
import { getManagerExceptions } from "../services/managerService";
import { resolveWeekStart } from "../weekStart";

export async function managerRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { weekStart?: string; analysisStatus?: string; reviewStatus?: string } }>(
    "/api/manager/exceptions",
    async (request, reply) => {
      const weekStart = resolveWeekStart(request.query.weekStart);
      const response = await getManagerExceptions(weekStart, {
        analysisStatus: request.query.analysisStatus,
        reviewStatus: request.query.reviewStatus,
      });
      return reply.send(response);
    },
  );

  // Reuses the Employee Week service/response rather than duplicating logic (Task 4 section 12).
  app.get<{ Params: { personId: string }; Querystring: { weekStart?: string } }>(
    "/api/manager/people/:personId/week",
    async (request, reply) => {
      const weekStart = resolveWeekStart(request.query.weekStart);
      const response = await getEmployeeWeek(request.params.personId, weekStart);
      return reply.send(response);
    },
  );
}
