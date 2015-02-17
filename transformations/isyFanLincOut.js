// Transform from 0-3 to 0(OFF), 63(Low), 191(Medium), 255(High)
(function(inStr) {
    if (val === 0) return "off";
    if (val === 1) return 'on,25';
    if (val === 2) return 'on,75';
    if (val === 3) return "on";
})(input)
