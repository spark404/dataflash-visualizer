"use strict";

exports.handler = function(event, context, callback) {
    const AWS = require("aws-sdk");
    const Q = require("kew");
    const docClient = new AWS.DynamoDB.DocumentClient();

    function queryDatabase() {
        console.log("Entering queryDatabase");
        const defer = Q.defer();

        var params = {
            TableName : "dataflashlogheaders",
            AttributesToGet : [
                "filename",
                "altitude",
                "attitude",
                "err",
                "gps",
                "imu",
                "ntun",
                "power",
                "size",
                "timestamps"
            ]
        };

        docClient.scan(params, function(err, data) {
            if (err) {
                defer.reject(err);
            } else {
                defer.resolve(data.Items);
            }
        });

        return defer.promise;
    }

    function response(data, statuscode) {
        console.log("Entering response");

        const response = {
            statusCode: statuscode,
            headers: {
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify(data)
        };

        callback(null, response);
    }

    console.log("*** MAIN ***");
    queryDatabase()
        .then(data => response(data, 200))
        .fail(err => response(err, 500));
};
