// Transform from 0(OFF), 1-126(Low), 127-254(Medium), 255(High) to 0-3
(function(inStr) {
    var val = Math.round((100*inStr)/255);
    if (val === 0) return "0";
    if (val >= 1 && val <= 49) return '1';
    if (val >= 50 && val <= 99) return '2';
    if (val == 100) return "3";
})(input)
