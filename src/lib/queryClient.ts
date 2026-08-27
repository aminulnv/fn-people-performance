import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export const queryKeys = {
  notifications: (recipientId: string) =>
    ['notifications', recipientId] as const,
  employeeOkrs: (employeeId: number, quarter?: string) =>
    ['employee-okrs', employeeId, quarter ?? 'all'] as const,
  goals: ['goals'] as const,
  activity: (filters: Record<string, unknown>) =>
    ['activity', filters] as const,
}
