// Business areas: the modules a business can switch on (like Odoo apps or Zoho products), matched to job functions.
export type Area = { code: string; name: string; grp: string; summary: string; jobs: string[]; requires: string[]; feeds: string[]; status: 'live' | 'beta' | 'planned'; core: boolean; odoo: string | null; zoho: string | null; sort: number }
export type BizArea = { area_code: string; state: 'on' | 'wanted'; active: boolean }

export function groupAreas(areas: Area[]): [string, Area[]][] {
  const m = new Map<string, Area[]>()
  for (const a of [...areas].sort((x, y) => x.sort - y.sort)) m.set(a.grp, [...(m.get(a.grp) ?? []), a])
  return [...m.entries()]
}
/** What a person sees for one area in one business. */
export function areaState(a: Area, mine: BizArea[]): 'core' | 'on' | 'wanted' | 'off' {
  if (a.core) return 'core'
  const r = mine.find((x) => x.area_code === a.code && x.active)
  return r ? r.state : 'off'
}
/** Areas that must be on first and are not yet. */
export function missingNeeds(a: Area, mine: BizArea[], all: Area[]): string[] {
  return a.requires.filter((c) => !mine.some((x) => x.area_code === c && x.active && x.state === 'on') && !all.find((y) => y.code === c)?.core)
}
/** Areas currently on that depend on this one. */
export function dependants(a: Area, mine: BizArea[], all: Area[]): string[] {
  return all.filter((y) => y.requires.includes(a.code) && mine.some((x) => x.area_code === y.code && x.active && x.state === 'on')).map((y) => y.name)
}
