# README

## 如何为scala项目做jar包
编写`MANIFEST.MF`  
```
Main-Class: me.tanglizi.lexer.LexerScanner
Class-Path: scala-library-2.13.0.jar
```

打包：  
```bash
cd lexical-scanner/src/main/scala/
scalac me/tanglizi/lexer/LexerScanner.scala me/tanglizi/lexer/type/StateType.scala me/tanglizi/lexer/type/TokenType.scala
jar -cfm lexer.jar MANIFEST.MF .
```

## 如何运行该jar包

注意当前目录下包含`scala-library-2.13.0.jar`作为依赖文件  
```bash
cd lexical-scanner
java -jar lexer.jar testcase/custom-test1.txt out.txt err.txt
```
