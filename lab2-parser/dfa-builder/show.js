const fs = require('fs');

const states = JSON.parse(fs.readFileSync('states.json').toString());

const arg = process.argv[2];
console.log(JSON.stringify(states[arg], null, 2));
