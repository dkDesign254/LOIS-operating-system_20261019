import test from 'node:test'
import assert from 'node:assert/strict'
import { analyze, blockedAiBots, blocksEveryone } from '../src/lib/scan.ts'
import { isPrivateIp, normaliseUrl } from '../src/lib/safe-fetch.ts'

const good = `<!doctype html><html lang="en"><head><title>Acme: brand strategy in Nairobi</title><meta name="description" content="Acme helps founders in Nairobi build clear brands, automate repeat work and make better decisions."><link rel="canonical" href="https://a.co/"><meta name="viewport" content="width=device-width"><meta property="og:title" content="x"><meta property="og:image" content="y"><script type="application/ld+json">{}</script></head><body><h1>Acme</h1><h2>One</h2><h2>Two</h2><p>${'word '.repeat(80)}</p><img src="a.png" alt="Team"><a href="/privacy">Privacy</a><a href="mailto:hi@a.co">Mail</a></body></html>`

test('a well-built page scores high and has few actions', () => {
  const r = analyze({ url: 'https://a.co/', status: 200, ms: 400, html: good }, { robots: 'User-agent: *\nAllow: /', sitemap: true, llms: true })
  assert.ok(r.scores.discovery >= 90 && r.scores.access >= 90 && r.scores.usability >= 90 && r.scores.trust === 100)
  assert.equal(r.actions.length, 0)
})
test('an empty page produces prioritised actions, highest impact first', () => {
  const r = analyze({ url: 'http://a.co/', status: 200, ms: 4000, html: '<html><body><div id="root"></div></body></html>' }, { robots: null, sitemap: false, llms: false })
  assert.ok(r.scores.access < 60)
  assert.ok(r.actions.length > 3)
  assert.ok(r.actions[0].impact >= r.actions[r.actions.length - 1].impact)
})
test('robots parsing finds blanket and AI-specific blocks', () => {
  assert.equal(blocksEveryone('User-agent: *\nDisallow: /'), true)
  assert.equal(blocksEveryone('User-agent: *\nDisallow: /admin'), false)
  assert.deepEqual(blockedAiBots('User-agent: GPTBot\nUser-agent: CCBot\nDisallow: /\n\nUser-agent: *\nAllow: /'), ['GPTBot', 'CCBot'])
})
test('private addresses and odd URLs are refused', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '192.168.0.4', '172.20.0.1', '169.254.169.254', '::1', 'fd00::1', '::ffff:10.0.0.1']) assert.equal(isPrivateIp(ip), true, ip)
  assert.equal(isPrivateIp('8.8.8.8'), false)
  assert.equal(normaliseUrl('http://localhost/x'), null)
  assert.equal(normaliseUrl('ftp://a.com'), null)
  assert.equal(normaliseUrl('https://a.com:8080'), null)
  assert.equal(normaliseUrl('user:pw@a.com')?.hostname ?? null, null)
  assert.equal(normaliseUrl('example.com')?.hostname, 'example.com')
})
