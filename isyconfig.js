/*  Config options for isy.js
 *  Edit this file to match your configuration.
 */

var isyconfig = {
    verbose: true,
    debug: false,
    host: '127.0.0.1',		// Hostname or IP address of the ISY 99(4)i controller.
    port: 80,// Port, normally 80
    user: 'user',  // ISY Username
    password: 'pass',  // ISY password
    reconnect: true,  // Reconnect if connection if disconnected

    // To publish status updates to mqtt, specify the host and port of the mqtt server
    // The topic will be the string here, plus the type of event and device name
    // with white spaces replaced with periods.
    /// If the host is null, no mqtt updates will be attempted.
    mqttConfig: { host: 'localhost', port: 1883, eventTopic: '/isy/event', controlTopic: '/isy/control' },

};

module.exports = isyconfig;
