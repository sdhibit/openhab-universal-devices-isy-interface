// Transform from 0-255 to OFF, 1-99, ON
(function(inStr) {
    var val = Math.round((100*inStr)/255);
    if (inStr == "0") val="OFF";
    if (inStr == "255") val="ON";
    return val;
})(input)
