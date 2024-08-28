import { parse } from "./parser_gen";
import { BaseMatchPattern, BaseRewritePattern, Rule } from "./pattern";

export function parseRule(s: string): Rule {
    return parse(s, { startRule: "Rule" });
}

export function parseRules(s: string): Rule[] {
    return parse(s, { startRule: "Rules" });
}

export function parseMatchPattern(s: string): BaseMatchPattern {
    return parse(s, { startRule: "MatchPattern" });
}

export function parseRewritePattern(s: string): BaseRewritePattern {
    return parse(s, { startRule: "RewritePattern" });
}
