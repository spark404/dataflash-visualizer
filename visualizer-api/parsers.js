"use strict";

const Q = require("kew");
const dataflashlog = require("dataflashlog");
const ramerdouglas = require("./RamerDouglasPeucker");
const util = require("util");

exports.parseAttitude =  function(key, s3file) {
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
};

exports.parseErrors =  function(key, s3file) {
    console.log("Entering parseDatafile with key=" + key);
    const defer = Q.defer();

    dataflashlog.parse(s3file.Body, function(err, data) {
        if (err) {
            console.log("Error: " + err);
            defer.reject();
        }

        var errorMessages = [];
        data.messages.forEach(function(event) {
            switch(event.name) {
                case "ERR":
                    var errorMessage = {};
                    errorMessage.timestamp = event.TimeUS; // TODO translate into real timestmap
                    errorMessage.subsys = event.Subsys;
                    errorMessage.ecode = event.ECode;
                    errorMessages.push(errorMessage);
                    break;
            }
        });

        defer.resolve(errorMessages);
    });

    console.log("Leaving parseDatafile");
    return defer.promise;
};

exports.parseGps =  function(key, s3file) {
    console.log("Entering parseDatafile with key=" + key);
    const defer = Q.defer();

    dataflashlog.parse(s3file.Body, function(err, data) {
        if (err) {
            console.log("Error: " + err);
            defer.reject();
        }

        var gpsData = [];
        var currentMode = 0;
        data.messages.forEach(function(event) {
            switch(event.name) {
                case "MODE":
                    currentMode = event.ModeNum;
                    break;
                case "GPS":
                    var gpsPoint = {};
                    gpsPoint.lng = event.Lng / 1e7;
                    gpsPoint.lat = event.Lat / 1e7;
                    gpsPoint.alt = event.Alt;
                    gpsPoint.nsats = event.NSats;
                    gpsPoint.hdop = event.HDop;
                    gpsPoint.spd = event.Spd;
                    gpsPoint.flightMode = currentMode;
                    gpsData.push(gpsPoint);
                    break;
            }
        });

        console.log("Contents " + util.inspect(gpsData));
        defer.resolve(gpsData);
    });

    console.log("Leaving parseDatafile");
    return defer.promise;
};

exports.parseImu =  function(key, s3file) {
    console.log("Entering parseDatafile with key=" + key);
    const defer = Q.defer();

    dataflashlog.parse(s3file.Body, function(err, data) {
        if (err) {
            console.log("Error: " + err);
            defer.reject();
        }

        var allImuData = [];
        for (var i = 0; i < 3; i++) {
            var imuData = {};
            imuData.rowcount = 0;
            imuData.gyrx = [];
            imuData.gyry = [];
            imuData.gyrz = [];
            imuData.accx = [];
            imuData.accy = [];
            imuData.accz = [];
            allImuData.push(imuData);
        }

        data.messages.forEach(function(event) {
            switch(event.name) {
                case "IMU":
                    allImuData[0].gyrx.push([allImuData[0].rowcount, event.GyrX.toFixed(3)]);
                    allImuData[0].gyry.push([allImuData[0].rowcount, event.GyrY.toFixed(3)]);
                    allImuData[0].gyrz.push([allImuData[0].rowcount, event.GyrZ.toFixed(3)]);
                    allImuData[0].accx.push([allImuData[0].rowcount, event.AccX.toFixed(3)]);
                    allImuData[0].accy.push([allImuData[0].rowcount, event.AccY.toFixed(3)]);
                    allImuData[0].accz.push([allImuData[0].rowcount, event.AccZ.toFixed(3)]);
                    allImuData[0].rowcount = allImuData[0].rowcount + 1;
                    break;
                case "IMU2":
                    allImuData[1].gyrx.push([allImuData[1].rowcount, event.GyrX.toFixed(3)]);
                    allImuData[1].gyry.push([allImuData[1].rowcount, event.GyrY.toFixed(3)]);
                    allImuData[1].gyrz.push([allImuData[1].rowcount, event.GyrZ.toFixed(3)]);
                    allImuData[1].accx.push([allImuData[1].rowcount, event.AccX.toFixed(3)]);
                    allImuData[1].accy.push([allImuData[1].rowcount, event.AccY.toFixed(3)]);
                    allImuData[1].accz.push([allImuData[1].rowcount, event.AccZ.toFixed(3)]);
                    allImuData[1].rowcount = allImuData[1].rowcount + 1;
                    break;
                case "IMU3":
                    allImuData[2].gyrx.push([allImuData[2].rowcount, event.GyrX.toFixed(3)]);
                    allImuData[2].gyry.push([allImuData[2].rowcount, event.GyrY.toFixed(3)]);
                    allImuData[2].gyrz.push([allImuData[2].rowcount, event.GyrZ.toFixed(3)]);
                    allImuData[2].accx.push([allImuData[2].rowcount, event.AccX.toFixed(3)]);
                    allImuData[2].accy.push([allImuData[2].rowcount, event.AccY.toFixed(3)]);
                    allImuData[2].accz.push([allImuData[2].rowcount, event.AccZ.toFixed(3)]);
                    allImuData[2].rowcount = allImuData[2].rowcount + 1;
                    break;
            }
        });

        // Reduce
        for (i = 0; i < 3; i++) {
            if (allImuData[i].rowcount > 0) {
                allImuData[i].gyrx = reduce(allImuData[i].gyrx);
                allImuData[i].gyry = reduce(allImuData[i].gyry);
                allImuData[i].gyrz = reduce(allImuData[i].gyrz);
                allImuData[i].accx = reduce(allImuData[i].accx);
                allImuData[i].accy = reduce(allImuData[i].accy);
                allImuData[i].accz = reduce(allImuData[i].accz);
            }
        }

        defer.resolve(allImuData);
    });

    console.log("Leaving parseDatafile");
    return defer.promise;
};

exports.parsePower =  function(key, s3file) {
    const defer = Q.defer();

    dataflashlog.parse(s3file.Body, function(err, data) {
        if (err) {
            console.log("Error: " + err);
            defer.reject();
        }

        var reference = data.referenceTimestamp;
        var powerData = [];
        data.messages.forEach(function(event) {
            switch(event.name) {
                case "CURR":
                    var powerMeasurement = {};
                    powerMeasurement.timestamp = getTimestampForTimeUS(reference, event.TimeUS);
                    powerMeasurement.volt = event.Volt;
                    powerMeasurement.curr = event.Curr;
                    powerMeasurement.currtot = event.CurrTot;
                    powerData.push(powerMeasurement);
                    break;
            }
        });

        defer.resolve(powerData);
    });

    return defer.promise;
};

function reduce(points) {
    var origPoints = points.length;
    var result = ramerdouglas.rdp(points, 0.400);
    var resultPoints = result.length;
    console.log("Reduced the points from " + origPoints + " to " + resultPoints);
    return result;
}

function getTimestampForTimeUS(reference, tineus) {
    return reference.reference + ((tineus - reference.timeus) / 1000);
}     