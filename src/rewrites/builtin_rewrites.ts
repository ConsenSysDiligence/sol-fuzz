import { ASTNode, BinaryOperation } from "solc-typed-ast";
import { Match, Rewrite } from "./rewrite";

const emptyM: Match = new Map();

function matchBinaryIneq(n: ASTNode): Match | undefined {
    if (n instanceof BinaryOperation && n.operator === "<") {
        return emptyM;
    }

    return undefined;
}

function mutateBinaryIneq(n: ASTNode): void {
    (n as BinaryOperation).operator = "<=";
}

export const binaryIneqRewrite: Rewrite = [matchBinaryIneq, mutateBinaryIneq];
