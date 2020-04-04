package me.tanglizi.lexer

import java.io.File

import org.junit._
import Assert._

import scala.io.Source

@Test
class AppTest {

    @Test
    def testLexerScanner(): Unit = {
      new File("testcase")
        .listFiles(f => f.isFile && f.getName.endsWith("txt"))
        .foreach( testcase => {
          val path = testcase.getAbsolutePath
          LexerScanner.main(Array(path, path + ".out", path + ".err"))
        })
    }

}


