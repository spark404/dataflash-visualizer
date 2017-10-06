'use strict';

exports.handler = function(event, context, callback) {
	const AWS = require("aws-sdk");
	const Q = require('kew');
	const docClient = new AWS.DynamoDB.DocumentClient();
	const util = require('util')
	const dataflashlog = require('dataflashlog')
	const s3 = new AWS.S3({ apiVersion: '2006-03-01' });

    function getS3Object(bucket, key) {
        console.log("Entering getS3Object with bucket=" + bucket + " and key=" + key)
        
        const defer = Q.defer();
        const params = {
            Bucket: bucket,
            Key: key,
        };
        s3.getObject(params, function(err, data) {
            if (err) {
                console.log("Error: " + err)
                defer.reject()
            }

            console.log("File data : " + util.inspect(data))
            console.log("OK")
            defer.resolve(data)
        });
        
        console.log("Leaving getS3Object")
        return defer.promise
    }
    
    function parseDatafile(key, s3file) {
        console.log("Entering parseDatafile with key=" + key)
        const defer = Q.defer();

        dataflashlog.parse(s3file.Body, function(err, data) {
            if (err) {
                console.log("Error: " + err)
                defer.reject()
            }

            var gpsData = []
            var currentMode = 0
            data.messages.forEach(function(event) {
            	switch(event.name) {
            	case "MODE":
            	    currentMode = event.ModeNum
            	    break;
                case "GPS":
                	var gpsPoint = {}
                	gpsPoint.lng = event.Lng / 1e7
                	gpsPoint.lat = event.Lat / 1e7
                	gpsPoint.alt = event.Alt
                	gpsPoint.nsats = event.NSats
                    gpsPoint.hdop = event.HDop
                    gpsPoint.spd = event.Spd
                    gpsPoint.flightMode = currentMode
                	gpsData.push(gpsPoint)
                	break;
                }
            })
            
            console.log("Contents " + util.inspect(gpsData))
            defer.resolve(gpsData)
        })

        console.log("Leaving parseDatafile")
        return defer.promise
    }

	function response(data, statuscode) {
	    console.log("Entering response")
	    
	    if (data === undefined) {
	        var errorMessage = {}
	        errorMessage.message = "No entry found in database"
	    
    	    const response = {
        		statusCode: 404,
    		    body: JSON.stringify(errorMessage),
    		  };
    		
    		callback(null, response)
	    } else {
    	    const response = {
        		statusCode: statuscode,
	    		headers: {
        		    "Access-Control-Allow-Origin": "*"
        		},
    		    body: JSON.stringify(data),
    		  };
    		
    		callback(null, response)
	    }
	} 

    console.log("*** MAIN ***")
    console.log("event: " + util.inspect(event))
    console.log("context: " + util.inspect(context))
	getS3Object("dataflashlogs", event.pathParameters.reportid)
		.then(data => parseDatafile(event.pathParameters.reportid, data))
		.then(data => response(data, 200))
		.fail(err => response(err, 500))
}