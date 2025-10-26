// Minimal manual mock for `next/navigation` used in tests
export function useRouter() {
  return { push: () => {} }
}
