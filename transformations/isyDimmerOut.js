// Transform from OFF, 1-99, ON to 0 - 100
(function(inStr) {
    //var val = Math.round((255*inStr)/100);
    var val = inStr;
    if (inStr == "OFF") val="0";
    if (inStr == "ON") val="100";
    return val;
})(input)
