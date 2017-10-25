"use strict";

exports.handler = function(event, context, callback) {
    const AWS = require("aws-sdk");
    const Q = require("kew");
    const docClient = new AWS.DynamoDB.DocumentClient();
    const util = require("util");

    if (event === null || !event.hasOwnProperty("resource")) {
        callback(new Error("Probably not a request from the API gateway"))
    }

    if (!event.pathParameters.hasOwnProperty("reportid") || event.pathParameters['reportid'] === undefined) {
        response(new Error("Missing required path parameter reportId"), 409)
    }

    function queryDatabase() {
        console.log("Entering queryDatabase");
        const defer = Q.defer();

        var params = {
            TableName : "dataflashlogheaders",
            Key: {
                filename: event.pathParameters.reportid
            }
        };

        docClient.get(params, function(err, data) {
            if (err) {
                defer.reject(err);
            } else {
                defer.resolve(data.Item);
            }
        });

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
    queryDatabase()
        .then(data => response(data, 200))
        .fail(err => response(err, 500));
};