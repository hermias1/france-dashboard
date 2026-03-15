import { useQuery } from '@tanstack/react-query'
import { fetchJson } from '../lib/api'

export function useApi<T>(key: string, path: string, enabled = true) {
  return useQuery<T>({
    queryKey: [key, path],
    queryFn: () => fetchJson<T>(path),
    enabled,
  })
}
