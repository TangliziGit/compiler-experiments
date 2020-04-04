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

    val splicedLines: Iterator[Array[String]] = source.getLines()
      .map(_
        .split(splitRegex)
        .filter(_ != "")
      )

    val (tokens, errors) = splicedLines
      .zipWithIndex
      .map((scan _).tupled)
      .foldLeft(ArraySeq[Token](), ArraySeq[Error]()) {
        case ((tokens, errors), (token, error)) => (tokens ++ token, errors ++ error)
      }

    destWriter.print(tokens.mkString("\n"))
    errWriter.print(errors.mkString("\n"))

    destWriter.close()
    errWriter.close()
    source.close
  }

  private[LexerScanner] def scan(line: Array[String], rowNo: Int): (ArraySeq[Token], ArraySeq[Error]) = line
    .scanLeft((0, "")){
      case ((colNo, _word), word) => (colNo + word.length, word)
    }
    .tail
    .foldLeft(ArraySeq[Token](), ArraySeq[Error]()) {
      case ((tokens, errors), (colNo, word)) if KeywordToken.isMatch(word) =>
        (tokens :+ KeywordToken.matchToken(word), errors)

      case ((tokens, errors), (colNo, whiteSpace)) if whiteSpace == " " || whiteSpace == "\t" =>
        (tokens, errors)

      case ((tokens, errors), (colNo, word)) =>
        val tokenBuffer: ArrayBuffer[Token] = ArrayBuffer[Token]()
        val errorBuffer: ArrayBuffer[Error] = ArrayBuffer[Error]()

        var state: StateType = StateType.START
        var tokenType: TokenType#Value = GeneralToken.ERROR

        var restWord: String = word
        var tokenWord: String = ""
        var errorInformation: String = ""

        while (!((StateType.TERMINAL contains state) && restWord == "")) {
          state match {
            case StateType.START => restWord.headOption match {
              case Some(head) if head.isDigit =>
                state = StateType.DIGIT
                tokenType = GeneralToken.INTEGER_LITERAL
              case Some(head) if head.isLetter =>
                state = StateType.IDENTIFIER
                tokenType = GeneralToken.IDENTIFIER
              case Some('&') =>
                state = StateType.DB_PUNC_FST
                tokenType = PunctuationToken.AND
              case Some(' ') =>
                state = StateType.START
              case Some(head) if PunctuationToken.isMatch(head.toString) =>
                state = StateType.SG_PUNC
                tokenType = PunctuationToken.matchTokenType(head.toString)
              case Some('_') =>
                state = StateType.ERROR
                tokenType = GeneralToken.ERROR
                errorInformation = s"the underline character should not existed here."
              case Some(head) =>
                state = StateType.ERROR
                tokenType = GeneralToken.ERROR
                errorInformation = s"the character `$head` is not existed lexically."
              case _ =>
                state = StateType.ERROR
                tokenType = GeneralToken.ERROR
                errorInformation = s"???"
            }

            case StateType.DIGIT => restWord.headOption match {
              case Some(head) if head.isDigit =>
                state = StateType.DIGIT
                tokenType = GeneralToken.INTEGER_LITERAL
              case _ =>
                state = StateType.DONE
                tokenType = GeneralToken.INTEGER_LITERAL
            }

            case StateType.IDENTIFIER => restWord.headOption match {
              case Some(head) if head.isLetter =>
                state = StateType.IDENTIFIER
                tokenType = GeneralToken.IDENTIFIER
              case Some(head) if head.isDigit =>
                state = StateType.DONE
                tokenType = GeneralToken.IDENTIFIER
              case Some('_') =>
                state = StateType.UNDERLINE
                tokenType = GeneralToken.IDENTIFIER
              case _ =>
                state = StateType.DONE
                tokenType = GeneralToken.IDENTIFIER
            }

            case StateType.UNDERLINE => restWord.headOption match {
              case Some(head) if head.isLetter =>
                state = StateType.IDENTIFIER
                tokenType = GeneralToken.IDENTIFIER
              case Some(head) if head.isDigit =>
                state = StateType.IDENTIFIER
                tokenType = GeneralToken.IDENTIFIER
              case Some(head) =>
                state = StateType.ERROR
                tokenType = GeneralToken.ERROR
                errorInformation = s"after the underline must be a letter or digit, not `$head`."
              case _ =>
                state = StateType.ERROR
                tokenType = GeneralToken.ERROR
                errorInformation = s"a letter or digit must follow the underline."
            }

            case StateType.SG_PUNC => restWord.headOption match {
              case _ => state = StateType.DONE
            }

            case StateType.DB_PUNC_FST => restWord.headOption match {
              case Some('&') =>
                state = StateType.DB_PUNC_SEC
                tokenType = PunctuationToken.AND
              case Some(head) =>
                state = StateType.ERROR
                tokenType = GeneralToken.ERROR
                errorInformation = s"the AND operator is `&&`, not single `&` or `&$head`."
              case _ =>
                state = StateType.ERROR
                tokenType = GeneralToken.ERROR
                errorInformation = s"the AND operator is `&&`, not single `&`."
            }

            case StateType.DB_PUNC_SEC => restWord.headOption match {
              case _ =>
                state = StateType.DONE
                tokenType = PunctuationToken.AND
            }
          }

          state match {
            case StateType.DONE =>
              tokenBuffer += Token(tokenType, tokenWord)
              tokenWord = ""
              if (restWord != "") state = StateType.START
            case StateType.ERROR =>
              tokenBuffer += Token(GeneralToken.ERROR, restWord.headOption.getOrElse("").toString)
              errorBuffer += Error(line.mkString, errorInformation, rowNo, colNo - restWord.length)
              tokenWord = ""
              restWord = restWord.tail
              if (restWord != "") state = StateType.START
            case _ =>
              val head: Char = restWord.headOption.getOrElse(' ')
              if (head != ' ') tokenWord += head
              restWord = restWord.tail
          }
        }

        (tokens ++ tokenBuffer, errors ++ errorBuffer)
    }

}

