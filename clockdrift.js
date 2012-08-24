#!/usr/bin/env node

/*!
 * clockdrift.js by Rich Trott, (c) 2012 Regents of University of California, MIT License
 */

var http = require("http"),
    https = require("https"),
    url = require("url"),
    before,
    tolerance,
    i,
    argvLength = process.argv.length;

function usage( errorMessage ) {
    if (errorMessage) {
        console.log("\nError: " + errorMessage + ".\n");
    }
    console.log("Usage: clockdrift.js tolerance url1 [url2 ...]");
    console.log("    tolerance: number of seconds a timestamp can be off without being reported");
    console.log("    url1 ...: URLs to inspect");
    console.log("\nExample: clockdrift.js 15 http://tycho.usno.navy.mil/ http://www.example.com/");
}

function checkTime( host ) {

    return function ( res ) {

        var clockTimestamp,
            diff;

        if (typeof res.headers.date !== "string") {
            console.log("No date header returned by " + host + ".");
            return;
        }

        clockTimestamp = new Date(res.headers.date).getTime();
        if (isNaN(clockTimestamp)) {
            console.log("Could not convert date header from " + host + " to timestamp. (Malformed?)");
            return;
        }

        diff = Math.round((clockTimestamp - before) / 1000);

        if (Math.abs(diff) > tolerance) {
            console.log("Clock at " + host + " is " + diff + "s off from local clock.");
        }
    };
}

function dispatchRequest( targetUrl ) {
    var reqObj = false,
        options,
        req;

    options = url.parse( targetUrl );
    options.method = "HEAD";

    switch (options.protocol) {
        case "http:":
            reqObj = http;
            break;
        case "https:":
            reqObj = https;
            break;
    }

    if ( reqObj ) {
        req = reqObj.request( options, checkTime( options.host ));
        req.on("error", function(e) {
            console.log("Error on " + options.host + ": " + e.message);
        });
        req.on("socket", function (socket) {
            socket.setTimeout(1000);
            socket.on("timeout", function() {
                console.log("Error: Timeout. Hanging up.");
                req.abort();
            });
        });
        req.end();
    } else {
        console.log("Could not determine protocol: " + options.protocol);
    }
}

if (argvLength < 4) {
    usage();
    return;
}

tolerance = parseInt(process.argv[2], 10);
if (isNaN(tolerance)) {
    usage("tolerance must be a number");
}

before = new Date().getTime();

for (i = 3; i<argvLength; i++) {
    dispatchRequest(process.argv[i]);
}