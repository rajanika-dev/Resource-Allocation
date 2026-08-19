import type { FastifyInstance } from "fastify";
import { ValidationError } from "../errors";
import { confirmEmployeeWeek, correctEmployeeWeek, type CorrectedAllocationInput } from "../services/employeeDecisionService";
import { getEmployeeWeek } from "../services/employeeWeekService";
import { resolveWeekStart } from "../weekStart";

export async function employeeRoutes(app: FastifyInstance) {
  app.get<{ Params: { personId: string }; Querystring: { weekStart?: string } }>(
    "/api/employees/:personId/week",
    async (request, reply) => {
      const weekStart = resolveWeekStart(request.query.weekStart);
      const response = await getEmployeeWeek(request.params.personId, weekStart);
      return reply.send(response);
    },
  );

  app.post<{ Params: { personId: string }; Body: { weekStart?: string; comment?: string } }>(
    "/api/employees/:personId/week/confirm",
    async (request, reply) => {
      const body = request.body ?? {};
      const weekStart = resolveWeekStart(body.weekStart);
      const response = await confirmEmployeeWeek(request.params.personId, weekStart, body.comment);
      return reply.send(response);
    },
  );

  app.post<{
    Params: { personId: string };
    Body: { weekStart?: string; allocations?: CorrectedAllocationInput[]; comment?: string };
  }>("/api/employees/:personId/week/correct", async (request, reply) => {
    const body = request.body ?? {};
    const weekStart = resolveWeekStart(body.weekStart);

    if (!Array.isArray(body.allocations)) {
      throw new ValidationError("allocations must be an array");
    }

    const response = await correctEmployeeWeek(request.params.personId, weekStart, body.allocations, body.comment);
    return reply.send(response);
  });
}
