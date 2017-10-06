'use strict';

exports.handler = (event, context, callback) => {
	const AWS = require("aws-sdk");
    const Q = require('kew');
    const dataflashlog = require('dataflashlog')
    const util = require('util')
    const docClient = new AWS.DynamoDB.DocumentClient();
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

            data.contents = {}
            data.contents.power = false
            data.contents.altitude = false
            data.contents.attitude = false
            data.contents.gps = false
            data.contents.imu = false
            data.contents.ntun = false
            data.contents.err = false

            data.messages.forEach(function(event) {
            	switch(event.name) {
                case "ERR":
                	data.contents.err = true
                	break;
                case "GPS":
                	data.contents.gps = true
                	break;
                case "CURR":
                	data.contents.power = true
                	break;
                case "IMU":
                	data.contents.imu = true
                	break;
                case "NTUN":
                	data.contents.ntun = true
                	break;
                case "ATT":
                	data.contents.attitude = true
                	break;
                case "BARO":
                	data.contents.attitude = true
                	break;
                }
            })
            
            console.log("Contents " + util.inspect(data.contents))
            defer.resolve(data)
        })

        console.log("Leaving parseDatafile")
        return defer.promise
    }

    function putItem(key, data) {
        console.log("Entering putItem with key=" + key)

        const defer = Q.defer();
        const params = {
          TableName: 'dataflashlogheaders',
          Key: {
          	filename: key
          },
          AttributeUpdates: {
          	err: {
          		Action: "PUT",
          		Value: data.contents.err
          	},
          	gps: {
          		Action: "PUT",
          		Value: data.contents.gps
          	},
          	power: {
          		Action: "PUT",
          		Value: data.contents.power
          	},
          	altitude: {
          		Action: "PUT",
          		Value: data.contents.altitude
          	},
          	attitude: {
          		Action: "PUT",
          		Value: data.contents.attitude
          	},
          	imu: {
          		Action: "PUT",
          		Value: data.contents.imu
          	},
          	ntun: {
          		Action: "PUT",
          		Value: data.contents.ntun
          	}
          }
        }

        docClient.update(params, defer.makeNodeResolver());

        console.log("Leaving putItem")
        return defer.promise
    }

    /* === MAIN === */
    console.log('Received event:', JSON.stringify(event, null, 2));

    event.Records.forEach((record) => {
    	if (record.eventName == "INSERT") {
    		var filename = record.dynamodb.Keys.filename.S
    		console.log("Processing new entry " + filename)
			getS3Object("dataflashlogs", filename)
			        .then(data => parseDatafile(filename, data))
			        .then(data => putItem(filename, data))
			        .fail(err => { console.error("Failed to process " + filename + " : " + err)});
    	} else {
    		console.error("Unable to process event")
    	}
    });
    callback(null, `Successfully processed ${event.Records.length} records.`);
};

/*
2017-09-25T06:43:56.270Z	e727d41b-a1bc-11e7-857e-d51cd4d2fba1	Received event:
{
    "Records": [
        {
            "eventID": "f8eddb0a90ffbf010ce51e7c8a7ed203",
            "eventName": "INSERT",
            "eventVersion": "1.1",
            "eventSource": "aws:dynamodb",
            "awsRegion": "eu-west-2",
            "dynamodb": {
                "ApproximateCreationDateTime": 1506321780,
                "Keys": {
                    "filename": {
                        "S": "log_8_2017-9-10-13-08-14.bin"
                    }
                },
                "SequenceNumber": "25160900000000000154464740",
                "SizeBytes": 36,
                "StreamViewType": "KEYS_ONLY"
            },
            "eventSourceARN": "arn:aws:dynamodb:eu-west-2:199710627848:table/dataflashlogheaders/stream/2017-09-22T06:58:46.504"
        }
    ]
}
*/