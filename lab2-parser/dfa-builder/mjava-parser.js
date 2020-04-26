const fs = require('fs');

const states = JSON.parse(fs.readFileSync('out/states.json').toString());
const edges = JSON.parse(fs.readFileSync('out/edges.json').toString());
const Action = JSON.parse(fs.readFileSync('out/action.json').toString());
const Goto = JSON.parse(fs.readFileSync('out/goto.json').toString());

const tokens = fs.readFileSync('samples/out.txt').toString()
    .split('\n')
    .map(x => x.split(', '));

let symStack = [], staStack = [0];
let tokenId = 0, token = tokens[0];

const show = (x) => JSON.stringify(x, null, 2);
const isTerm = (token) => !/<.+/.test(token[0]);
const convert = (x) => {
    if (/<.+/.test(x[0])) return x[0];
    if (x[1] === 'String') return 'String';
    if (x[0] === 'IDENTIFIER') return 'Identifier';
    if (x[0] === 'INTEGER_LITERAL') return 'IntegerLiteral';
    return x[1];
};

while (true) {
    const state = staStack[staStack.length-1];
    const tokenType = convert(token);
    const action = Action[state][tokenType];

    console.log(state, tokenType, action, Goto[state][tokenType]);
    console.log(show(states[state]));
    console.log('\n');
    // console.log(Action[state], Goto[state], token);
    // console.log(states[state]);

    if (action === undefined || Goto[state][tokenType] === undefined) {
        console.log(state, token);
        console.log(Action[state]);
        for (const rule of states[state].rules)
            console.log(rule);

        console.log('\nsymStack:');
        for (const token of symStack)
            console.log(token);
        break;
    }

    if (action === 'Shift') {

        const nextState = Goto[state][tokenType];
        staStack.push(nextState);
        symStack.push(token);
        if (isTerm(token)) tokenId++;
        token = tokens[tokenId];

    } else if (action === 'Reduce') {

        const [name, length] = Goto[state][tokenType];
        let children = [];
        for (let i=0; i<length; i++){
            staStack.pop();
            children.push(symStack.pop());
        }
        token = [name, children];

    } else if (action === 'Accept') {

    } else if (action === 'Error') {

    }
}
