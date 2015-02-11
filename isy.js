var moment = require('moment');
var net = require('net');
var xml2js = require('xml2js').parseString;
var mqtt = require('mqtt');
var http = require('http');
var isyconfig = require('./isyconfig');
var isyDevType = require('./isydevtypes.js');

var deviceInfo = {};
var isyClient = '';
var mqttClient = '';

/*
 * Logging function
 */
function log(message) {
    console.log(moment().format() + ' ' + message);
}

/*
* Convert 0 - 255 to 0 - 100 and 0 - 100 to 0 - 255
*/
function minMaxConversion(max, value) {
  if (max !== undefined && value !== undefined) {
    if (max === 100) {
      return Math.round((100*value)/255);

    } else if (max === 255) {
      return Math.round((255*value)/100);

    }
  }
}

/*
 * MQTT Client Connect
 */
mqttClient = mqtt.createClient(isyconfig.mqttConfig.port, isyconfig.mqttConfig.host);

// listen for control events
mqttClient.subscribe(isyconfig.mqttConfig.controlTopic + '/#');

/*
 * Listen to messages from subscribed MQTT topics
 */
mqttClient.on('message', function (topic, message) {
  if (isyconfig.verbose) {
    log('Incoming message: Topic: ' + topic + ' Message: ' + message);
  }

  // Control message
  var controlTopicRE = new RegExp(isyconfig.mqttConfig.controlTopic + "\/(\\S+)");
  var controlMatch = topic.match(controlTopicRE);

  if (controlMatch) {
    var controlData = controlMatch[1].split('\/');
    var node = controlData[0];
    var command = controlData[1];
    var action = message.toString();

    log('Node: ' + node + ' Command: ' + command + ' Action: ' + action);

    parseCommand(node, command, action);
  }

});

mqttClient.on('connect', function(packet) {
  if (isyconfig.verbose) {
    log('Connected to mqtt broker.');
  }

});

mqttClient.on('close', function(err) {
  log('Closed connection from mqtt broker.');
});

//mqttClient.end();

/*
 * Publish events to MQTT broker
 */
function publishMQTT(topic, message) {
  if (isyconfig.verbose) {
    log('Sending message to mqtt broker.');
  }

  mqttClient.publish(topic, message);
}

/*
 * Parse and prep incoming commands for sending to ISY controller.
 */
function parseCommand(node, command, action) {
  var nodeURLEncoded = node.replace(/\./g, '%20');

  // Poll node
  // /rest/query/<node-id>
  // Queries the given node
  if (command === 'poll') {
    if (isyconfig.verbose) {
      log('Sending poll command to isy for node: ' + node);
    }

    sendCommand('GET', '/rest/query/' + nodeURLEncoded);

  // Get status of node
  // /rest/status/<node-id>
  // Returns the status for the given node
  } else if (command === 'status') {
    if (isyconfig.verbose) {
      log('Sending status command to isy for node: ' + node);
    }

    sendCommand('GET', '/rest/status/' + nodeURLEncoded);

  // Security control
  // /rest/nodes/<node-id>/SECMD/<action-name>
  // Send security command to node (e.g. door lock)
  // <action-name>
  // 0 = unlock | 1 = lock
  } else if (command === 'secmd') {
    if (isyconfig.verbose) {
      log('Sending security command to isy for node: ' + node);
    }

    if (action.match(/0|1/)) {
      sendCommand('GET', '/rest/nodes/' + nodeURLEncoded + '/SECMD/' + action);
    }

  // Set climate mode
  // /rest/nodes/<node-id>/CLIMD/<action-name>
  // e.g. /rest/nodes/1E 4 2E 1/CLIMD/0
  // <action-name>
  // 0 = off | 1 = heat | 2 = cool | 3 = auto | 4 = fan | 5 = program auto |
  // 6 = program heat | 7 = program cool
  } else if (command === 'climd') {
    if (isyconfig.verbose) {
      log('Sending climate mode command to isy for node: ' + node);
    }

    if (action.match(/[0-7]/)) {
      sendCommand('GET', '/rest/nodes/' + nodeURLEncoded + '/CLIMD/' + action);
    }

  // Set climate fan state
  // /rest/nodes/<node-id>/CLIFS/<action-name>
  // e.g. /rest/nodes/1E 4 2E 1/CLIFS/0
  // <action-name>
  // 0 = auto | 1 = auto
  } else if (command === 'clifs') {
    if (isyconfig.verbose) {
      log('Sending climate fan state command to isy for node: ' + node);
    }

    if (action.match(/0|1/)) {
      sendCommand('GET', '/rest/nodes/' + nodeURLEncoded + '/CLIFS/' + action);
    }

  // Set climate heat set point
  // /rest/nodes/<node-id>/CLISPH/<temp>
  // e.g. /rest/nodes/1E 4 2E 1/CLISPH/68
  // <temp>
  // numeric value in F
  } else if (command === 'clisph') {
    if (isyconfig.verbose) {
      log('Sending climate heat set point command to isy for node: ' + node);
    }

    sendCommand('GET', '/rest/nodes/' + nodeURLEncoded + '/CLISPH/' + action);

  // Set climate cool set point
  // /rest/nodes/<node-id>/CLISPC/<temp>
  // e.g. /rest/nodes/1E 4 2E 1/CLISPC/72
  // <temp>
  // numeric value in F
  } else if (command === 'clispc') {
    if (isyconfig.verbose) {
      log('Sending climate cool set point command to isy for node: ' + node);
    }

    sendCommand('GET', '/rest/nodes/' + nodeURLEncoded + '/CLISPC/' + action);

  // Run program control
  // /rest/programs/<program-id>/<program-cmd>
  // e.g. /rest/program/0032/runThen -- Runs a command for a single program
  // <program-cmd>
  // run | runThen | runElse | stop | enable | disable | enableRunAtStartup |
  // disableRunAtStartup
  // 'runIf' is supported as well, but 'run' should be used instead.
  } else if (command === 'program') {
    if (isyconfig.verbose) {
      log('Sending program command to isy for program: ' + node);
    }

    if (action.match(/run|runThen|runElse|stop|enable|disable|enableRunAtStartup|disableRunAtStartup/)) {
      sendCommand('GET', '/rest/programs/' + nodeURLEncoded + '/' + action);
    }

  // Run Fast Off
  // /rest/nodes/<node-id>/cmd/DFOF
  //
  } else if (command === "dfof") {
    if (isyconfig.verbose) {
      log('Sending fast off command to isy for node: ' + node);
    }

    sendCommand('GET', '/rest/nodes/' + nodeURLEncoded + '/cmd/DFOF');

  // Run Fast On
  // /rest/nodes/<node-id>/cmd/DFON
  //
  } else if (command === "dfon") {
    if (isyconfig.verbose) {
      log('Sending fast on command to isy for node: ' + node);
    }

    sendCommand('GET', '/rest/nodes/' + nodeURLEncoded + '/cmd/DFON');

  // Run brt command
  // /rest/nodes/<node-id>/cmd/brt
  //
  } else if (command === "brt") {
    if (isyconfig.verbose) {
      log('Sending bright command to isy for node: ' + node);
    }

    sendCommand('GET', '/rest/nodes/' + nodeURLEncoded + '/cmd/BRT');

  // Run dim command
  // /rest/nodes/<node-id>/cmd/dim
  //
  } else if (command === "dim") {
    if (isyconfig.verbose) {
      log('Sending dim command to isy for node: ' + node);
    }

    sendCommand('GET', '/rest/nodes/' + nodeURLEncoded + '/cmd/DIM');

  // If command is not defined, issue standard on / off action
  // /rest/nodes/<node-id>/cmd/<command-name>
  // <command-name>
  // don = on | dof = off
  // To send level to device
  // /rest/nodes/<node-id>/cmd/<command-name>/<action-name>
  } else {
    // On action sent
    if (action.match(/on/i) || action === '100') {
      if (isyconfig.verbose) {
        log('Sending on action to isy for node: ' + node);
      }

      sendCommand('GET', '/rest/nodes/' + nodeURLEncoded + '/cmd/DON');

    // Off action sent
    } else if (action.match(/off/i) || action === '0') {
      if (isyconfig.verbose) {
        log('Sending off action to isy for node: ' + node);
      }

      sendCommand('GET', '/rest/nodes/' + nodeURLEncoded + '/cmd/DOF');

    // Percentage action sent
    } else if (action.match(/[1-99]/)) {
      if (isyconfig.verbose) {
        log('Sending level action to isy for node: ' + node);
      }

      var actionConv = minMaxConversion(255, action);
      sendCommand('GET', '/rest/nodes/' + nodeURLEncoded + '/cmd/DON/' + actionConv);
    }
  }
}

/*
 * Function to send commands to the ISY controller.
 */
function sendCommand(method, path) {
  var options = {
    hostname: isyconfig.host,
    port: isyconfig.port,
    path: path,
    method: method,
    auth: isyconfig.user + ':' + isyconfig.password,
  };

  var req = http.request(options, function(res) {
    //log('STATUS: ' + res.statusCode);
    //log('HEADERS: ' + JSON.stringify(res.headers));
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      log('BODY: ' + chunk);
    });
  });

  req.end();

}

/*
* Get device information
*/
function getDeviceInfo() {
  if (isyconfig.verbose) {
    log('Getting device information from ISY.');
  }

  var options = {
    hostname: isyconfig.host,
    port: isyconfig.port,
    path: '/rest/nodes/devices',
    method: 'GET',
    auth: isyconfig.user + ':' + isyconfig.password,
  };

  var req = http.request(options, function(res) {
    var data = '';

    res.setEncoding('utf8');
    res.on('data', function (d) {
      if (isyconfig.verbose) {
        log('Recieving device data from ISY.');
      }

      data += d;			// Accumulate data as it arrives
    });

    res.on('end', function() {		// The entire response is in
      if (isyconfig.verbose) {
        log('Parsing device data from ISY.');
      }

      xml2js(data, {explicitArray:false, trim:true}, function(err, devInfo) {

        if (typeof(devInfo) === 'object') {
          if (devInfo.nodes.node) {
            for (var i in devInfo.nodes.node) {
              var node =  devInfo.nodes.node[i];
              var typeData = node.type.split('.');

              deviceInfo[node.address] = {
                name: node.name,
                parent: node.parent,
                cat: typeData[0],
                subCat: typeData[1],
              };
            }
          }
        }
      });
    });
  });

  req.on('error', function(e) {
    log('getDeviceInfo: ' + e.message);
    log('getDeviceInfo request: ' + JSON.stringify(options));
  });

  req.end();
}

/*
 * Parse ISY Events
 */
function parseEvents(xml) {
  xml2js(xml, {explicitArray:false, trim:true}, function(err, result) {
    if (isyconfig.debug) {
      log('DEBUG: Parsed xml: ');
      console.dir(result);
    }

    // Did we receive an object?
    if (typeof(result) === 'object') {

      // Do we have an event?
      if (result.Event) {
        // Does the event involve a node?
        if (result.Event.node) {
          var node = result.Event.node.replace(/ /g, '.');  // Convert spaces to periods (1E 4 58 1 to 1E.4.58.1)

          if (isyconfig.verbose) {
            log('Received incoming event for node: ' + result.Event.node + ' name: ' + deviceInfo[result.Event.node].name);
            log('Node: ' + node + ' Control: ' + result.Event.control + ' Action: ' + result.Event.action);
          }

          // Status Update
          if (result.Event.control && result.Event.control === 'ST') {
            // publish isy status event to mqtt (e.g. /isy/event/1E.4.58.1/status)
            publishMQTT(isyconfig.mqttConfig.eventTopic + '/' + node + '/status', result.Event.action);

          // Device On command
          } else if (result.Event.control && result.Event.control === 'DON') {
            // publish isy don event to mqtt (e.g. /isy/event/1E.4.58.1/don)
            publishMQTT(isyconfig.mqttConfig.eventTopic + '/' + node + '/don', result.Event.action);

          // Device Off command
          } else if (result.Event.control && result.Event.control === 'DOF') {
            // publish isy dof event to mqtt (e.g. /isy/event/1E.4.58.1/dof)
            publishMQTT(isyconfig.mqttConfig.eventTopic + '/' + node + '/dof', result.Event.action);

          // Device Fast On command
          } else if (result.Event.control && result.Event.control === 'DFON') {
            // publish isy dfon event to mqtt (e.g. /isy/event/1E.4.58.1/dfon)
            publishMQTT(isyconfig.mqttConfig.eventTopic + '/' + node + '/dfon', result.Event.action);

          // Device Fast Off command
          } else if (result.Event.control && result.Event.control === 'DFOF') {
            // publish isy dfof event to mqtt (e.g. /isy/event/1E.4.58.1/dfof)
            publishMQTT(isyconfig.mqttConfig.eventTopic + '/' + node + '/dfof', result.Event.action);

          // Device Bright command
          } else if (result.Event.control && result.Event.control === 'BRT') {
            // publish isy brt event to mqtt (e.g. /isy/event/1E.4.58.1/brt)
            publishMQTT(isyconfig.mqttConfig.eventTopic + '/' + node + '/brt', result.Event.action);

          // Device Dim command
          } else if (result.Event.control && result.Event.control === 'DIM') {
            // publish isy dim event to mqtt (e.g. /isy/event/1E.4.58.1/dim)
            publishMQTT(isyconfig.mqttConfig.eventTopic + '/' + node + '/dim', result.Event.action);

          }

          /*if (isyDevType.cat0[deviceInfo[result.Event.node].cat]) {
            log('We are a category 0 device.');

          } else if (isyDevType.cat1[deviceInfo[result.Event.node].cat]) {
            log('We are a category 1 device.');

          } else if (isyDevType.cat2[deviceInfo[result.Event.node].cat]) {
            log('We are a category 2 device.');

          }*/
        }
      }
    }
  });
}

/*
 * Parse incoming data and extract xml data from body.
 */
function parseIncomingData(data) {
  //var requestRE = /([A-Z]+) ([^ ]+) HTTP\/1.[01]/g;
  //var headerRE = /([A-Z][0-9a-zA-Z-]+): ?(.+)/g;
  var xmlRE = /(<\?xml.+>)/g;
  var xmlData = data.match(xmlRE);

  return xmlData;
}

/*
 * Subscription request to the ISY.
 */
function subscribe(isyClient) {
  if (isyconfig.verbose) {
    log('Subscribing to ISY.');
  }

  var auth = 'Basic ' + new Buffer(isyconfig.user + ':' + isyconfig.password).toString('base64');
  var body = '<s:Envelope><s:Body>\
    <u:Subscribe xmlns:u="urn:udicom:service:X_Insteon_Lighting_Service:1">\
    <reportURL>REUSE_SOCKET</reportURL><duration>infinite</duration></u:Subscribe>\
    </s:Body></s:Envelope>';

  isyClient.write('POST /services HTTP/1.1\r\n');
  isyClient.write('Host: ' + isyconfig.host + ':' + isyconfig.port + '\r\n');
  isyClient.write('Authorization: ' + auth + '\r\n');
  isyClient.write('SOAPACTION: urn:udi-com:service:X_Insteon_Lighting_Service:1#Subscribe\r\n');
  isyClient.write('Content-Length: ' + body.length + '\r\n');
  isyClient.write('Content-Type: text/xml; charset="utf-8"\r\n\r\n');
  isyClient.write(body);
  isyClient.write('\r\n');
}

/*
 * Create socket and connect to ISY.
 */
function connectISY() {
  isyClient = new net.Socket();
  isyClient.connect(isyconfig.port, isyconfig.host, function() {
    if (isyconfig.verbose) {
      log('Connected to ISY!');
    }

    isyClient.setEncoding("utf8");
    subscribe(isyClient);
  });

  isyClient.on('data', function(data) {
    if (isyconfig.debug) {
      log('DEBUG: Incoming: ' + data.toString());
    }

    var result = parseIncomingData(data);

    if (typeof(result) !== 'undefined' || result !== null) {

      for (var i in result) {
        if (isyconfig.debug) {
          log('DEBUG: Extracted xml: ' + result[i]);
        }

        parseEvents(result[i]);
      }
    }

    //isyClient.end();

  });

  isyClient.on('error', function (e) {
      log('Error: ' + e.toString());

  });

  isyClient.on('end', function() {
    if (isyconfig.verbose) {
      log('Disconnected from ISY.');

      // reconnect if disconnected, wait 5 seconds before reconnecting
      if (isyconfig.reconnect) {
        if (isyconfig.verbose) {
          log('Reconnecting to ISY, waiting 5 seconds.');
        }

        setTimeout(connectISY(), 5*1000);
      }
    }
  });
}

/*
 * Catch control-c and gracefully exit
 */
process.on('SIGINT', function() {
  log("Caught interrupt signal");
  isyconfig.reconnect = false;

  log('Disconnecting from ISY controller.');
  isyClient.end();
  log('Disconnecting from mqtt broker.');
  mqttClient.end();
  //process.exit();
});

getDeviceInfo();
connectISY();
