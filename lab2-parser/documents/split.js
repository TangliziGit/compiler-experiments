const spawn = require('child_process').spawn;
const parser = require('./ast-parser.js');
const fs = require('fs');
const _ = require('lodash');

text = fs.readFileSync('ast.dot').toString();

const [gs, es] = parser.parse(text);

const getContent = (g, e) => {
    const ee = e 
        .map(x => x.join(' -> '))
        .join('\n        ');
    return `digraph {

    subgraph ${g.name} {${g.content}}

    {
        ${ee}
    }
}`
};

const image = (name, path) => `![${name}](${path})\n`;

let [g, e] = [0, 0];
let images = "";
while (g < gs.length && e < es.length) {
    const gg = gs[g];
    const ee = es[e];
    const name = gg.name;

    if (gg.content.match(/\n/g).length <= 3) {
        const content = getContent(gg, [[]]);

        fs.writeFileSync(`ast/${name}.dot`, content);
        spawn('dot', ['-Tpng', `ast/${name}.dot`, '-o', `ast/${name}.png`]);

        g++;
    } else {
        const content = getContent(gg, ee);

        fs.writeFileSync(`ast/${name}.dot`, content);
        spawn('dot', ['-Tpng', `ast/${name}.dot`, '-o', `ast/${name}.png`]);

        g++; e++;
    }

    images += image(name, `ast/${name}.png`);
}

console.log(images);
