const _ = require('lodash');
const fs = require('fs');
const hash = require('object-hash');
const parser = require("./syntax-parser");

const txt = fs.readFileSync('syntax.txt').toString();
const R = parser.parse(txt);

// state: {index: 0, rules: []}
// edge: {start: 0, end: 0, weight: 'a'}
// rule: {name: '<Goal>', content: ['<MC>', '{{', ...], count: 0}
let [S, E] = [[], []];
let G = {};
let nextStateIndex = 0;

const clone = (a) => JSON.parse(JSON.stringify(a));
const unzip = (arr) => {
    if (arr.length === 0) return [[], []];
    return arr[0].map((col, i) => arr.map(r => r[i]));
};

const build = (startRules) => {
    const outEdges = {};
    const state = {
        index: nextStateIndex++,
        rules: Array.from(closure(startRules))
    };

    S.push(state);

    for (const r of state.rules) {
        let next = r.content[r.count];

        if (outEdges[next] === undefined)
            outEdges[next] = [];
        outEdges[next].push(r);
    }

    const edges = [];
    for (const key of Object.keys(outEdges)) {
        const fromNextRules = outEdges[key]
            .map(_x => {
                const x = clone(_x);
                x.count++;
                return [_x, x];
            })
            .filter(xs => xs[1].count <= xs[1].content.length);   // 终结态
        const [fromRules, nextGeneratorRules] = unzip(fromNextRules);

        if (nextGeneratorRules.length === 0) continue;

        // key point 1: state rollback
        let hashed = hash(fromRules);
        if (G[hashed] !== undefined) {
            edges.push({
                start: state.index,
                end: G[hashed],
                weight: key
            });
        } else {
            edges.push({
                start: state.index,
                end: nextStateIndex,
                weight: key
            });
            G[hashed] = nextStateIndex;
            build(nextGeneratorRules);
        }

    }

    E = E.concat(edges);
    return state;
};

const closure = (startRules, vis = new Set()) => {
    let rules = new Set();

    for (const rule of startRules) {
        if (rule.length <= rule.count) continue;
        const nextToken = rule.content[rule.count];

        if (/<.+/.test(nextToken)) {
            if (!vis.has(nextToken)) {
                // 处理非终结符
                rules = new Set([...rules, ...R[nextToken]]);
                vis.add(nextToken);
            }
        }
    }

    if (rules.size === 0)
        return new Set(startRules);
    // key point 3
    // 计算起始规则的闭包
    return new Set([...startRules, ...rules, ...closure(Array.from(rules), vis)]);
};

const draw = (S, E) => {
    const escape = (text) => text
        .replace(/</g, '\\<')
        .replace(/>/g, '\\>')
        .replace(/{/g, '\\{')
        .replace(/}/g, '\\}');

    const [nodes, edges] = [[], []];

    for (const state of S) {
        const name = `n${state.index}`;
        const label = Array.from(state.rules)
            .reduce((xs, x) => {
                let rule = Array.from(x.content);
                rule.splice(x.count, 0, '.');
                return xs + `${x.name} ::= ${rule.join(' ')} \\l`;
            }, '');

        nodes.push(`${name}[shape="record" label="state ${state.index} \\l${escape(label)}"];`);
    }

    for (const edge of E) {
        const start = `n${edge.start}`;
        const end = `n${edge.end}`;
        const label = `${edge.weight}`;

        edges.push(`${start} -> ${end} [label="${label}"]`);
    }

    return `digraph {
    
    ${nodes.join('\n\t')}
    
    {
        ${edges.join('\n\t\t')}
    }
}`;
};

const genTable = (S, E) => {
    const goto = {};
    const action = {};

    for (const edge of E) {
        const start = edge.start;
        const end = edge.end;
        const wei = edge.weight;

        if (action[start] === undefined || goto[start] === undefined) {
            action[start] = {};
            goto[start] = {};
        }

        goto[start][wei] = end;
        action[start][wei] = 'Shift';
    }

    for (const state of S) {
        const termStates = state.rules
            .filter(x => x.count >= x.content.length);

        for (const term of termStates) {
            // key point 5: handle reduce action
            if (term.name === '<ExpressionTemp>' ||
                term.name === '<Expression>') {

                if (action[term.index] === undefined)
                    action[term.index] = {};

                action[term.index][';'] = 'Reduce';
                action[term.index][']'] = 'Reduce';
                action[term.index][')'] = 'Reduce';

            } else if (term.name === '<Type>') {

                if (action[term.index] === undefined)
                    action[term.index] = {};

                action[term.index]['Identifier'] = 'Reduce';

            } else {

                action[term.index] = {};
                action[term.index]['ALL'] = 'Reduce';
            }
        }
    }

    return [action, goto];
};

build(R['<Goal>']);

fs.writeFileSync('dfa.dot', draw(S, E));
fs.writeFileSync('states.json', JSON.stringify(S));
fs.writeFileSync('edges.json', JSON.stringify(E));

const [action, goto] = genTable(S, E);
console.log(action, goto);
