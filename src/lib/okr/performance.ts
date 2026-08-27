import { apiFetch } from "@/lib/apiClient";
import {
  mapEmployeeOkrPayload,
  type OkrEmployeePayload,
  type OkrWindowData,
} from "./reference";

export type EmployeeOkrLookup = {
  employeeId: number;
  quarter?: string;
};

export async function fetchEmployeeOkrs(
  lookup: EmployeeOkrLookup,
): Promise<OkrWindowData> {
  const params = new URLSearchParams({
    employeeId: String(lookup.employeeId),
  });
  if (lookup.quarter) params.set("quarter", lookup.quarter);

  const payload = await apiFetch<OkrEmployeePayload>(
    `/api/platform/okr/employee-krs?${params}`,
  );
  return mapEmployeeOkrPayload(payload);
}
