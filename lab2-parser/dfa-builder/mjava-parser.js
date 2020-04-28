const fs = require('fs');
const spawn = require('child_process').spawn;
const readline = require('readline');
const types = require('./type');

const states = JSON.parse(fs.readFileSync('out/states.json').toString());
const Action = JSON.parse(fs.readFileSync('out/action.json').toString());
const Goto = JSON.parse(fs.readFileSync('out/goto.json').toString());

const getTokens = async (file) => {
    const lexer = spawn('java', ['-jar', 'tools/lexer.jar', file, 'samples/out.txt', 'samples/err.txt']);
    const liner = readline.createInterface({
        input: lexer.stdout,
    });

    for await (const line of liner) {}
    return fs.readFileSync('samples/out.txt').toString()
        .split('\n')
        .map(x => x.split(', '))
        .concat([['[EOF]', "[EOF]", -1, -1]]);
};

const analyse = async (file) => {

    const source = fs.readFileSync(file).toString().split('\n');
    const tokens = await getTokens(file);

    const isTerm = (token) => !/<.+/.test(token[0]);
    const convert = (x) => {
        if (/<.+/.test(x[0])) return x[0];
        if (x[0] === 'String' || x[1] === 'String') return 'String';
        if (x[0] === 'IDENTIFIER') return 'Identifier';
        if (x[0] === 'INTEGER_LITERAL') return 'IntegerLiteral';
        return x[1];
    };

    let symStack = [], staStack = [0];
    let tokenId = 0, token = tokens[0];

    while (true) {
        const state = staStack[staStack.length-1];
        const tokenType = convert(token);
        const action = Action[state][tokenType];

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
            token = [name, children.reverse()];

        } else if (action === 'Accept') {

            const [name, length] = Goto[state][tokenType];
            let children = [];
            for (let i=0; i<length; i++){
                staStack.pop();
                children.push(symStack.pop());
            }
            token = [name, children.reverse()];
            break;

        } else if (action === undefined) {
            const expected = Object.keys(Action[state]).join(', ');
            const lastToken = symStack[symStack.length-1][1];
            console.error(`(${token[2]+1}:${token[3]}): Error: expect [${expected}] after \`${lastToken}\``);
            console.error(source[token[2]]);
            console.error(' '.repeat(token[3]-2) + '^\n');

            console.error('Detail error information:');
            console.error(`In LR state ${state}, can not find next action on [ ${token[0]}, ${token[1]} ]`);
            console.error('The rules in this state are(is) below:');
            for (const rule of states[state].rules)
                console.error(rule);

            console.error('Elements in symbol stack are:', symStack.map(x => x[0]));

            throw Error();
        }
    }

    return token;
};


const ast = async (tokenPromise) => {
    // <token>: [name, [<token>, ...]]

    const token = await tokenPromise;
    const padding = (terms) => {
        let pad = '';
        if (terms.length === 0) return pad;
        for (let i=0; i<terms.length-1; i++) {
            if (terms[i]) pad += '    ';
            else pad += '│   ';
        }
        if (terms[terms.length-1])
            return pad + '└── ';
        return pad + '├── ';
    };

    const format = (token) => {
        const nextTokens = token[1];
        let node = {
            "name": token[0],
            "type": null, "kind": null,
            "attr": null,
            "chlid": []
        };

        const forEachRightRecursiveTokens = (token, func) => {
            while (token[1].length !== 0) {
                func(token[1]);
                token = token[1][token[1].length - 1];
            }
        };

        if (token[0] === '<Goal>') {
            node.type = types.GoalType;
            // handle MainClass
            node.chlid.push(format(nextTokens[0]));

            // handle ClassDec
            const goalR1 = nextTokens[1];
            forEachRightRecursiveTokens(goalR1, (tokens) => {
                node.chlid.push(format(tokens[0]));
            });

        } else if (token[0] === '<MainClass>') {
            node.type = types.MainClassType;

            // handle attr: MainClass identifier, argument
            node.attr = [nextTokens[1][1], nextTokens[11][1]];

            // handle Statement
            node.chlid.push(format(nextTokens[14]));

        } else if (token[0] === '<ClassDeclaration>') {
            node.type = types.ClassDecType;

            // handle attr: class name, optional extend name
            node.attr = [nextTokens[1][1]];
            if (nextTokens[2][1].length !== 0)
                node.attr.push(nextTokens[2][1][1][1]);

            // handle VarDec
            const classDecR1 = nextTokens[4];
            forEachRightRecursiveTokens(classDecR1, (tokens) => {
                node.chlid.push(format(tokens[0]));
            });

            // handle MethodDec
            const classDecR2 = nextTokens[5];
            forEachRightRecursiveTokens(classDecR2, (tokens) => {
                node.chlid.push(format(tokens[0]));
            });

        } else if (token[0] === '<VarDeclaration>') {
            node.type = types.VarDecType;

            // handle attr: (type, id)
            const typeIdPair = [nextTokens[0][1].map(x => x[1]).join(''), nextTokens[1][1]];
            node.attr = typeIdPair;

        } else if (token[0] === '<MethodDeclaration>') {
            node.type = types.MethodDecType;

            // handle attr: (type, id)
            const typeIdPair = [nextTokens[1][1].map(x => x[1]).join(''), nextTokens[2][1]];
            node.attr = typeIdPair;

            // handle optional arguments (type, id)
            const methodDecO1 = nextTokens[4];
            forEachRightRecursiveTokens(methodDecO1, (tokens) => {
                const length = tokens.length;
                const typeIdPair =
                    [tokens[length - 3][1].map(x => x[1]).join(''), tokens[length - 2][1]];
                const argNode = {
                    name: '<Argument>',
                    type: types.ArgType,
                    attr: typeIdPair,
                    chlid: [], kind: null
                };
                node.chlid.push(argNode);
            });

            // handle VarDec
            const methodDecR1 = nextTokens[7];
            forEachRightRecursiveTokens(methodDecR1, (tokens) => {
                node.chlid.push(format(tokens[0]));
            });

            // handle Statement
            const methodDecR2 = nextTokens[8];
            forEachRightRecursiveTokens(methodDecR2, (tokens) => {
                node.chlid.push(format(tokens[0]));
            });

            // handle return Expression
            node.chlid.push(format(nextTokens[10]));

        } else if (token[0] === '<Statement>') {
            if (nextTokens[0][0] === 'IF') {
                node.type = types.StateType;
                node.kind = types.StateKinds.IfKind;

                // handle expression
                node.chlid.push(format(nextTokens[2]));
                // handle statement
                node.chlid.push(format(nextTokens[4]));
                // handle expression
                node.chlid.push(format(nextTokens[6]));
            } else if (nextTokens[0][0] === 'WHILE') {
                node.type = types.StateType;
                node.kind = types.StateKinds.WhileKind;

                // handle expression
                node.chlid.push(format(nextTokens[2]));
                // handle statement
                node.chlid.push(format(nextTokens[4]));
            } else if (nextTokens[0][0] === 'PRINTLN') {
                node.type = types.StateType;
                node.kind = types.StateKinds.PrintKind;

                // handle expression
                node.chlid.push(format(nextTokens[2]));
            } else if (nextTokens[1][0] === 'EQ') {
                node.type = types.StateType;
                node.kind = types.StateKinds.AssignKind;

                node.attr = nextTokens[0][1];
                // handle expression
                node.chlid.push(format(nextTokens[2]));
            } else if (nextTokens[1][0] === '<StatementR1>') {
                node.type = types.StateType;
                node.kind = types.StateKinds.StateKind;

                // handle Statement
                const statementR1 = nextTokens[1];
                forEachRightRecursiveTokens(statementR1, (tokens) => {
                    node.chlid.push(format(tokens[0]));
                });
            } else if (nextTokens[4][0] === 'EQ') {
                node.type = types.StateType;
                node.kind = types.StateKinds.ArrAssignKind;

                node.attr = nextTokens[0][1];
                // handle expression
                node.chlid.push(format(nextTokens[2]));
                // handle expression
                node.chlid.push(format(nextTokens[5]));
            }
        } else if (token[0] === '<Expression>') {
            if (['INTEGER_LITERAL', 'TRUE', 'FALSE', 'THIS', 'IDENTIFIER'].includes(nextTokens[0][0])) {
                node = nextTokens[0][1];
            } else if (nextTokens[0][1] === '(') {
                node.type = types.ExpType;
                node.kind = types.ExpKinds.ParKind;

                node.chlid.push(format(nextTokens[1]));
            } else if (nextTokens[0][1] === '!') {
                node.type = types.ExpType;
                node.kind = types.ExpKinds.NotKind;

                node.chlid.push(format(nextTokens[1]));
            } else if (nextTokens[1][1] === '&&') {
                node.type = types.ExpType;
                node.kind = types.ExpKinds.AndKind;

                // handle expression
                node.chlid.push(format(nextTokens[0]));
                // handle expression
                node.chlid.push(format(nextTokens[2]));
            } else if (nextTokens[1][1] === '<') {
                node.type = types.ExpType;
                node.kind = types.ExpKinds.LtKind;

                // handle expression
                node.chlid.push(format(nextTokens[0]));
                // handle expression
                node.chlid.push(format(nextTokens[2]));
            } else if (nextTokens[1][1] === '+') {
                node.type = types.ExpType;
                node.kind = types.ExpKinds.AddKind;

                // handle expression
                node.chlid.push(format(nextTokens[0]));
                // handle expression
                node.chlid.push(format(nextTokens[2]));
            } else if (nextTokens[1][1] === '-') {
                node.type = types.ExpType;
                node.kind = types.ExpKinds.SubKind;

                // handle expression
                node.chlid.push(format(nextTokens[0]));
                // handle expression
                node.chlid.push(format(nextTokens[2]));
            } else if (nextTokens[1][1] === '*') {
                node.type = types.ExpType;
                node.kind = types.ExpKinds.MultiKind;

                // handle expression
                node.chlid.push(format(nextTokens[0]));
                // handle expression
                node.chlid.push(format(nextTokens[2]));
            } else if (nextTokens[1][1] === '[') {
                node.type = types.ExpType;
                node.kind = types.ExpKinds.BraKind;

                // handle expression
                node.chlid.push(format(nextTokens[0]));
                // handle expression
                node.chlid.push(format(nextTokens[2]));
            } else if (nextTokens[1][1] === 'int') {
                node.type = types.ExpType;
                node.kind = types.ExpKinds.NewIntKind;

                node.chlid.push(format(nextTokens[3]));
            } else if (nextTokens[1][0] === 'IDENTIFIER') {
                node.type = types.ExpType;
                node.kind = types.ExpKinds.NewIdKind;

                node.attr = nextTokens[1][1];
            } else if (nextTokens[2][1] === 'length') {
                node.type = types.ExpType;
                node.kind = types.ExpKinds.LenKind;

                // handle expression
                node.chlid.push(format(nextTokens[0]));
            } else if (nextTokens[3][1] === '(') {
                node.type = types.ExpType;
                node.kind = types.ExpKinds.CallKind;

                node.attr = nextTokens[2][1];

                // handle expression
                node.chlid.push(format(nextTokens[0]));

                // handle optional expression
                const expressionO1 = nextTokens[4];
                forEachRightRecursiveTokens(expressionO1, (tokens) => {
                    const length = tokens.length;
                    node.chlid.push(format(tokens[length - 2]));
                })
            }
        }
        return node;
    };

    const output = (node, terms = []) => {
        const pad = padding(terms);
        if (typeof node === 'string') return `${pad}${node}`;

        let tree = `${pad}${node.name}`;

        if (node.kind !== null) {
            tree = `${tree}[${node.type}, ${node.kind}]`;
        } else {
            tree = `${tree}[${node.type}]`;
        }

        if (node.attr instanceof Array) {
            tree = `${tree}: ${node.attr.join(', ')}`;
        } else if (node.attr !== null) {
            tree = `${tree}: ${node.attr}`;
        }

        if (node.chlid.length !== 0) {
            tree = `${tree}\n`;
            for (let i=0; i<node.chlid.length-1; i++) {
                terms.push(false);
                tree = `${tree}${output(node.chlid[i], terms)}\n`;
                terms.pop();
            }
            terms.push(true);
            tree = `${tree}${output(node.chlid[node.chlid.length-1], terms)}`;
            terms.pop();
        }

        return tree;
    };

    return output(format(token));
};

const main = async () => {
    try {
        const tree = await ast(analyse(process.argv[2]));
        fs.writeFileSync('syntaxOut.txt', tree);
    } catch (e) {}
};

main();
