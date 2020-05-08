# compiler-experiments

To store the code of compiler experiment courses in nwpu.  



## How to run

For lexer:

`java -jar lab1-lexer/lexical-scanner/lexer.jar test-file.txt output.txt error.txt`



For parser:

`node lab2-parser/dfa-builder/mjava-parser.js test-file.txt`



For LALR(1) DFA bulider, it will read `tools/syntax.txt` as target program syntax such as `mjava` in this course:

```
cd lab2-parser/dfa-builder
node builder.js
```

then you will get:

1. `out/dfa.dot`, the file describe the DFA of target syntax.

   you can run `dot -Tpng dfa.dot -o dfa.png ` to get the image of DFA.

2. `out/states.json` and `out/edges.json`, store the states and edges of DFA.

3. `out/action.json` and `out/goto.json`, the action table and goto table.



## Main ideas

### Lexer

手动设计自动机，识别词素。

详见`词法分析设计方案-状态转换图.pdf`



### Parser

1. 设计`AST`

   设计实现抽象语法树, 同时实现了一种简洁的输出方式。

2. 实现`LALR(1)`自动机的生成

   完成泛用性较高的 `LALR(1)` 自动机的生成代码, `LALR(1)` 自动机是 `Simple LALR(2)` 的基础。

3. 实现`Simple LALR(2)`语法分析算法

   因为 `LALR(1)` 不能满足给定的文法,于是基于其提出 `Simple LALR(2)` 方法, 它对 `LALR(1)` 做了一个简单升级。

详⻅`语法分析设计方案-SimpleLALR2方法与抽象语法树.pdf `



## Structure

```
.
├── dfa-builder
│   ├── builder.js
│   ├── mjava-parser.js
│   ├── out
│   │   ├── action.json
│   │   ├── builder.log
│   │   ├── dfa.dot
│   │   ├── dfa.png
│   │   ├── edges.json
│   │   ├── goto.json
│   │   ├── states.json
│   │   └── time.log
│   ├── samples
│   │   ├── err.txt
│   │   └── out.txt
│   ├── testcase
│   │   ├── ClassDeclaration
│   │   ├── custom
│   │   ├── Expression
│   │   ├── Goal
│   │   ├── MainClass
│   │   ├── MethodDeclaration
│   │   ├── Statement
│   │   ├── Type
│   │   └── VarDeclaration
│   ├── tools
│   │   ├── lexer.jar
│   │   ├── scala-library-2.13.0.jar
│   │   ├── syntax-parser.js
│   │   ├── syntax.peg
│   │   └── syntax.txt
│   └── type.js
├── documents
│   ├── ast.dot
│   ├── ast-parser.js
│   ├── ast.peg
│   ├── readme.md
│   ├── readme.pdf
│   └── split.js
├── readme.pdf
└── 语法分析-实验要求
    ├── syntax.txt
    ├── 语法
    │   ├── ClassDeclaration
    │   ├── Expression
    │   ├── Goal
    │   ├── MainClass
    │   ├── MethodDeclaration
    │   ├── Statement
    │   ├── Type
    │   └── VarDeclaration
    ├── 语法分析程序撰写.zip
    ├── 语法分析课程实验要求 2.docx
    ├── 语法分析课程实验要求 2.pdf
    └── 语法测试文件.rar

26 directories, 81 files
```

