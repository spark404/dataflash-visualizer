var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

var expect = chai.expect;

const AWS_MOCK = require('aws-sdk-mock');

process.env.DATABASE = "mock-database";
process.env.BUCKET = "mock-bucket";

const handler = require('../handler');

describe('Handler#listItems', function () {
    const testItemOne = {
        "filename": "log_3_2017-10-1-17-57-20.bin",
        "ntun": true,
        "size": 12952482,
        "attitude": true,
        "imu": true,
        "altitude": false,
        "err": true,
        "power": true,
        "gps": true,
        "timestamps": {
            "start": 1506872370007.192,
            "finish": 1506873503533.25
        }
    };

    const testItemTwo = {
        "filename": "log_8_2017-9-10-13-08-14.bin",
        "ntun": true,
        "size": 15212065,
        "attitude": true,
        "imu": true,
        "altitude": false,
        "err": true,
        "power": true,
        "gps": true,
        "timestamps": {
            "start": 1505040251616.593,
            "finish": 1505041760371.728
        }
    };

    it('should return items when executing list function', async function () {
        AWS_MOCK.mock('DynamoDB.DocumentClient', 'scan', function (params, callback) {
            callback(null, { Items: [ testItemOne ,testItemTwo ]});
        });

        const result = handler.listItems();

        await expect(result).to.eventually.have.property('statusCode', 200);
        await expect(result).to.eventually.have.property('body');
    });

    it('should return empty list when there are no items', async function () {
        AWS_MOCK.mock('DynamoDB.DocumentClient', 'scan', function (params, callback) {
            callback(null, { Items: [ ]});
        });

        const result = handler.listItems();

        await expect(result).to.eventually.have.property('statusCode', 200);
        await expect(result).to.eventually.have.property('body');
    });

});