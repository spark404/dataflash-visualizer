'use strict';

exports.handler = function(event, context, callback) {
	const AWS = require("aws-sdk");
	const Q = require('kew');
	const docClient = new AWS.DynamoDB.DocumentClient();
	const util = require('util')

	function queryDatabase() {
	    console.log("Entering queryDatabase")
		const defer = Q.defer();

		var params = {
	    	TableName : "dataflashlogheaders",
	    	Key: {
	    		filename: event.reportid
	    	}
		};

		docClient.get(params, function(err, data) {
		    if (err) {
		        defer.reject(err)
		    } else {
		        defer.resolve(data)
		    }
		});

		return defer.promise
	}

	function response(data, statuscode) {
	    console.log("Entering response")

	    const response = {
    		statusCode: statuscode,
		    body: JSON.stringify(data),
		  };
		
		callback(null, response)
	} 

    console.log("*** MAIN ***")
    console.log("event: " + util.inspect(event))
    console.log("context: " + util.inspect(context))
	queryDatabase()
		.then(data => response(data, 200))
		.fail(err => response(err, 500))
}