import { ASTNode, ASTNodeFactory, replaceNode } from "solc-typed-ast";
import { Match, Matcher, Mutator, Rewrite } from "../rewrite";
import { RewriteRule } from "./ast";
import { build, GenEnv } from "./build";
import { match } from "./match";

export function makeRewrite(rule: RewriteRule, env: GenEnv): Rewrite {
    const matchF: Matcher = (candidate: ASTNode) => match(candidate, rule.matchPattern);
    const mutateF: Mutator = (oldNode: ASTNode, match: Match, factory: ASTNodeFactory) => {
        const newNode = build(rule.rewritePattern, match, factory, env);
        replaceNode(oldNode, newNode);
    };

    return [matchF, mutateF];
}

export { BaseRule, GenRule, RewriteRule } from "./ast";
export { GenEnv, pickAny } from "./build";
export { parseRules } from "./parser";
