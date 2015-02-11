// Transform from 0-3 to 0(OFF), 63(Low), 191(Medium), 255(High)
(function(inStr) {
    if (val === 0) val="0";
    if (val === 1) val='25';
    if (val === 2) val='75';
    if (val === 3) val="100";
    return val;
})(input)
