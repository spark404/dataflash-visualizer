'use strict';

exports.handler = function(event, context, callback) {
	const AWS = require("aws-sdk");
	const Q = require('kew');
	const docClient = new AWS.DynamoDB.DocumentClient();
	const util = require('util')
	const dataflashlog = require('dataflashlog')
	const s3 = new AWS.S3({ apiVersion: '2006-03-01' });

    function getS3Object(bucket, key) {
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

            defer.resolve(data)
        });
        
        return defer.promise
    }
    
    function parseDatafile(key, s3file) {
        const defer = Q.defer();

        dataflashlog.parse(s3file.Body, function(err, data) {
            if (err) {
                console.log("Error: " + err)
                defer.reject()
            }

            var reference = data.referenceTimestamp
            var powerData = []
            data.messages.forEach(function(event) {
            	switch(event.name) {
                case "CURR":
                	var powerMeasurement = {}
                    powerMeasurement.timestamp = getTimestampForTimeUS(reference, event.TimeUS)
                	powerMeasurement.volt = event.Volt
                	powerMeasurement.curr = event.Curr
                	powerMeasurement.currtot = event.CurrTot
                	powerData.push(powerMeasurement)
                	break;
                }
            })
            
            defer.resolve(powerData)
        })

        return defer.promise
    }

	function response(data, statuscode) {
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

    function getTimestampForTimeUS(reference, tineus) {
        return reference.reference + ((tineus - reference.timeus) / 1000)
    } 

    console.log("*** MAIN ***")
    console.log("event: " + util.inspect(event))
    console.log("context: " + util.inspect(context))

	getS3Object("dataflashlogs", event.pathParameters.reportid)
		.then(data => parseDatafile(event.pathParameters.reportid, data))
		.then(data => response(data, 200))
		.fail(err => response(err, 500))
}