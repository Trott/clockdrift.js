'use strict'

const assert = require('assert')
const { spawnSync, spawn } = require('child_process')
const http = require('http')

const usage =
  'Usage: clockdrift.js tolerance url1 [url2 ...]\n' +
  '    tolerance: number of seconds a timestamp can be off without being reported\n' +
  '    url1 ...: URLs to inspect\n' +
  '\n' +
  'Example: clockdrift.js 15 http://tycho.usno.navy.mil/ http://www.example.com/\n'

const runSync = (args) => {
  return spawnSync('./clockdrift.js', args, { encoding: 'utf8' })
}

const run = (args, cb) => {
  const subprocess = spawn('./clockdrift.js', args)
  subprocess.on('error', (err) => {
    assert.fail(err)
  })
  subprocess.on('exit', cb)
  return subprocess
}

{
  // Using no arguments should return the usage message.
  const ret = runSync([])
  assert.strictEqual(ret.stdout, '')
  assert.strictEqual(ret.stderr, usage)
  assert.strictEqual(ret.status, 1)
  assert.strictEqual(ret.signal, null)
}

{
  // The tolerance argument must be a number.
  const ret = runSync(['fhqwhgads', 'https://www.example.com/'])
  assert.strictEqual(ret.stdout, '')
  assert.strictEqual(ret.stderr, '\nError: tolerance must be a number.\n\n' + usage)
  assert.strictEqual(ret.status, 1)
  assert.strictEqual(ret.signal, null)
}

{
  // Invalid hostnames.
  const ret1 = runSync(['42', 'http://fhqwhgads.invalid/'])
  const ret2 = runSync(['42', 'https://fhqwhgads.invalid/'])
  ;
  [ret1, ret2].forEach((ret) => {
    assert.strictEqual(ret.stdout, '')
    assert.ok(ret.stderr.startsWith('Error on fhqwhgads.invalid: getaddrinfo '), ret.stderr)
    assert.strictEqual(ret.status, 1)
    assert.strictEqual(ret.signal, null)
  })
}

{
  // Unrecognized protocol.
  const ret = runSync(['1', 'fhqwhgads://'])
  assert.strictEqual(ret.stdout, '')
  assert.strictEqual(ret.stderr, 'Could not determine protocol: fhqwhgads:\n')
  assert.strictEqual(ret.status, 1)
  assert.strictEqual(ret.signal, null)
}

{
  // Start an http server on localhost and test the happy path.
  const server = http.createServer((req, res) => {
    res.end('fhqwhgads')
  })
  server.listen(0, '127.0.0.1', () => {
    const ret = run(
      ['1', `http://127.0.0.1:${server.address().port}/`],
      (code, signal) => {
        ret.stdout.on('data', assert.fail)
        ret.stderr.on('data', assert.fail)
        assert.strictEqual(code, 0)
        assert.strictEqual(signal, null)
        server.close()
      }
    )
  })
}

{
  // Test with http server that has an inaccurate Date header.
  const server = http.createServer((req, res) => {
    res.writeHead(200, {
      Date: new Date(Date.now() - 2000).toUTCString()
    })
    res.end('fhqwhgads')
  })
  server.listen(0, '127.0.0.1', () => {
    const port = server.address().port
    const ret = run(
      ['1', `http://127.0.0.1:${port}/`],
      (code, signal) => {
        ret.stderr.on(
          'data',
          (msg) => {
            const expected = `Clock at 127.0.0.1:${port} is -2s off from local clock.\n`
            assert.strictEqual(msg.toString(), expected)
          }
        )
        ret.stderr.on('data', assert.fail)
        assert.strictEqual(code, 0)
        assert.strictEqual(signal, null)
        server.close()
      }
    )
  })
}

{
  // Test with an http server that a malformed Date header.
  const server = http.createServer((req, res) => {
    res.setHeader('Date', 'fhqwhgads')
    res.end('fhqwhgads')
  })
  server.listen(0, '127.0.0.1', () => {
    const port = server.address().port
    const ret = run(
      ['1', `http://127.0.0.1:${port}/`],
      (code, signal) => {
        ret.stdout.on('data', assert.fail)
        ret.stderr.on(
          'data',
          (msg) => {
            const expected = `Could not convert date header from 127.0.0.1:${port} to timestamp. (Malformed?)\n`
            assert.strictEqual(msg.toString(), expected)
          }
        )
        assert.strictEqual(code, 1)
        assert.strictEqual(signal, null)
        server.close()
      }
    )
  })
}

{
  // Test with a broken http server that does not send a Date header.
  const server = http.createServer((req, res) => {
    res.sendDate = false
    res.end('fhqwhgads')
  })
  server.listen(0, '127.0.0.1', () => {
    const port = server.address().port
    const ret = run(
      ['1', `http://127.0.0.1:${port}/`],
      (code, signal) => {
        ret.stdout.on('data', assert.fail)
        ret.stderr.on(
          'data',
          (msg) => {
            const expected = `No date header returned by 127.0.0.1:${port}.\n`
            assert.strictEqual(msg.toString(), expected)
          }
        )
        assert.strictEqual(code, 1)
        assert.strictEqual(signal, null)
        server.close()
      }
    )
  })
}

{
  // Test with an http server that times out.
  const server = http.createServer()
  server.listen(0, '127.0.0.1', () => {
    const port = server.address().port
    const msgs = [
      'Socket timeout; hanging up.\n',
      `Error on 127.0.0.1:${port}: socket hang up\n`
    ]
    const ret = run(
      ['1', `http://127.0.0.1:${port}/`],
      (code, signal) => {
        ret.stdout.on('data', assert.fail)
        ret.stderr.on(
          'data',
          (msg) => {
            const expected = msgs.shift()
            assert.strictEqual(msg.toString(), expected)
          }
        )
        assert.strictEqual(code, 1)
        assert.strictEqual(signal, null)
        server.close()
      }
    )
  })
}
