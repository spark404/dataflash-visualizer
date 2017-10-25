"use strict";

exports.handler = function(event, context, callback) {
    const AWS = require("aws-sdk");
    const Q = require("kew");
    const util = require("util");
    const dataflashlog = require("dataflashlog");
    const s3 = new AWS.S3({ apiVersion: "2006-03-01" });

    function getS3Object(bucket, key) {
        console.log("Entering getS3Object with bucket=" + bucket + " and key=" + key);
        
        const defer = Q.defer();
        const params = {
            Bucket: bucket,
            Key: key,
        };
        s3.getObject(params, function(err, data) {
            if (err) {
                console.log("Error: " + err);
                defer.reject();
            }

            console.log("File data : " + util.inspect(data));
            console.log("OK");
            defer.resolve(data);
        });
        
        console.log("Leaving getS3Object");
        return defer.promise;
    }
    
    function parseDatafile(key, s3file) {
        console.log("Entering parseDatafile with key=" + key);
        const defer = Q.defer();

        dataflashlog.parse(s3file.Body, function(err, data) {
            if (err) {
                console.log("Error: " + err);
                defer.reject();
            }

            var attitudeData = {};
            attitudeData.roll = [];
            attitudeData.desroll = [];
            attitudeData.pitch = [];
            attitudeData.despitch = [];
            attitudeData.yaw = [];
            attitudeData.desyaw = [];
            var rowcount = 0;
            data.messages.forEach(function(event) {
                switch(event.name) {
                case "ATT":
                    attitudeData.roll.push([rowcount, event.Roll]);
                    attitudeData.desroll.push([rowcount, event.DesRoll]);
                    attitudeData.pitch.push([ rowcount, event.Pitch]);
                    attitudeData.despitch.push([ rowcount, event.DesPitch]);
                    attitudeData.yaw.push([rowcount, event.Yaw]);
                    attitudeData.desyaw.push([rowcount, event.DesYaw]);
                    rowcount = rowcount + 1;
                    break;
                }
            });
            
            defer.resolve(attitudeData);
        });

        console.log("Leaving parseDatafile");
        return defer.promise;
    }

    function response(data, statuscode) {
        console.log("Entering response");

        if (data === undefined) {
            var errorMessage = {};
            errorMessage.message = "No entry found in database";

            const response = {
                statusCode: 404,
                body: JSON.stringify(errorMessage)
            };

            callback(null, response);
        } else {
            const response = {
                statusCode: statuscode,
                headers: {
                    "Access-Control-Allow-Origin": "*"
                },
                body: JSON.stringify(data)
            };

            callback(null, response);
        }
    }

    console.log("*** MAIN ***");
    console.log("event: " + util.inspect(event));
    console.log("context: " + util.inspect(context));
    getS3Object("dataflashlogs", event.pathParameters.reportid)
        .then(data => parseDatafile(event.pathParameters.reportid, data))
        .then(data => response(data, 200))
        .fail(err => response(err, 500));
};