import { assert, ASTNode, ASTNodeFactory } from "solc-typed-ast";
import { Match } from "../rewrite";
import { BaseMatchPattern, MatchAny, MatchLiteral, MatchNode } from "./pattern";

export function match(
    arg: any,
    pattern: BaseMatchPattern,
    partialMatch?: Match
): Match | undefined {
    let res: Match = partialMatch ? partialMatch : new Map();

    if (pattern.binding !== undefined) {
        res.set(pattern.binding, arg);
    }

    if (pattern instanceof MatchAny) {
        return res;
    }

    if (pattern instanceof MatchNode) {
        if (!(arg instanceof ASTNode)) {
            return undefined;
        }

        if (arg.constructor.name !== pattern.type) {
            return undefined;
        }

        const factory = new ASTNodeFactory(arg.requiredContext);
        const args: any[] = factory.getNodeConstructorArgs(arg);

        assert(
            args.length === pattern.args.length,
            `Mismatch in node arg length (${args.length}) and pattern args length (${pattern.args.length})`
        );

        for (let i = 0; i < pattern.args.length; i++) {
            const m = match(args[i], pattern.args[i], res);

            if (m === undefined) {
                return undefined;
            }

            res = m;
        }

        return res;
    }

    if (pattern instanceof MatchLiteral) {
        return pattern.value === arg ? res : undefined;
    }

    throw new Error(`NYI pattern type ${pattern}`);
}
