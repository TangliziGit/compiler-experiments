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
const EPS = '[EPS]';
const EOF = '[EOF]';

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
                x.lookahead = new Set(_x.lookahead);
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

const isTerm = (x) => !/<.+/.test(x);
const subSet = (set, xs) => {
    const res = new Set(set);
    for (const x of xs) res.delete(x);
    return res;
};

const Follow = {};

const follow = (x) => {
    let set = new Set([EOF]);

    for (const state of Object.keys(R)) {
        for (const rule of R[state]) {
            const idx = rule.content.indexOf(x);

            if (idx === -1) continue;
            if (idx !== rule.content.length-1) {
                const tail = rule.content.slice(idx+1);
                if (rule.name === tail[0]) continue;
                set = new Set([...set, ...first(tail)]);
            } else {
                if (rule.name === x) continue;
                set = new Set([...set, ...follow(rule.name)]);
            }
        }
    }

    Follow[x] = Array.from(set);
    return set;
};

const First = {};

const first = (xs, parent = null) => {
    let set = new Set();

    for (let i=0; i<xs.length; i++) {
        const x = xs[i];

        if (isTerm(x)){
            set.add(x);
            First[xs] = Array.from(set);
            return set;
        } else {
            const nextFirst = R[x]
                .map(r => {
                    if (r.content.length === 0)
                        return follow(r.name);
                    else
                        return first(r.content);
                })
                .reduce((set, s) => {
                    return new Set([...set, ...s]);
                }, new Set());

            set = new Set([...set, ...subSet(nextFirst, [EPS])]);

            if (!nextFirst.has(EPS)) {
                First[xs] = Array.from(set);
                return set;
            }
        }
    }

    if (parent === null)
        set.add(EPS);
    else
        set = new Set([...set, ...parent]);

    First[xs] = Array.from(set);
    return set;
};

const closure = (startRules, vis = new Set()) => {
    let rules = new Set();

    for (const rule of startRules) {
        if (rule.length <= rule.count) continue;
        const nextToken = rule.content[rule.count];

        const hashCode = hash(rule);
        if (!isTerm(nextToken) && !vis.has(hashCode)) {
            // 处理非终结符
            const nextRules = R[nextToken]
                .map(_x => {
                    const x = clone(_x);
                    x.lookahead = first(rule.content.slice(rule.count+1), rule.lookahead);
                    return x;
                });

            rules = new Set([...rules, ...nextRules]);
            vis.add(hashCode);
        }
    }

    if (rules.size === 0)
        return new Set(startRules);
    // key point 3
    // 计算起始规则的闭包
    const nextClosure = closure(Array.from(rules), vis);

    for (const nextRule of nextClosure) {
        const likeRules = Array.from(rules)
            .filter(r => {
                return nextRule.name === r.name
                    && nextRule.count === r.count
                    && _.isEqual(nextRule.content, r.content)
            });

        if (likeRules.length === 0) {
            rules.add(nextRule);
            continue;
        }

        for (const likeRule of likeRules) {
            nextRule.lookahead = new Set([...nextRule.lookahead, ...likeRule.lookahead]);
            rules.delete(likeRule);
        }
        rules.add(nextRule);
    }

    return new Set([...startRules, ...rules]);
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

                const lookahead = Array.from(x.lookahead);
                return xs + `${x.name} ::= ${rule.join(' ')}, ${lookahead.join(' / ')} \\l`;
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
        const termRules = state.rules
            .filter(x => x.count >= x.content.length);

        for (const rule of termRules) {
            if (action[state.index] === undefined)
                action[state.index] = {};
            if (goto[state.index] === undefined)
                goto[state.index] = {};

            // key point 5: handle reduce action
            if (rule.name === '<ExpressionTemp>' ||
                rule.name === '<Expression>') {

                // passed.
                // if (action[state.index][';'] !== undefined
                //     && action[state.index][';'] !== 'Reduce') {
                //     console.log('## 1 ;');
                //     console.log(state, rule);
                // }

                // if (action[state.index][']'] !== undefined
                //     && action[state.index][']'] !== 'Reduce') {
                //     console.log('## 1 ]');
                //     console.log(state, rule);
                // }

                // if (action[state.index][')'] !== undefined
                //     && action[state.index][')'] !== 'Reduce') {
                //     console.log('## 1 )');
                //     console.log(state, rule);
                // }

                action[state.index][';'] = 'Reduce';
                goto[state.index][';'] = [rule.name, rule.content.length];
                action[state.index][']'] = 'Reduce';
                goto[state.index][']'] = [rule.name, rule.content.length];
                action[state.index][')'] = 'Reduce';
                goto[state.index][')'] = [rule.name, rule.content.length];

            } else if (rule.name === '<Type>') {

                // passed.
                // if (action[state.index]['Identifier'] !== undefined) {
                //     console.log('## 2');
                //     console.log(state, rule);
                // }

                action[state.index]['Identifier'] = 'Reduce';
                goto[state.index]['Identifier'] = [rule.name, rule.content.length];

            } else {

                for (const lookahead of rule.lookahead){
                    // passed.
                    // if (action[state.index][lookahead] !== undefined &&
                    //     action[state.index][lookahead] !== 'Reduce' &&
                    //     goto[state.index][lookahead] !== rule.content.length){
                    //     console.log('## 3', lookahead);
                    //     console.log(state, rule, "origin:", goto[state.index][lookahead]);
                    // }

                    action[state.index][lookahead] = 'Reduce';
                    goto[state.index][lookahead] = [rule.name, rule.content.length];
                }
            }
        }
    }

    return [action, goto];
};

const startRules = R['<Goal>']
    .map(x => {
        x.lookahead = new Set([EOF]);
        return x
    });
build(startRules);

const _S = S
    .map(x => {
        x.rules = x.rules.map(y => {
            y.lookahead = Array.from(y.lookahead);
            return y;
        });
        return x;
    });

fs.writeFileSync('./out/dfa.dot', draw(S, E));
fs.writeFileSync('./out/states.json', JSON.stringify(_S));
fs.writeFileSync('./out/edges.json', JSON.stringify(E));

const [action, goto] = genTable(S, E);
fs.writeFileSync('./out/action.json', JSON.stringify(action));
fs.writeFileSync('./out/goto.json', JSON.stringify(goto));

console.log(Follow);
console.log(First);

