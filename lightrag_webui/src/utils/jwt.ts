export type JwtPayload = {
  sub?: string
  role?: string
  exp?: number
  [key: string]: unknown
}

const decodeBase64Url = (input: string): string => {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
  return atob(padded)
}

export const parseJwtPayload = (token: string): JwtPayload => {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return {}
    const payloadJson = decodeBase64Url(parts[1])
    const payload = JSON.parse(payloadJson)
    return typeof payload === 'object' && payload !== null ? payload : {}
  } catch {
    return {}
  }
}

export const isJwtExpired = (token: string, clockSkewSeconds: number = 30): boolean => {
  const payload = parseJwtPayload(token)
  if (typeof payload.exp !== 'number') return false
  const nowSeconds = Math.floor(Date.now() / 1000)
  return payload.exp <= nowSeconds + clockSkewSeconds
}

