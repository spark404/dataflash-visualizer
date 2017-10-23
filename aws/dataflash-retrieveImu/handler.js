'use strict';

exports.handler = function(event, context, callback) {
	const AWS = require("aws-sdk");
	const Q = require('kew');
	const docClient = new AWS.DynamoDB.DocumentClient();
	const util = require('util')
	const dataflashlog = require('dataflashlog')
	const s3 = new AWS.S3({ apiVersion: '2006-03-01' });
    const ramerdouglas = require('./RamerDouglarPeuker.js')

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

            var allImuData = []
            for (var i = 0; i < 3; i++) {
                var imuData = {}
                imuData.rowcount = 0
                imuData.gyrx = []
                imuData.gyry = []
                imuData.gyrz = []
                imuData.accx = []
                imuData.accy = []
                imuData.accz = []
                allImuData.push(imuData)
            }

            var rowcount = 0
            data.messages.forEach(function(event) {
            	switch(event.name) {
                case "IMU":
                    allImuData[0].gyrx.push([allImuData[0].rowcount, event.GyrX.toFixed(3)])
                    allImuData[0].gyry.push([allImuData[0].rowcount, event.GyrY.toFixed(3)])
                    allImuData[0].gyrz.push([allImuData[0].rowcount, event.GyrZ.toFixed(3)])
                    allImuData[0].accx.push([allImuData[0].rowcount, event.AccX.toFixed(3)])
                    allImuData[0].accy.push([allImuData[0].rowcount, event.AccY.toFixed(3)])
                    allImuData[0].accz.push([allImuData[0].rowcount, event.AccZ.toFixed(3)])
                    allImuData[0].rowcount = allImuData[0].rowcount + 1
                	break;
/*                	
                case "IMU2":
                    allImuData[1].gyrx.push([allImuData[1].rowcount, event.GyrX])
                    allImuData[1].gyry.push([allImuData[1].rowcount, event.GyrY])
                    allImuData[1].gyrz.push([allImuData[1].rowcount, event.GyrZ])
                    allImuData[1].accx.push([allImuData[1].rowcount, event.AccX])
                    allImuData[1].accy.push([allImuData[1].rowcount, event.AccY])
                    allImuData[1].accz.push([allImuData[1].rowcount, event.AccZ])
                    allImuData[1].rowcount = allImuData[1].rowcount + 1
                    break;
                case "IMU3":
                    allImuData[2].gyrx.push([allImuData[2].rowcount, event.GyrX])
                    allImuData[2].gyry.push([allImuData[2].rowcount, event.GyrY])
                    allImuData[2].gyrz.push([allImuData[2].rowcount, event.GyrZ])
                    allImuData[2].accx.push([allImuData[2].rowcount, event.AccX])
                    allImuData[2].accy.push([allImuData[2].rowcount, event.AccY])
                    allImuData[2].accz.push([allImuData[2].rowcount, event.AccZ])
                    allImuData[2].rowcount = allImuData[2].rowcount + 1
                    break;
*/                    
                }
            })

            // Reduce
            allImuData[0].gyrx = reduce(allImuData[0].gyrx)
            allImuData[0].gyry = reduce(allImuData[0].gyry)
            allImuData[0].gyrz = reduce(allImuData[0].gyrz)
            allImuData[0].accx = reduce(allImuData[0].accx)
            allImuData[0].accy = reduce(allImuData[0].accy)
            allImuData[0].accz = reduce(allImuData[0].accz)
            
            defer.resolve(allImuData)
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

    function reduce(points) {
        var origPoints = points.length
        var result = ramerdouglas.rdp(points, 0.600)
        var resultPoints = result.length
        console.log("Reduced the points from " + origPoints + " to " + resultPoints)
    } 

    console.log("*** MAIN ***")
    console.log("event: " + util.inspect(event))
    console.log("context: " + util.inspect(context))
	getS3Object("dataflashlogs", event.pathParameters.reportid)
		.then(data => parseDatafile(event.pathParameters.reportid, data))
		.then(data => response(data, 200))
		.fail(err => response(err, 500))
}