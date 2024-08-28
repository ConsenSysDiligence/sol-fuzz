Rules =
    head: Rule
    tail: (__ ";" __ r: Rule { return r; })* (__ ";" __)? {
        return tail.reduce((acc: any[], el: any) => {acc.push(el); return acc;}, [head]);
    }

Rule = 
    match: MatchPattern __ "=>" __ rewrite: RewritePattern {
        return [match, rewrite];
    }

Binding =
    name: BindingId __ "@" { return name; }

BindingId =
    "$"[a-zA-Z0-9_]* { return text(); }

// ======================= Match patterns =====================

MatchPattern
    = MatchLiteral
    / MatchAny
    / MatchNode
    / MatchArray
    / MatchElipsis

MatchLiteral =
    b: Binding? __ value: (StringLiteral / BigInt / Number)
    {
        return new MatchLiteral(b === null ? undefined : b, "", value)
    }

MatchAny =
    b: Binding? __ "*"
    {
        return new MatchAny(b === null ? undefined : b);
    }

MatchNode =
    b: Binding? __ constrName: Identifier __ "(" args: MatchPatternList? ")"
    {
        return new MatchNode(
            b === null ? undefined : b,
            constrName,
            args === null ? [] : args
        )
    }

MatchPatternList =
    head: MatchPattern tail: (__ "," __ p: MatchPattern { return p; })*
    {
        return tail.reduce((acc: any, el: any) => {acc.push(el); return acc}, [head]);
    }

MatchArray =
    b: Binding? __ "[" components: MatchPatternList? "]"
    {
        return new MatchArray(
            b === null ? undefined : b,
            components === null ? [] : components
        )
    }

MatchElipsis =
    b: Binding? __ "..."
    {
        return new MatchElipsis(
            b == null ? undefined : b
        )
    }

// ======================= Rewrite patterns =====================
RewritePattern
    = RewriteNode
    / RewriteLiteral
    / RewriteChoice
    / RewriteVar
    / RewriteArray

RewriteLiteral =
    value: (StringLiteral / BigInt / Number)
    {
        return new RWLiteral(value)
    }

RewriteNode =
    constrName: Identifier __ "(" args: RewritePatternList ")"
    {
        return new RWNode(
            constrName,
            args
        )
    }

RewritePatternList =
    head: RewritePattern tail: (__ "," __ p: RewritePattern { return p; })*
    {
        return tail.reduce((acc: any, el: any) => {acc.push(el); return acc}, [head]);
    }

RewriteArray =
    "[" components: RewritePatternList? "]"
    {
        return new RWArr( components === null ? [] : components )
    }

RewriteChoice =
    "any" __ "(" choices: RewritePatternList ")"
    {
        return new RWChoice(choices);
    }

RewriteVar = b: BindingId
    {
        return new RWVar(b);
    }

// ======================= Common Rules =====================
Identifier =
    [a-zA-Z][a-zA-Z0-9_]* { return text(); }

StringLiteral =
    "'" chars: SingleStringChar* "'" {
        return chars.join("");
    }
    / '"' chars: DoubleStringChar* '"' {
        return chars.join("");
    }

AnyChar =
    .

DoubleStringChar =
    !('"' / "\\" / LineTerminator) AnyChar { return text(); }
    / "\\" sequence: EscapeSequence { return sequence; }
    / LineContinuation

SingleStringChar =
    !("'" / "\\" / LineTerminator) AnyChar { return text(); }
    / "\\" sequence: EscapeSequence { return sequence; }
    / LineContinuation

LineContinuation =
    "\\" LineTerminatorSequence { return ""; }

EscapeSequence =
    CharEscapeSequence
    / "0" !DecDigit { return "\0"; }
    / HexEscapeSequence
    / UnicodeEscapeSequence

CharEscapeSequence =
    SingleEscapeChar
    / NonEscapeChar

SingleEscapeChar =
    "'"
    / '"'
    / "\\"
    / "b"  { return "\b"; }
    / "f"  { return "\f"; }
    / "n"  { return "\n"; }
    / "r"  { return "\r"; }
    / "t"  { return "\t"; }
    / "v"  { return "\v"; }

NonEscapeChar =
    !(EscapeChar / LineTerminator) AnyChar { return text(); }

EscapeChar =
    SingleEscapeChar
    / DecDigit
    / "x"
    / "u"

HexDigit =
    [0-9a-f]i

HexEscapeSequence =
    "x" digits: $(HexDigit HexDigit) {
        return String.fromCharCode(parseInt(digits, 16));
    }

UnicodeEscapeSequence
    = "u" digits: $(HexDigit HexDigit HexDigit HexDigit) {
        return String.fromCharCode(parseInt(digits, 16));
    }

DecDigit =
    [0-9]

Number =
    "-"?DecDigit+ {
        Number(text())
    }

BigInt =
    Number "n" {
        return BigInt(text())
    }

PrimitiveWhiteSpace =
    "\t"
    / "\v"
    / "\f"
    / " "
    / "\u00A0"
    / "\uFEFF"
    / Zs

WhiteSpace "whitespace" =
    PrimitiveWhiteSpace
    / LineTerminator PrimitiveWhiteSpace* ("*" / "///")

StartingWhiteSpace "whitespace" =
    PrimitiveWhiteSpace* LineTerminator? PrimitiveWhiteSpace* ("*" / "///")? __

// Separator, Space

Zs =
    [\u0020\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]

LineTerminator =
    [\n\r\u2028\u2029]

LineTerminatorSequence =
    "\n"
    / "\r\n"
    / "\r"
    / "\u2028"
    / "\u2029"

__ =
    (WhiteSpace / LineTerminator)*