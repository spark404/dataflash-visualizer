'use strict';

const aws = require('aws-sdk');
const doc = require('dynamodb-doc');
const Q = require('kew');
const dataflashlog = require('dataflashlog')
const util = require('util')

const s3 = new aws.S3({ apiVersion: '2006-03-01' });
const dynamo = new doc.DynamoDB();

exports.handler = (event, context, callback) => {
    const bucket = event.Records[0].s3.bucket.name;
    const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
    
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

            var firstTimestamp=0;
            var lastTimestamp=0;

            data.messages.forEach(function(event) {
                if (event.hasOwnProperty('TimeUS')) {
                    var timestamp = event.TimeUS;
                    
                    if (timestamp < firstTimestamp || firstTimestamp === 0) {
                        firstTimestamp = timestamp;
                    }

                    if (timestamp > lastTimestamp) {
                        lastTimestamp = timestamp;
                    }
            
                }
            })

            var reference = data.referenceTimestamp
            data.logStart = reference.reference + ((firstTimestamp - reference.timeus) / 1000)
            data.logEnd = reference.reference + ((lastTimestamp - reference.timeus) / 1000)
            data.size = s3file.ContentLength
            
            console.log("Start: " + new Date(data.logStart) + ", End:" + new Date(data.logEnd))

            console.log("OK")
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
          Item: {
            filename: key,
            timestamps: { 
                start: data.logStart,
                finish: data.logEnd
            },
            size: data.size
          }
        }

        dynamo.putItem(params, defer.makeNodeResolver());

        console.log("Leaving putItem")
        return defer.promise
    }

    function response(key, statusCode) {
        console.log("Entering response with key=" + key + ", statusCode=" + statusCode)

        const response = {
          statusCode: statusCode,
        };

        console.log("Leaving response")
        callback(null, response);
    }

    console.log("About to call getS3Object")
    getS3Object(bucket, key)
        .then(data => parseDatafile(key, data))
        .then(data => putItem(key, data))
        .then(data => response(null, 200))
        .fail(err => response(err, 500));
};
