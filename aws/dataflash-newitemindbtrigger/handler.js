"use strict";

exports.handler = (event, context, callback) => {
    const AWS = require("aws-sdk");
    const Q = require("kew");
    const dataflashlog = require("dataflashlog");
    const util = require("util");
    const docClient = new AWS.DynamoDB.DocumentClient();
    const s3 = new AWS.S3({ apiVersion: "2006-03-01" });

    function getS3Object(bucket, key) {
        console.log("Entering getS3Object with bucket=" + bucket + " and key=" + key);

        const defer = Q.defer();
        const params = {
            Bucket: bucket,
            Key: key
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

        dataflashlog.parse(s3file.Body, function(err, parsedData) {
            if (err) {
                console.log("Error: " + err);
                defer.reject();
            }

            var data = {};
            data.contents = {};
            data.contents.power = false;
            data.contents.altitude = false;
            data.contents.attitude = false;
            data.contents.gps = false;
            data.contents.imu = false;
            data.contents.ntun = false;
            data.contents.err = false;
            data.messages = [];
            data.parameters = {};

            parsedData.messages.forEach(function(event) {
                switch(event.name) {
                case "ERR":
                    data.contents.err = true;
                    break;
                case "GPS":
                    data.contents.gps = true;
                    break;
                case "CURR":
                    data.contents.power = true;
                    break;
                case "IMU":
                    data.contents.imu = true;
                    break;
                case "NTUN":
                    data.contents.ntun = true;
                    break;
                case "ATT":
                    data.contents.attitude = true;
                    break;
                case "BARO":
                    data.contents.attitude = true;
                    break;
                case "PARM":
                    data.parameters[event.Name] = event.Value;
                    break;
                case "MSG":
                    var message = {};
                    message.text = event.Message;
                    message.timestamp = parsedData.referenceTimestamp.reference + ((event.TimeUS - parsedData.referenceTimestamp.timeus) / 1000);
                    data.messages.push(message);
                    break;
                }
            });

            defer.resolve(data);
        });

        console.log("Leaving parseDatafile");
        return defer.promise;
    }

    function putItem(key, data) {
        console.log("Entering putItem with key=" + key);

        const defer = Q.defer();
        const params = {
            TableName: "dataflashlogheaders",
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
                },
                messages: {
                    Action: "PUT",
                    Value: data.messages
                },
                parameters: {
                    Action: "PUT",
                    Value: data.parameters
                }
            }
        };

        docClient.update(params, defer.makeNodeResolver());

        console.log("Leaving putItem");
        return defer.promise;
    }

    /* === MAIN === */
    console.log("Received event:", JSON.stringify(event, null, 2));

    event.Records.forEach((record) => {
        if (record.eventName === "INSERT") {
            var filename = record.dynamodb.Keys.filename.S;
            console.log("Processing new entry " + filename);
            getS3Object("dataflashlogs", filename)
                .then(data => parseDatafile(filename, data))
                .then(data => putItem(filename, data))
                .fail(err => { console.error("Failed to process " + filename + " : " + err)});
        } else {
            console.error("Unable to process event");
        }
    });
    callback(null, `Successfully processed ${event.Records.length} records.`);
};