package me.tanglizi.lexer

import java.io.PrintWriter

import me.tanglizi.lexer.`type`.StateType.StateType
import me.tanglizi.lexer.`type`.{Error, GeneralToken, KeywordToken, PunctuationToken, StateType, Token, TokenType}

import scala.collection.immutable.ArraySeq
import scala.collection.mutable.ArrayBuffer
import scala.io.{BufferedSource, Source}
import scala.util.matching.Regex

object LexerScanner {

  val separator: String = Regex.quote("[](){},;=<+-*!\t ")
  val splitRegex: String = s"(?<=[$separator])|(?=[$separator])"

  def main(args: Array[String]): Unit = {
    val srcFilename: String = args(0)
    val destFilename: String = args(1)
    val errFilename: String = args(2)

    val source: BufferedSource = Source.fromFile(srcFilename)
    val destWriter: PrintWriter = new PrintWriter(destFilename)
    val errWriter: PrintWriter = new PrintWriter(errFilename)

    val content: String = source.mkString

    val (tokens, errors) = scan(content)

    destWriter.print(tokens.mkString("\n"))
    errWriter.print(errors.mkString("\n"))

    destWriter.close()
    errWriter.close()
    source.close
  }

  private[LexerScanner] def scan(source: String): (List[Token], List[Error]) = {

    def autoMachineMatch(source: String): (List[Token], List[Error]) = {
      val tokens: ArrayBuffer[Token] = ArrayBuffer[Token]()
      val errors: ArrayBuffer[Error] = ArrayBuffer[Error]()

      var stateType: StateType.Value = StateType.START
      var tokenType: TokenType#Value = GeneralToken.ERROR

      var row = 0
      var col = 0

      var tokenContent = ""
      var errorContent = ""
      var sourceTail: String = source

      while (!StateType.TERMINAL.contains(stateType) && sourceTail != "") {

        var needPass: Boolean = false
        val (tmpStateType, tmpTokenType) = stateType match {
          case StateType.START => sourceTail.headOption match {
            case Some(head) if head.isDigit =>
              (StateType.DIGIT, GeneralToken.INTEGER_LITERAL)
            case Some(head) if head.isLetter =>
              (StateType.IDENTIFIER, GeneralToken.IDENTIFIER)
            case Some('&') =>
              (StateType.DB_PUNC_FST, PunctuationToken.AND)
            case Some(whiteSpace) if whiteSpace == ' ' || whiteSpace == '\t' =>
              (StateType.START, tokenType)
            case Some('\n') =>
              row += 1
              col = 0
              (StateType.START, tokenType)
            case Some(head) if PunctuationToken.isMatch(head.toString) =>
              (StateType.SG_PUNC, PunctuationToken.matchTokenType(head.toString))
            case Some('_') =>
              errorContent = s"the underline character should not existed here."
              needPass = true
              (StateType.ERROR, GeneralToken.ERROR)
            case Some(head) =>
              errorContent = s"the character `$head` is not existed lexically."
              needPass = true
              (StateType.ERROR, GeneralToken.ERROR)
          }

          case StateType.DIGIT => sourceTail.headOption match {
            case Some(head) if head.isDigit =>
              (StateType.DIGIT, GeneralToken.INTEGER_LITERAL)
            case _ =>
              (StateType.DONE, GeneralToken.INTEGER_LITERAL)
          }

          case StateType.IDENTIFIER => sourceTail.headOption match {
            case Some(head) if head.isLetter =>
              (StateType.IDENTIFIER, GeneralToken.IDENTIFIER)
            case Some(head) if head.isDigit =>
              (StateType.IDENTIFIER, GeneralToken.IDENTIFIER)
            case Some('_') =>
              (StateType.UNDERLINE, GeneralToken.IDENTIFIER)
            case _ =>
              (StateType.DONE, GeneralToken.IDENTIFIER)
          }

          case StateType.UNDERLINE => sourceTail.headOption match {
            case Some(head) if head.isLetter =>
              (StateType.IDENTIFIER, GeneralToken.IDENTIFIER)
            case Some(head) if head.isDigit =>
              (StateType.IDENTIFIER, GeneralToken.IDENTIFIER)
            case Some(head) =>
              errorContent = s"after the underline must be a letter or digit, not `$head`."
              (StateType.ERROR, GeneralToken.ERROR)
          }

          case StateType.SG_PUNC => sourceTail.headOption match {
            case _ =>
              (StateType.DONE, tokenType)
          }

          case StateType.DB_PUNC_FST => sourceTail.headOption match {
            case Some('&') =>
              (StateType.DB_PUNC_SEC, PunctuationToken.AND)
            case Some(head) =>
              errorContent = s"the AND operator is `&&`, not single `&` or `&$head`."
              (StateType.ERROR, GeneralToken.ERROR)
            case _ =>
              errorContent = s"the AND operator is `&&`, not single `&`."
              (StateType.ERROR, GeneralToken.ERROR)
          }

          case StateType.DB_PUNC_SEC => sourceTail.headOption match {
            case _ =>
              (StateType.DONE, PunctuationToken.AND)
          }

        }

        val (nextStateType, nextTokenType) = tmpStateType match {
          case StateType.DONE =>
            if (tokenType == GeneralToken.IDENTIFIER && KeywordToken.isMatch(tokenContent))
              tokens += Token(KeywordToken.withName(tokenContent), tokenContent)
            else
              tokens += Token(tmpTokenType, tokenContent)

            tokenContent = ""
            (StateType.START, GeneralToken.ERROR)

          case StateType.ERROR =>
            errors += Error("this line", errorContent, row, col-1)
            tokenContent = ""
            if (needPass) {
              col += 1
              sourceTail = sourceTail.tail
            }
            (StateType.START, GeneralToken.ERROR)

          case _ =>
            val head: Char = sourceTail.headOption.getOrElse(' ')
            if (head != ' ' && head != '\t' && head != '\n')
              tokenContent += head
            col += 1
            sourceTail = sourceTail.tail
            (tmpStateType, tmpTokenType)
        }

        stateType = nextStateType
        tokenType = nextTokenType
      }

      (tokens.toList, errors.toList)
    }

    var (rawTokens, rawErrors) = autoMachineMatch(source + '\n')

    println(rawTokens.mkString("\n"))
    var tokens: ArrayBuffer[Token] = ArrayBuffer[Token]()

    while (rawTokens.nonEmpty) {
      KeywordToken.tokenContentsMatch(rawTokens) match {
        case Some((token, restRawTokens)) =>
          tokens += token
          rawTokens = restRawTokens
        case None =>
          tokens += rawTokens.head
          rawTokens = rawTokens.tail
      }
    }

    val lines: Array[String] = source.split('\n')
    val errors: List[Error] = rawErrors
      .map(x => Error(lines(x.rowNo), x.information, x.rowNo, x.colNo))

    (tokens.toList, errors)
  }

}

