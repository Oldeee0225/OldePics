import { useEffect, useState } from 'react'

// Caché mínima en memoria: evita parpadeos al volver a una página ya visitada.
const cache = new Map<string, unknown>()
const listeners = new Set<() => void>()

/** Vacía la caché y recarga las consultas visibles (tras subir/editar/borrar). */
export function invalidateQueries() {
  cache.clear()
  listeners.forEach(l => l())
}

interface QueryState<T> { data: T | undefined; loading: boolean; error: Error | null }

export function useQuery<T>(key: string, fn: () => Promise<T>): QueryState<T> {
  const [state, setState] = useState<QueryState<T>>(() => ({
    data: cache.get(key) as T | undefined,
    loading: !cache.has(key),
    error: null,
  }))
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const refresh = () => setVersion(v => v + 1)
    listeners.add(refresh)
    return () => { listeners.delete(refresh) }
  }, [])

  useEffect(() => {
    let alive = true
    if (cache.has(key)) {
      setState({ data: cache.get(key) as T, loading: false, error: null })
      return
    }
    setState(s => ({ ...s, loading: true, error: null }))
    fn()
      .then(data => { cache.set(key, data); if (alive) setState({ data, loading: false, error: null }) })
      .catch(error => { if (alive) setState({ data: undefined, loading: false, error }) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version])

  return state
}
