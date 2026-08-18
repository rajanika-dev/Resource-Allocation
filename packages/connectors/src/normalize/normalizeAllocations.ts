import type { ResourceSignal } from "@resource-verification/shared";
import { type IdentityMaps, resolvePersonIdByEmail, resolveProjectIdByName } from "../identity";
import { resolveProjectNameFromCode } from "../projectCodes";
import type { RawAllocation } from "../types/rawAllocation";

/** RawAllocation[] -> ResourceSignal[]. Translation only, no inference. */
export function normalizeAllocations(raw: RawAllocation[], maps: IdentityMaps): ResourceSignal[] {
  return raw.map((allocation) => {
    const personId = resolvePersonIdByEmail(allocation.employeeEmail, maps);
    const projectName = resolveProjectNameFromCode(allocation.projectCode);
    const projectId = resolveProjectIdByName(projectName, maps);

    return {
      personId,
      projectId,
      source: "allocation",
      signalType: "declared_allocation",
      quantity: allocation.allocationPercent,
      weekStart: allocation.week,
      evidence: {
        employeeEmail: allocation.employeeEmail,
        projectCode: allocation.projectCode,
        allocationPercent: allocation.allocationPercent,
        validFrom: allocation.validFrom,
        validTo: allocation.validTo,
      },
    };
  });
}
