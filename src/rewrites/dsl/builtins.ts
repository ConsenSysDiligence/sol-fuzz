import {
    MatchAny,
    MatchArray,
    MatchElipsis,
    MatchLiteral,
    MatchNode,
    RWArr,
    RWChoice,
    RWLiteral,
    RWNode,
    RWVar
} from "./pattern";

export const inequalityPattern = new MatchNode("root", "BinaryOperation", [
    new MatchAny("typeString"),
    new MatchLiteral(undefined, "string", "<"),
    new MatchAny("vLeftExpression"),
    new MatchAny("vRightExpression"),
    new MatchAny("userFunction"),
    new MatchAny("raw")
]);

export const nonStrictIneqRewrite = new RWNode("BinaryOperation", [
    new RWVar("typeString"),
    new RWLiteral("<="),
    new RWVar("vLeftExpression"),
    new RWVar("vRightExpression"),
    new RWVar("userFunction"),
    new RWVar("raw")
]);

export const twoStmtsPattern = new MatchNode("root", "Block", [
    new MatchArray("statements", [
        new MatchElipsis("a"),
        new MatchAny("S1"),
        new MatchElipsis("b"),
        new MatchAny("S2"),
        new MatchElipsis("c")
    ]),
    new MatchAny("doc"),
    new MatchAny("raw")
]);

export const twoStmtsSwapRewrite = new RWNode("Block", [
    new RWArr([new RWVar("a"), new RWVar("S2"), new RWVar("b"), new RWVar("S1"), new RWVar("c")]),
    new RWVar("doc"),
    new RWVar("doc")
]);

export const stmts = new MatchNode("root", "Block", [
    new MatchArray("statements", [new MatchElipsis("a"), new MatchElipsis("b")]),
    new MatchAny("doc"),
    new MatchAny("raw")
]);

export const insertBreak = new RWNode("Block", [
    new RWArr([
        new RWVar("a"),
        new RWChoice([
            new RWNode("ExpressionStatement", [
                new RWNode("FunctionCall", [
                    new RWLiteral(""),
                    new RWLiteral("functionCall"),
                    new RWNode("Identifier", [
                        new RWLiteral(""),
                        new RWLiteral("revert"),
                        new RWLiteral(-1)
                    ]),
                    new RWArr([])
                ])
            ])
        ]),
        new RWVar("b")
    ])
]);
