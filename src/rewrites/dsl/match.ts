import { assert, ASTNode, ASTNodeFactory } from "solc-typed-ast";
import { Match } from "../rewrite";
import {
    BaseMatchPattern,
    MatchAny,
    MatchArray,
    MatchElipsis,
    MatchLiteral,
    MatchNode
} from "./ast";

export class MatchSlice {
    constructor(
        public arr: any[],
        public start: number,
        public end: number // index right after last element in slice
    ) {}
}

function matchArr(
    arg: any[],
    pattern: BaseMatchPattern,
    partialMatch: Match,
    start: number
): Array<[Match, number]> {
    if (pattern instanceof MatchElipsis) {
        const res: Array<[Match, number]> = [];

        // We match an empty range for elipsis as well
        for (let i = start; i <= arg.length; i++) {
            const m = new Map(partialMatch);

            if (pattern.binding) {
                m.set(pattern.binding, new MatchSlice(arg, start, i));
            }

            res.push([m, i]);
        }

        return res;
    }

    if (start >= arg.length) {
        return [];
    }

    return match(arg[start], pattern, partialMatch).map((m) => [m, start + 1]);
}

export function match(arg: any, pattern: BaseMatchPattern, partialMatch?: Match): Match[] {
    const curMatch: Match = partialMatch ? partialMatch : new Map();

    if (pattern.binding !== undefined) {
        curMatch.set(pattern.binding, arg);
    }

    if (pattern instanceof MatchAny) {
        return [curMatch];
    }

    if (pattern instanceof MatchNode) {
        if (!(arg instanceof ASTNode)) {
            return [];
        }

        if (arg.constructor.name !== pattern.type) {
            return [];
        }

        const factory = new ASTNodeFactory(arg.requiredContext);
        const args: any[] = factory.getNodeConstructorArgs(arg);

        assert(
            args.length >= pattern.args.length,
            `Pattern has more args (${pattern.args.length}) than node (${args.length})`
        );

        let res: Match[] = [curMatch];

        for (let i = 0; i < pattern.args.length; i++) {
            const newRes: Match[] = [];

            for (const m of res) {
                newRes.push(...match(args[i], pattern.args[i], m));
            }

            if (newRes.length == 0) {
                return [];
            }

            res = newRes;
        }

        return res;
    }

    if (pattern instanceof MatchLiteral) {
        return pattern.value === arg ? [curMatch] : [];
    }

    if (pattern instanceof MatchArray) {
        if (!(arg instanceof Array)) {
            return [];
        }

        // Special case - match empty arrays
        if (pattern.components.length === 0) {
            return arg.length === 0 ? [curMatch] : [];
        }

        let matchQ: Array<[Match, number]> = [[curMatch, 0]];

        for (const compPat of pattern.components) {
            const nextQ: Array<[Match, number]> = [];

            for (const [m, start] of matchQ) {
                nextQ.push(...matchArr(arg, compPat, m, start));
            }

            matchQ = nextQ;
        }

        const fullMatches = matchQ.filter(([, start]) => start === arg.length);

        return fullMatches.map(([m]) => m);
    }

    throw new Error(`NYI pattern type ${pattern}`);
}
