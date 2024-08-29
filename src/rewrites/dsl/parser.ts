import { BaseMatchPattern, BaseRewritePattern, BaseRule } from "./ast";
import { parse } from "./parser_gen";

export function parseRule(s: string): BaseRule {
    return parse(s, { startRule: "Rule" });
}

export function parseRules(s: string): BaseRule[] {
    return parse(s, { startRule: "Rules" });
}

export function parseMatchPattern(s: string): BaseMatchPattern {
    return parse(s, { startRule: "MatchPattern" });
}

export function parseRewritePattern(s: string): BaseRewritePattern {
    return parse(s, { startRule: "RewritePattern" });
}
