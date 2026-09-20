import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import {
  mapEmployeeOkrPayload,
  type OkrEmployeePayload,
  type OkrWindowData,
} from "./reference";

export type OkrConnection = {
  configured: boolean;
};

export async function fetchOkrConnection(): Promise<OkrConnection> {
  return apiFetch<OkrConnection>("/api/platform/okr/status");
}

/** Whether the OKR API key is set. `configured` stays null until the check finishes. */
export function useOkrConnection(enabled = true) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setConfigured(null);
    setFailed(false);
    fetchOkrConnection()
      .then((status) => {
        if (!cancelled) setConfigured(status.configured);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return {
    configured: enabled ? configured : null,
    ready: enabled && configured !== null,
    failed: enabled && failed,
  };
}

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
