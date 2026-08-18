/** Shape of a single row in demo-data/allocations.json (fake "Planned Allocation source"). */
export interface RawAllocation {
  employeeEmail: string;
  projectCode: string;
  allocationPercent: number;
  validFrom: string;
  validTo: string | null;
  week: string;
}
