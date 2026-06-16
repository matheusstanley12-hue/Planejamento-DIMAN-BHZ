const fs = require('fs');
let code = fs.readFileSync('js/modules/modules-1.js', 'utf8');
code = code.replace(/\\\${/g, '${');
code = code.replace(/\\\`/g, '`');
fs.writeFileSync('js/modules/modules-1.js', code);
console.log('Fixed escaped chars');
