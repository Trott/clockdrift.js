#!/usr/bin/env node

/*!
 * clockdrift.js by Rich Trott, (c) 2012 Regents of University of California, MIT License
 */

var http = require('http')
var https = require('https')
var before
var tolerance
var i
var argvLength = process.argv.length

function usage (errorMessage) {
  if (errorMessage) {
    console.error('\nError: ' + errorMessage + '.\n')
  }
  console.error('Usage: clockdrift.js tolerance url1 [url2 ...]')
  console.error('    tolerance: number of seconds a timestamp can be off without being reported')
  console.error('    url1 ...: URLs to inspect')
  console.error('\nExample: clockdrift.js 15 http://tycho.usno.navy.mil/ http://www.example.com/')
}

function checkTime (host) {
  return function (res) {
    var clockTimestamp,
      diff

    if (typeof res.headers.date !== 'string') {
      console.error('No date header returned by ' + host + '.')
      process.exitCode = 1
      return
    }

    clockTimestamp = new Date(res.headers.date).getTime()
    if (isNaN(clockTimestamp)) {
      console.error('Could not convert date header from ' + host + ' to timestamp. (Malformed?)')
      process.exitCode = 1
      return
    }

    diff = Math.round((clockTimestamp - before) / 1000)

    if (Math.abs(diff) > tolerance) {
      console.log('Clock at ' + host + ' is ' + diff + 's off from local clock.')
    }
  }
}

function dispatchRequest (targetUrl) {
  var reqObj = false
  var options
  var req

  options = new URL(targetUrl)
  options.method = 'HEAD'

  switch (options.protocol) {
    case 'http:':
      reqObj = http
      break
    case 'https:':
      reqObj = https
      options.rejectUnauthorized = false
      break
  }

  if (reqObj) {
    req = reqObj.request(options, checkTime(options.host))
    req.on('error', function (e) {
      console.error('Error on ' + options.host + ': ' + e.message)
      process.exitCode = 1
    })
    req.on('socket', function (socket) {
      socket.setTimeout(1000)
      socket.on('timeout', function () {
        console.error('Socket timeout; hanging up.')
        process.exitCode = 1
        req.abort()
      })
    })
    req.end()
  } else {
    console.error('Could not determine protocol: ' + options.protocol)
    process.exitCode = 1
  }
}

if (argvLength < 4) {
  usage()
  process.exit(1)
}

tolerance = parseInt(process.argv[2], 10)
if (isNaN(tolerance)) {
  usage('tolerance must be a number')
  process.exit(1)
}

before = new Date().getTime()

for (i = 3; i < argvLength; i++) {
  dispatchRequest(process.argv[i])
}
