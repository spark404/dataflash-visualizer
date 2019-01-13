"use strict";

const AWS = require("aws-sdk");
const util = require("util");

const parsers = require("./parsers");

const bucket = process.env.BUCKET;
const database = process.env.DATABASE;

class ResourceNotFound extends Error {
    constructor(...args) {
        super(...args);
        Error.captureStackTrace(this, ResourceNotFound);
    }
}

module.exports.listItems = async (event) => {
    console.log("*** listItems ***");
    console.log("event: " + util.inspect(event));

    try {
        return listEntries();
    } catch (error) {
        console.log("listEntries failed", error);
        return {
            error_type: "server_error",
            message: error.message
        };
    }
};

module.exports.retrieveMetadata = async (event) => {
    console.log("*** retrieveMetadata ***");
    console.log("event: " + util.inspect(event));

    const entry = await retrieveEntryByFilename(event.reportid);
    if (entry.hasOwnProperty('Item')) {
        return entry.Item;
    } else {
        throw new ResourceNotFound("ResourceNotFound: " + event.reportid + " not found");
    }
};

module.exports.parseAttitude = async (event) => {
    console.log("*** parseAttitude ***");
    console.log("event: " + util.inspect(event));

    const dataFile = await getS3Object(bucket, event.reportid);

    return parsers.parseAttitude(event.reportid, dataFile)
};

module.exports.parseErrors = async (event) => {
    console.log("*** parseErrors ***");
    console.log("event: " + util.inspect(event));

    const dataFile = await getS3Object(bucket, event.reportid);

    return parsers.parseErrors(event.reportid, dataFile)
};

module.exports.parseGps = async (event) => {
    console.log("*** parseGps ***");
    console.log("event: " + util.inspect(event));

    const dataFile = await getS3Object(bucket, event.reportid);

    return parsers.parseGps(event.reportid, dataFile)
};

module.exports.parseImu = async (event) => {
    console.log("*** parseImu ***");
    console.log("event: " + util.inspect(event));

    const dataFile = await getS3Object(bucket, event.reportid);

    return parsers.parseImu(event.reportid, dataFile)
};

module.exports.parsePower = async (event) => {
    console.log("*** parsePower ***");
    console.log("event: " + util.inspect(event));

    const dataFile = await getS3Object(bucket, event.reportid);

    return parsers.parsePower(event.reportid, dataFile)
};

function listEntries() {
    const docClient = new AWS.DynamoDB.DocumentClient();

    const params = {
        TableName: database,
        AttributesToGet: [
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

    return docClient.scan(params).promise();
}

function retrieveEntryByFilename(filename) {
    const docClient = new AWS.DynamoDB.DocumentClient();

    const params = {
        TableName: database,
        Key: {
            filename: filename
        }
    };

    return docClient.get(params).promise();
}

function getS3Object(bucket, key) {
    console.log("Entering getS3Object with bucket=" + bucket + " and key=" + key);
    const s3 = new AWS.S3();

    const params = {
        Bucket: bucket,
        Key: key,
    };

    return s3.getObject(params).promise();
}