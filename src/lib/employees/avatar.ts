export function avatarHue(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return hash % 360
}

export function avatarStyle(seed: string): { background: string; color: string } {
  return {
    background: `hsl(${avatarHue(seed)} 42% 38%)`,
    color: '#fff',
  }
}
