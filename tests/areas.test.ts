import { test } from 'node:test'
import assert from 'node:assert/strict'
import { groupAreas, areaState, missingNeeds, dependants, type Area, type BizArea } from '../src/lib/areas.ts'

const A = (code: string, o: Partial<Area> = {}): Area => ({ code, name: code, grp: 'G', summary: '', jobs: [], requires: [], feeds: [], status: 'live', core: false, odoo: null, zoho: null, sort: 1, ...o })
const all = [A('knowledge', { core: true }), A('crm'), A('invoicing', { requires: ['crm'] }), A('payroll', { status: 'planned', requires: ['people'] })]
const on = (c: string, state: 'on' | 'wanted' = 'on', active = true): BizArea => ({ area_code: c, state, active })

test('core areas are always core', () => assert.equal(areaState(all[0], []), 'core'))
test('off when absent or inactive', () => { assert.equal(areaState(all[1], []), 'off'); assert.equal(areaState(all[1], [on('crm', 'on', false)]), 'off') })
test('wanted is kept for planned areas', () => assert.equal(areaState(all[3], [on('payroll', 'wanted')]), 'wanted'))
test('missing needs lists what is not on', () => { assert.deepEqual(missingNeeds(all[2], [], all), ['crm']); assert.deepEqual(missingNeeds(all[2], [on('crm')], all), []) })
test('dependants name areas that still need this one', () => assert.deepEqual(dependants(all[1], [on('crm'), on('invoicing')], all), ['invoicing']))
test('groups keep order by sort', () => assert.equal(groupAreas([A('b', { sort: 2, grp: 'X' }), A('a', { sort: 1, grp: 'Y' })])[0][0], 'Y'))
