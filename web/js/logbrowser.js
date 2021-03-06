// Global reference to the available flightlogs
var flightLogs = {};

// Global reference to the reports cache
var reports = {};

// Global references to currently visisble log;
var map, flightPath, details;

// Pages
function showIndexPage() {
    console.log("Showing index page");
    $('#upload')
        .addClass("hidden");
    $('#browser')
        .addClass("hidden");
    $('#visualizer')
        .addClass("hidden");

    $('div.jumbotron')
        .removeClass('hidden');
    $('#mainpage')
        .removeClass('hidden');

    $('a.nav-link.active')
        .removeClass('active');

    $('a.nav-link:contains("Home")')
        .addClass('active')
}

function showUploadPage() {
    console.log("Showing upload page");
    $('#browser')
        .addClass("hidden");
    $('#visualizer')
        .addClass("hidden");
    $('div.jumbotron')
        .addClass('hidden');
    $('#mainpage')
        .addClass('hidden');

    $('#upload')
        .removeClass("hidden");

    $('a.nav-link.active')
        .removeClass('active');

    $('a.nav-link:contains("Upload")')
        .addClass('active')
}

function showBrowserPage() {
    console.log("Showing browser page");
    $('#visualizer')
        .addClass("hidden");
    $('div.jumbotron')
        .addClass('hidden');
    $('#mainpage')
        .addClass('hidden');
    $('#upload')
        .addClass("hidden");

    $('#browser')
        .removeClass("hidden");

    $('a.nav-link.active')
        .removeClass('active');

    $('a.nav-link:contains("View")')
        .addClass('active');

    $('#logtable').find('tbody')
        .empty()
        .append($('<tbody>')
            .append($('<tr>')
                .append($('<td>')
                    .attr('colspan', "4")
                    .append($('<span>')
                        .addClass('fa')
                        .addClass('fa-cog')
                        .addClass('fa-spin')
                        .addClass('fa-2x')
                        .addClass('fa-fw'))
                        .append(" Loading..."))));

    get("https://dataflashapi.strocamp.net/api/reports")
        .then(browseCallback)
        .catch(browseFailed)
}

function get(url) {
    return new Promise(function(resolve, reject) {
        $.ajax(url)
            .then(function(response, statusText) {
                if (statusText === "success") {
                    resolve(response);
                } else {
                    reject(Error(statusText));
                }
            }, function(xhrObj, textStatus, err) {
                reject(Error("Network Error: " + err));
            })
    })
}

function loadData(filename, dataSource) {
    return new Promise(function(resolve, reject) {
        if (reports.hasOwnProperty(dataSource) && !(reports[dataSource] === undefined)) {
            console.log("CACHE HIT: datasource:" + dataSource + ", filename:" + filename);
            resolve(reports[dataSource])
        } else {
            console.log("CACHE MISS: datasource:" + dataSource + ", filename:" + filename);
            get('https://dataflashapi.strocamp.net/api/reports/' + filename + '/' + dataSource)
                .then(function(data) {
                    console.log("URL LOAD COMPLETED: datasource:" + dataSource + ", filename:" + filename);
                    reports[dataSource] = data;
                    resolve(data)
                })
                .catch(function(err) {
                    console.log("URL LOAD FAILED: datasource:" + dataSource + ", filename:" + filename);
                    reject(err)
                })
        }
    })
}

// From https://stackoverflow.com/questions/5731193/how-to-format-numbers-using-javascript
function formatThousandsWithRounding(n, dp) {
    var w = n.toFixed(dp),
        k = w | 0,
        b = n < 0 ? 1 : 0,
        u = Math.abs(w - k),
        d = ('' + u.toFixed(dp)).substr(2, dp),
        s = '' + k,
        i = s.length,
        r = '';
    while ((i -= 3) > b) {
        r = '.' + s.substr(i, 3) + r;
    }
    return s.substr(0, i + 3) + r + (d ? ',' + d : '');
}
function browseCallback(data) {
    flightLogs = {};

    $('#logtable').find('tbody').empty();

    var sortedData = data.sort(function(a, b) {
        if (a.timestamps.start < b.timestamps.start) {
            return 1
        } else if (a.timestamps.start > b.timestamps.start) {
            return -1
        } else {
            return 0
        }
    });

    sortedData.forEach(function(item) {
        // Add to global
        flightLogs[item.filename] = item;
        var startDate = new Date(item.timestamps.start);

        $('#logtable').find('tbody')
            .append($('<tr>')
                .append($('<td>')
                    .append($('<p>')
                        .text(startDate.toLocaleDateString() + " " + startDate.toLocaleTimeString())
                    )
                )
                .append($('<td>')
                    .append($('<span>')
                        .addClass("badge")
                        .addClass(item.power ? "badge-success" : "badge-secondary")
                        .text("Power")
                    )
                    .append(" ")
                    .append($('<span>')
                        .addClass("badge")
                        .addClass(item.altitude ? "badge-success" : "badge-secondary")
                        .text("Altitude")
                    )
                    .append(" ")
                    .append($('<span>')
                        .addClass("badge")
                        .addClass(item.attitude ? "badge-success" : "badge-secondary")
                        .text("Attitude")
                    )
                    .append(" ")
                    .append($('<span>')
                        .addClass("badge")
                        .addClass(item.gps ? "badge-success" : "badge-secondary")
                        .text("GPS")
                    )
                    .append(" ")
                    .append($('<span>')
                        .addClass("badge")
                        .addClass(item.imu ? "badge-success" : "badge-secondary")
                        .text("IMU")
                    )
                    .append(" ")
                    .append($('<span>')
                        .addClass("badge")
                        .addClass(item.ntun ? "badge-success" : "badge-secondary")
                        .text("NTUN")
                    )
                    .append(" ")
                    .append($('<span>')
                        .addClass("badge")
                        .addClass(item.err ? "badge-danger" : "badge-secondary")
                        .text("Error(s)")
                    )
                    .append(" ")
                )
                .append($('<td>')
                    .append($('<p>')
                        .addClass('text-right')
                        .text(formatThousandsWithRounding(item.size, 0))
                    )
                )
                .append($('<td>')
                    .append($('<a>')
                        .attr('href', '#')
                        .attr('role', "button")
                        .addClass('btn')
                        .addClass('btn-main')
                        .addClass('pull-right')
                        .text("Go ")
                        .append($('<span>')
                            .addClass('fa')
                            .addClass('fa-arrow-right')
                        )
                        .on('click', function() {
                            detailView(item.filename)
                        })
                    )
                )
            )
    })
}

function browseFailed() {
    var logtable = $("#logtable");
    logtable.find('tbody').remove();
    logtable
        .append($('<tr>')
            .append($('<td>')
                .attr('colspan', '4')
                .append($('<div>')
                    .addClass("alert")
                    .addClass("alert-danger")
                    .append($('<span>')
                        .addClass('fa')
                        .addClass('fa-exclamation-triangle')
                        .attr('aria-hidden', 'true')
                    )
                    .text("Loading failed")
                )
            )
        )
}

function detailView(filename) {
    console.log("Requested a detailview of " + filename);

    reports = {};
    details = undefined;

    $('#browser').addClass("hidden");
    $('#visualizer').removeClass("hidden");

    $('.breadcrumb a').on('click', browseView);
    $('.breadcrumb span').text(filename);

    conditionalLoadMapsApi();

    console.log("Requesting gpspath for " + filename);
    loadData(filename, "gpspath").then(function(gpspath) {
        reports['gpspath'] = gpspath;

        if (!(flightPath === undefined)) {
            flightPath.setMap(null)
        }

        flightPath = new google.maps.Polyline({
            path: [],
            geodesic: true,
            strokeColor: '#FF0000',
            strokeOpacity: 1.0,
            strokeWeight: 2,
            map: map
        });

        gpspath.forEach(function(gpspoint) {
            var point = new google.maps.LatLng(gpspoint.lat, gpspoint.lng);
            flightPath.getPath().push(point)
        });

        map.fitBounds(flightPath.getBounds());
        console.log("Finished loading gpspath for " + filename)
    }).catch(function(err) {
        // TODO show a failed overlay on the map
        console.log("Failed to load map : " + err)
    });

    var itemData = flightLogs[filename];
    console.log("Configuring panels for " + filename);
    $("#datapanels").find(".card-header ul")
        .empty()
        .append(createCard('Messages', true, filename))
        .append(createCard('Parameters', true, filename))
        .append(createCard('Power', itemData.power, filename))
        .append(createCard('Altitude', false, filename)) // TODO
        .append(createCard('Attitude', itemData.attitude, filename))
        .append(createCard('GPS', itemData.gps, filename))
        .append(createCard('IMU', itemData.imu, filename))
        .append(createCard('NTUN', false, filename)); // TODO


    activatePanel('Messages', filename)

}

function createCard(title, enabled, filename) {
    var navitem = $('<li>')
        .addClass('nav-item')
        .append($('<a>')
            .addClass("nav-link")
            .attr("href", "#")
            .text(title)
        );
    var navlink = navitem.find("a");
    if (enabled) {
        navlink.on('click', function(event) {
            event.preventDefault();
            activatePanel(title, filename)
        })
    } else {
        navlink.addClass("disabled");
        navlink.on('click', function(event) {
            event.preventDefault()
        })
    }
    return navitem
}

function activatePanel(panelName, filename) {
    var datapanels = $("#datapanels");

    datapanels.find("a.active")
        .removeClass("active");
    
    datapanels.find("a:contains('" + panelName + "')")
        .addClass("active");

    datapanels.find('.card-body')
        .empty()
        .append($('<div>')
            .addClass('alert')
            .addClass('alert-info')
            .attr('role', 'alert')
            .text('Loading...'));
     
     var panels = {
     	'Power' : {
     		dataSource: 'power',
     		callback: displayPowerPanel
     	},
     	'Messages' : {
     		dataSource: 'errors',
     		callback: displayMessagesPanel
     	},
     	'GPS' : {
     		dataSource: 'gpspath',
     		callback: displayGpsPanel
     	},
     	'Attitude' : {
     		dataSource: 'attitude',
     		callback: displayAttitudePanel
     	},
     	'IMU' : {
     		dataSource: 'imu',
     		callback: displayImuPanel
     	},
         'Parameters' : {
             dataSource: 'details',
             callback: displayParametersPanel
         }
     };

    var panelToShow = panels[panelName];
    if (panelName === "Messages") {
        dataPromise = loadData(filename, panelToShow.dataSource);
        detailsPromise = get('https://dataflashapi.strocamp.net/api/reports/' + filename);
        Promise.all([dataPromise, detailsPromise])
            .then(panelToShow.callback)
            .catch(displayLoadFailed)
    } else {
        dataPromise = loadData(filename, panelToShow.dataSource)
            .then(panelToShow.callback)
            .catch(displayLoadFailed)
    }
}

function displayLoadFailed(err) {
    $('#datapanels').find('.card-body')
        .empty()
        .append($('<div>')
            .addClass('alert')
            .addClass('alert-danger')
            .attr('role', 'alert')
            .text('Failed to load data: ' + err))	
}

function displayMessagesPanel(displayData) {
    var dataPanels = $('#datapanels');

    reports["details"] = displayData[1]; // TODO should not be stored here

    var errorList = displayData[0];
    var messages = displayData[1].messages;

    dataPanels
        .find('.card-body')
        .empty();

    if ((errorList === undefined || errorList.length === 0) && (messages === undefined || messages.length === 0)) {
        dataPanels.find('.card-body')
            .empty()
            .append($('<div>')
                .addClass('alert')
                .addClass('alert-success')
                .attr('role', 'alert')
                .text('No errors!'))
    } else {
        errorList.forEach(function(errorMessage) {
            dataPanels.find('.card-body')
                .append($('<div>')
                    .addClass('alert')
                    .addClass('alert-danger')
                    .attr('role', 'alert')
                    .text("Subsystem " + errorMessage.subsys + " Errorcode : " + errorMessage.ecode))
        });

        messages.forEach((function(message) {
            var messageDate = new Date(message.timestamp);
            var timestamp = messageDate.toLocaleDateString() + " " + messageDate.toLocaleTimeString();

            dataPanels.find(".card-body")
                .append($("<div>")
                    .addClass('alert')
                    .addClass('alert-info')
                    .addClass('text-left')
                    .attr('role','alert')
                    .text(timestamp + " " + message.text)
                )
        }));
    }
}

function displayParametersPanel(displayData) {
    var dataPanels = $('#datapanels');

    dataPanels
        .find('.card-body')
        .empty();

    dataPanels.find(".card-body")
        .append($("<table>")
            .append($("<thead>")
                .append($("<tr>")
                    .append($("<th>")
                        .text("Parameter")
                    )
                    .append($("<th>")
                        .text("Value")
                    )
                )
            )
        )

    Object.keys(displayData.parameters).sort().forEach(function(key) {
        dataPanels.find(".card-body thead")
            .append($("<tr>")
                .append($("<td>")
                    .addClass("text-left")
                    .text(key)
                )
                .append($("<td>")
                    .addClass("text-left")
                    .text(displayData.parameters[key])
                )
            )
    })
}

function displayPowerPanel(data) {
    var datapanels = $('#datapanels');
    datapanels.find('.card-body')
        .empty()
        .append($('<div>')
            .addClass('card-columns')
            .append(createGraphCard('power-graph', 'Power drain (mA)'))
            .append(createGraphCard('voltage-graph', 'Voltage (volt)'))
            .append(createGraphCard('totalpower-graph', 'Cumulative Power Usage (mAh)')));

    var volts = [];
    var curr = [];
    var currtot = [];
    data.forEach(function(line) {
        volts.push([line.timestamp, line.volt]);
        curr.push([line.timestamp, line.curr]);
        currtot.push([line.timestamp, line.currtot])
    });

    var options = {
        series: {
            lines: {
                show: true
            },
            points: {
                show: false
            }
        },
        legend: {
            show: true,
            position: "nw"
        },
        xaxis: {
            show: true,
            mode: "time"
        },
        yaxix: {
            show: true
        }
    };


    $.plot(datapanels.find('.card-body #voltage-graph'), [volts], options);
    $.plot(datapanels.find('.card-body #power-graph'), [curr], options);
    $.plot(datapanels.find('.card-body #totalpower-graph'), [currtot], options)
}

function displayGpsPanel(data) {
    var datapanels = $('#datapanels');
    datapanels.find('.card-body')
        .empty()
        .addClass('card-columns')
        .append(createGraphCard('hdop-graph', 'Horizontal Dilution of Precision'))
        .append(createGraphCard('alt-graph', 'Altitude / Speed'));

    var hdop = [];
    var alt = [];
    var spd = [];
    var index = 0;
    var modeChanges = [];

    data.forEach(function(line) {
        hdop.push([index, line.hdop]);
        alt.push([index, line.alt]);
        spd.push([index, line.spd]);

        if (modeChanges.length === 0) {
            modeChanges.push([index, line.flightMode])
        } else {
            if (!(line.flightMode === modeChanges[modeChanges.length - 1][1])) {
                modeChanges.push([index, line.flightMode])
            }
        }

        index = index + 1
    });

    var options = {
        series: {
            lines: {
                show: true
            },
            points: {
                show: false
            }
        },
        legend: {
            show: true,
            position: "nw"
        },
        xaxis: {
            show: false
        },
        yaxix: {
            show: true
        },
        grid: {
            markings: [{
                    yaxis: {
                        from: 0,
                        to: 1
                    },
                    color: "#c3e6cb"
                }, // Ideal
                {
                    yaxis: {
                        from: 1,
                        to: 2
                    },
                    color: "#d4edda"
                }, // Excellent
                {
                    yaxis: {
                        from: 2,
                        to: 5
                    },
                    color: "#fff3cd"
                }, // Good
                {
                    yaxis: {
                        from: 5,
                        to: 10
                    },
                    color: "#fff3cd"
                }, // Moderate
                {
                    yaxis: {
                        from: 10,
                        to: 20
                    },
                    color: "#f8d7da"
                }, // Fair
                {
                    yaxis: {
                        from: 20
                    },
                    color: "#f8d7da"
                } // Poor
            ]
        }
    };

    $.plot(datapanels.find('.card-body #hdop-graph'), [hdop], options);

    var graphData = [{
        data: alt,
        label: "Altitude (m)"
    }, {
        data: spd,
        yaxis: 2,
        label: "Speed (m/s)"
    }];

    options = {
        series: {
            lines: {
                show: true
            },
            points: {
                show: false
            }
        },
        legend: {
            show: true,
            position: "nw"
        },
        xaxis: {
            show: false
        },
        yaxes: [{
            show: true
        }, {
            show: true,
            position: "right"
        }],
        grid: {}
    };

    var markings = [];
    modeChanges.forEach(function(item, index) {
        var nextStep;
        if (!(index === modeChanges.length - 1)) {
            nextStep = modeChanges[index + 1][0]
        } else {
            nextStep = reports['gpspath'].length
        }
        markings.push({
            xaxis: {
                from: item[0],
                to: nextStep
            },
            color: flightModeDetailsForCode(item[1]).color
        })
    });
    options.grid.markings = markings;

    $.plot(datapanels.find('.card-body #alt-graph'), graphData, options)
}

function displayAttitudePanel(data) {
    var datapanels = $('#datapanels');

    datapanels.find('.card-body')
        .empty()
        .addClass('card-columns')
        .append(createGraphCard('roll-graph', 'Roll'))
        .append(createGraphCard('pitch-graph', 'Pitch'))
        .append(createGraphCard('yaw-graph', 'Yaw'));

    var options = {
        series: {
            lines: {
                show: true
            },
            points: {
                show: false
            }
        },
        legend: {
            show: true,
            position: "nw"
        },
        xaxis: {
            show: false
        },
        yaxix: {
            show: true
        }
    };

    var graphData = [{
        data: data.roll,
        label: "Roll"
    }, {
        data: data.desroll,
        label: "Desired Roll"
    }];
    $.plot(datapanels.find('.card-body #roll-graph'), graphData, options);

    graphData = [{
        data: data.pitch,
        label: "Pitch"
    }, {
        data: data.despitch,
        label: "Desired Pitch"
    }];
    $.plot(datapanels.find('.card-body #pitch-graph'), graphData, options);

    graphData = [{
        data: data.yaw,
        label: "Yaw"
    }, {
        data: data.desyaw,
        label: "Desired Yaw"
    }];
    $.plot(datapanels.find('.card-body #yaw-graph'), graphData, options)
}

function displayImuPanel(data) {
    var datapanels = $('#datapanels');
    datapanels.find('.card-body')
        .empty()
        .addClass('card-columns');

    var options = {
        series: {
            lines: {
                show: true
            },
            points: {
                show: false
            }
        },
        legend: {
            show: true,
            position: "ne"
        },
        xaxis: {
            show: false
        },
        yaxix: {
            show: true
        },
        grid: {
            markings: [{
                    yaxis: {
                        from: -3,
                        to: 3
                    },
                    color: "#c3e6cb"
                }, // Good Virbrations Mon
                {
                    yaxis: {
                        from: 3,
                        to: 5
                    },
                    color: "#fff3cd"
                }, // Moderate
                {
                    yaxis: {
                        from: -5,
                        to: -3
                    },
                    color: "#fff3cd"
                } // Moderate
            ]
        }

    };

    for (var i = 0; i< 3 ; i++) {
        if (data[i].rowcount === 0) {
            continue
        }

        var graphData = [{
            data: data[i].accx,
            label: "AccX"
        }, {
            data: data[i].accy,
            label: "AccY"
        }, {
            data: data[i].accx,
            label: "AccZ"
        }];

        datapanels.find('.card-columns')
            .append(createGraphCard('vibration-graph' + i, 'Vibration#' + i ));

        $.plot(datapanels.find('.card-body #vibration-graph' + i), graphData, options)
    }
}

function createGraphCard(graphId, title) {
    return $('<div>')
        .addClass('card')
        .append($('<div>')
            .addClass("card-header")
            .text(title))
        .append($('<div>')
            .addClass("card-body")
            .append($('<div>')
                .addClass('graph')
                .attr('id', graphId))
        )
}

function browseView() {
    $('#visualizer').addClass("hidden");
    if (!(flightPath === undefined)) {
        flightPath.setMap(null)
    }

    $('#browser').removeClass("hidden")
}

function conditionalLoadMapsApi() {
    // noinspection JSJQueryEfficiency
    var len = $('script[src*="https://maps.googleapis.com"]').length;

    if (len === 0) {
        console.log('Loading maps API');

        loadScript('https://maps.googleapis.com/maps/api/js?key=AIzaSyBXeByNQtscFzqtRiiq1Rp0yn2z9fvj2Kc&callback=initMap');

        if ($('script[src*="https://maps.googleapis.com"]').length === 0) {
            console.log('Maps API not loaded');
        } else {
            console.log('Maps API loaded');
        }
    } else {
        console.log('Maps API already loaded');
    }
}

function loadScript(scriptLocationAndName) {
    var head = document.getElementsByTagName('head')[0];
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = scriptLocationAndName;
    head.appendChild(script);
}

// noinspection JSUnusedGlobalSymbols
function initMap() {
    console.log("Calling initMap");

    // Add the getbounds functions
    google.maps.Polyline.prototype.getBounds = function() {
        var bounds = new google.maps.LatLngBounds();
        this.getPath().forEach(function(item) {
            bounds.extend(new google.maps.LatLng(item.lat(), item.lng()));
        });
        return bounds;
    };

    var hometown = {
        lat: 52.0278426,
        lng: 5.1630019
    };

    map = new google.maps.Map(document.getElementById('map-canvas'), {
        zoom: 8,
        center: hometown,
        mapTypeId: google.maps.MapTypeId.SATELLITE
    });
}

function flightModeDetailsForCode(flightMode) {
    var flightModes = [];
    flightModes[0] = {
        name: "STABILIZE",
        color: "#d4edda"
    };
    flightModes[1] = {
        name: "ACRO",
        color: "#ffffff"
    };
    flightModes[2] = {
        name: "ALT_HOLD",
        color: "#fff3cd"
    };
    flightModes[3] = {
        name: "AUTO",
        color: "#cce5ff"
    };
    flightModes[4] = {
        name: "GUIDED",
        color: "#ffffff"
    };
    flightModes[5] = {
        name: "LOITER",
        color: "#ffffff"
    };
    flightModes[6] = {
        name: "RTL",
        color: "#d1ecf1"
    };
    flightModes[7] = {
        name: "CIRCLE",
        color: "#ffffff"
    };
    flightModes[9] = {
        name: "LAND",
        color: "#ffffff"
    };
    flightModes[11] = {
        name: "DRIFT",
        color: "#ffffff"
    };
    flightModes[13] = {
        name: "SPORT",
        color: "#ffffff"
    };
    flightModes[14] = {
        name: "FLIP",
        color: "#ffffff"
    };
    flightModes[15] = {
        name: "AUTOTUNE",
        color: "#ffffff"
    };
    flightModes[16] = {
        name: "POSHOLD",
        color: "#ffeeba"
    };
    flightModes[17] = {
        name: "BRAKE",
        color: "#ffffff"
    };
    flightModes[18] = {
        name: "THROW",
        color: "#ffffff"
    };
    flightModes[19] = {
        name: "AVOID_ADSB",
        color: "#ffffff"
    };
    flightModes[20] = {
        name: "GUIDED_NOGPS",
        color: "#ffffff"
    };
    flightModes[21] = {
        name: "SMART_RTL",
        color: "#ffffff"
    };

    return flightModes[flightMode]
}

$('a.nav-link:contains("Home")')
    .on('click', function(event) {
        event.preventDefault();
        showIndexPage()
    });
$('a.nav-link:contains("Upload")')
    .on('click', function(event) {
        event.preventDefault();
        showUploadPage()
    });
$('a.nav-link:contains("View")')
    .on('click', function(event) {
        event.preventDefault();
        showBrowserPage()
    });
$('a.btn:contains("Upload")')
    .on('click', function(event) {
        event.preventDefault();
        showUploadPage()
    });
$('a.btn:contains("View")')
    .on('click', function(event) {
        event.preventDefault();
        showBrowserPage()
    });