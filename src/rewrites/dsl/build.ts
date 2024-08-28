import { assert, ASTNodeConstructor, ASTNodeFactory, BinaryOperation, Block } from "solc-typed-ast";
import { Match } from "../rewrite";
import { MatchSlice } from "./match";
import { BaseRewritePattern, RWArr, RWLiteral, RWNode, RWVar } from "./pattern";

const knownASTTypes: Array<ASTNodeConstructor<any>> = [BinaryOperation, Block];

const nameToConstructor = new Map(knownASTTypes.map((constr) => [constr.name, constr]));

export function build(pattern: BaseRewritePattern, match: Match, factory: ASTNodeFactory): any {
    if (pattern instanceof RWLiteral) {
        return pattern.value;
    }

    if (pattern instanceof RWVar) {
        const val = match.get(pattern.name);

        return val;
    }

    if (pattern instanceof RWArr) {
        const res: any[] = [];

        for (const compPat of pattern.components) {
            const comp = build(compPat, match, factory);

            if (comp instanceof MatchSlice) {
                res.push(...comp.arr.slice(comp.start, comp.end));
            } else {
                res.push(comp);
            }
        }

        return res;
    }

    if (!(pattern instanceof RWNode)) {
        throw new Error(`NYI re-write node ${pattern}`);
    }

    const constr = nameToConstructor.get(pattern.type);
    assert(constr !== undefined, `NYI constructor ${pattern.type}`);

    const args = pattern.args.map((arg) => build(arg, match, factory));

    return factory.make(constr, ...args);
}
