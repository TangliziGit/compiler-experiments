package me.tanglizi.lexer.`type`

object StateType extends Enumeration {
  type StateType = Value

  val START, DONE, ERROR,
  DIGIT, IDENTIFIER, UNDERLINE,
  SG_PUNC, DB_PUNC_FST, DB_PUNC_SEC = Value
  val TERMINAL: Array[StateType.Value] = Array(DONE, ERROR)
}
