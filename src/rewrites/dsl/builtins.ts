import { MatchAny, MatchLiteral, MatchNode, RWLiteral, RWNode, RWVar } from "./pattern";

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
