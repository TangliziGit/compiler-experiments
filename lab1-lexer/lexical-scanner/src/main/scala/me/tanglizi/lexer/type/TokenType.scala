package me.tanglizi.lexer.`type`

import scala.collection.immutable.ArraySeq

trait TokenType extends Enumeration

case class Error(line: String, information: String, rowNo: Int, colNo: Int) {
  override def toString: String =
    s"""($rowNo:$colNo): Error: $information
       |$line
       |${line.take(colNo).replaceAll("[^ \t]", " ")}^
       |""".stripMargin
}

case class Token(`type`: TokenType#Value, content: String) {
  override def toString: String = s"${GeneralToken.getName(`type`)}, $content"
}

object KeywordToken extends TokenType {
  val CLASS     = Value("class")
  val PUBLIC    = Value("public")
  val STATIC    = Value("static")
  val VOID      = Value("void")
  val MAIN      = Value("main")
  val STRING    = Value("string")
  val EXTENDS   = Value("extends")
  val RETURN    = Value("return")
  val INT       = Value("int")
  val BOOLEAN   = Value("boolean")
  val IF        = Value("if")
  val ELSE      = Value("else")
  val WHILE     = Value("while")
  val LENGTH    = Value("length")
  val TRUE      = Value("true")
  val FALSE     = Value("false")
  val THIS      = Value("this")
  val NEW       = Value("new")
  val PRINTLN   = Value("System.out.println")

  val tmp: List[String] = List()

  def isMatch(word: String): Boolean = KeywordToken.values
    .find(_.toString == word) match {
    case Some(_) => true
    case _ => false
  }

  def tokenContentsMatch(tokenContents: List[Token]): Option[(Token, List[Token])] = tokenContents match {
    case Token(_, "System") :: Token(_, ".") :: Token(_, "out") :: Token(_, ".")
      :: Token(_, "println") :: tail =>
      Some((Token(PRINTLN, "System.out.println"), tail))
    case _ =>
      None
  }

}

object PunctuationToken extends TokenType {
  val LT_PAREN  = Value("(")
  val LT_BRACK  = Value("[")
  val LT_BRACE  = Value("{")
  val RT_PAREN  = Value(")")
  val RT_BRACK  = Value("]")
  val RT_BRACE  = Value("}")
  val COMMA     = Value(",")
  val SEMI      = Value(";")
  val EQ        = Value("=")
  val AND       = Value("&")
  val LT        = Value("<")
  val POSI      = Value("+")
  val NEGA      = Value("-")
  val ASTER     = Value("*")
  val DOT       = Value(".")
  val EXC       = Value("!")

  def isMatch(word: String): Boolean = PunctuationToken.values
    .find(_.toString == word) match {
    case Some(_) => true
    case _ => false
  }

  def matchTokenType(word: String): TokenType#Value =
    PunctuationToken.values.find(_.toString == word).get

}

object GeneralToken extends TokenType {
  val ERROR, IDENTIFIER, INTEGER_LITERAL = Value

  def getName(value: TokenType#Value): String = value match {
    case GeneralToken.IDENTIFIER      => "IDENTIFIER"
    case GeneralToken.INTEGER_LITERAL => "INTEGER_LITERAL"
    case GeneralToken.ERROR           => "ERROR"
    case KeywordToken.CLASS           => "CLASS"
    case KeywordToken.PUBLIC          => "PUBLIC"
    case KeywordToken.STATIC          => "STATIC"
    case KeywordToken.VOID            => "VOID"
    case KeywordToken.MAIN            => "MAIN"
    case KeywordToken.STRING          => "STRING"
    case KeywordToken.EXTENDS         => "EXTENDS"
    case KeywordToken.RETURN          => "RETURN"
    case KeywordToken.INT             => "INT"
    case KeywordToken.BOOLEAN         => "BOOLEAN"
    case KeywordToken.IF              => "IF"
    case KeywordToken.ELSE            => "ELSE"
    case KeywordToken.WHILE           => "WHILE"
    case KeywordToken.LENGTH          => "LENGTH"
    case KeywordToken.TRUE            => "TRUE"
    case KeywordToken.FALSE           => "FALSE"
    case KeywordToken.THIS            => "THIS"
    case KeywordToken.NEW             => "NEW"
    case KeywordToken.PRINTLN         => "PRINTLN"
    case PunctuationToken.LT_PAREN    => "LT_PAREN"
    case PunctuationToken.LT_BRACK    => "LT_BRACK"
    case PunctuationToken.LT_BRACE    => "LT_BRACE"
    case PunctuationToken.RT_PAREN    => "RT_PAREN"
    case PunctuationToken.RT_BRACK    => "RT_BRACK"
    case PunctuationToken.RT_BRACE    => "RT_BRACE"
    case PunctuationToken.COMMA       => "COMMA"
    case PunctuationToken.SEMI        => "SEMI"
    case PunctuationToken.EQ          => "EQ"
    case PunctuationToken.AND         => "AND"
    case PunctuationToken.LT          => "LT"
    case PunctuationToken.POSI        => "POSI"
    case PunctuationToken.NEGA        => "NEGA"
    case PunctuationToken.ASTER       => "ASTER"
    case PunctuationToken.DOT         => "DOT"
    case PunctuationToken.EXC         => "EXC"
    case _                            => ""
  }
}

