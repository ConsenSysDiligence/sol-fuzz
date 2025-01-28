import { ASTNode, ASTNodeFactory, replaceNode } from "solc-typed-ast";
import { Id, Randomness } from "../../utils";
import { Match, Matcher, Mutator } from "../rewrite";
import { RewriteRule } from "./ast";
import { build, GenEnv } from "./build";
import { match } from "./match";

/**
 * A re-write is a pair of a matcher function and a mutator function.
 */
export class Rewrite extends Id {
    constructor(
        public readonly matcher: Matcher,
        public readonly mutator: Mutator
    ) {
        super();
    }
}

export function makeRewrite(rule: RewriteRule, env: GenEnv, rand: Randomness): Rewrite {
    const matchF: Matcher = (candidate: ASTNode) => match(candidate, rule.matchPattern);
    const mutateF: Mutator = (oldNode: ASTNode, match: Match, factory: ASTNodeFactory) => {
        const newNode = build(rule.rewritePattern, match, factory, env, rand);
        replaceNode(oldNode, newNode);
    };

    return new Rewrite(matchF, mutateF);
}

export { BaseRule, GenRule, RewriteRule } from "./ast";
export { GenEnv } from "./build";
export { parseRules } from "./parser";
