// Transform from 0-3 to 0(OFF), 25(Low), 75(Medium), 100(High)
(function(inStr) {
    if (inStr === '0') return 'off';
    if (inStr == '1') return 'on,25';
    if (inStr == '2') return 'on,75';
    if (inStr == '3') return 'on';
})(input)
