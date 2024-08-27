import { ASTNode, ASTNodeFactory, replaceNode } from "solc-typed-ast";
import { Match, Matcher, Mutator, Rewrite } from "../rewrite";
import { build } from "./build";
import { inequalityPattern, nonStrictIneqRewrite } from "./builtins";
import { match } from "./match";
import { BaseMatchPattern, BaseRewritePattern } from "./pattern";

export function makeRewrite(
    matchPattern: BaseMatchPattern,
    rwPattern: BaseRewritePattern
): Rewrite {
    const matchF: Matcher = (candidate: ASTNode) => match(candidate, matchPattern);
    const mutateF: Mutator = (oldNode: ASTNode, match: Match) => {
        const factory = new ASTNodeFactory(oldNode.requiredContext);
        const newNode = build(rwPattern, match, factory);
        replaceNode(oldNode, newNode);
    };

    return [matchF, mutateF];
}

export const lessStrictIneqRW = makeRewrite(inequalityPattern, nonStrictIneqRewrite);
