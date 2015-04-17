// Transform from OFF, 1-99, ON to 0 - 100
(function(inStr) {
    if (inStr === 'OFF' || inStr === '0') return 'off';
    if (inStr === 'ON') return 'on';
    if (inStr === 'DECREASE') return 'dim';
    if (inStr === 'INCREASE') return 'brt';
    if (inStr > 0 && inStr < 100) return 'on,' + inStr;
})(input)
