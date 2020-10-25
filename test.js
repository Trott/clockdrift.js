'use strict'

const assert = require('assert')
const { spawnSync } = require('child_process')

const usage =
  'Usage: clockdrift.js tolerance url1 [url2 ...]\n' +
  '    tolerance: number of seconds a timestamp can be off without being reported\n' +
  '    url1 ...: URLs to inspect\n' +
  '\n' +
  'Example: clockdrift.js 15 http://tycho.usno.navy.mil/ http://www.example.com/\n'

const run = (args) => {
  return spawnSync('./clockdrift.js', args, { encoding: 'utf8' })
}

{
  // Using no arguments should return the usage message.
  const ret = run([])
  assert.strictEqual(ret.stdout, '')
  assert.strictEqual(ret.stderr, usage)
  assert.strictEqual(ret.status, 1)
  assert.strictEqual(ret.signal, null)
}

{
  // The tolerance argument must be a number.
  const ret = run(['fhqwhgads', 'https://www.example.com/'])
  assert.strictEqual(ret.stdout, '')
  assert.strictEqual(ret.stderr, '\nError: tolerance must be a number.\n\n' + usage)
  assert.strictEqual(ret.status, 1)
  assert.strictEqual(ret.signal, null)
}

{
  // Invalid hostnames.
  const ret1 = run(['42', 'http://fhqwhgads.invalid/'])
  const ret2 = run(['42', 'https://fhqwhgads.invalid/'])
  ;
  [ret1, ret2].forEach((ret) => {
    assert.strictEqual(ret.stdout, '')
    assert.ok(ret.stderr.startsWith('Error on fhqwhgads.invalid: getaddrinfo '), ret.stderr)
    assert.strictEqual(ret.status, 1)
    assert.strictEqual(ret.signal, null)
  })
}
