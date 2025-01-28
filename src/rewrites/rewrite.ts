import { ASTContext, ASTNode, ASTNodeFactory, SourceUnit } from "solc-typed-ast";
import { Randomness } from "../utils";
import { Rewrite } from "./dsl";
import { findRewriteRegions } from "./template";

export type Match = Map<string, any>;

export type Matcher = (n: ASTNode) => Match[];
export type Mutator = (n: ASTNode, match: Match, factory: ASTNodeFactory) => void;

export type IDMap = Map<number, number>;

function translateMatch(match: Match, mapping: IDMap, ctx: ASTContext): Match {
    return new Map(
        [...match.entries()].map(([name, nd]) => [
            name,
            nd instanceof ASTNode ? ctx.locate(mapping.get(nd.id) as number) : nd
        ])
    );
}

/**
 * Apply a re-writes to an AST node, at all possible locations. This produces
 * a list of variants
 * @param root
 * @param rewrites
 */
export function applyRewrite(root: ASTNode, rewrite: Rewrite): ASTNode[] {
    const res: ASTNode[] = [];

    const [matcher, mutator] = [rewrite.matcher, rewrite.mutator];

    root.walk((nd) => {
        const ms = matcher(nd);

        if (ms.length === 0) {
            return;
        }

        const ctx = new ASTContext();
        const factory = new ASTNodeFactory(ctx);

        for (const m of ms) {
            const [rootCopy, remap] = factory.copyWithMapping(root);
            const ndCopy = ctx.locate(remap.get(nd.id) as number);
            const matchCopy = translateMatch(m, remap, ctx);
            mutator(ndCopy, matchCopy, factory);
            res.push(rootCopy);
        }
    });

    return res;
}

export function applyRandomRewriteDestructive(
    root: ASTNode,
    rewrites: Rewrite[],
    rand: Randomness
): boolean {
    const factory = new ASTNodeFactory(root.context);
    const candidates: Array<[ASTNode, Rewrite, Match]> = [];

    root.walk((nd) => {
        for (const rewrite of rewrites) {
            const ms = rewrite.matcher(nd);

            candidates.push(...ms.map((m) => [nd, rewrite, m] as [ASTNode, Rewrite, Match]));
        }
    });

    // No matches, nothing to do
    if (candidates.length === 0) {
        return false;
    }

    const [nd, rewrite, match] = rand.pickAny(
        candidates,
        `candidateRewrites`,
        ([nd, rewrite]) => `${nd.id}_${rewrite.id}`
    );

    rewrite.mutator(nd, match, factory);
    return true;
}

export function applyNRandomRewrites(
    unit: SourceUnit,
    rewrites: Rewrite[],
    N: number,
    rand: Randomness
): SourceUnit {
    const factory = new ASTNodeFactory(new ASTContext());
    const variant = factory.copy(unit);

    for (let j = 0; j < N; j++) {
        // Pick a random target
        const targets = findRewriteRegions(variant);
        const target = rand.pickAny(targets, `targets`, (target) => target.constructor.name);

        applyRandomRewriteDestructive(target, rewrites, rand);
    }

    return variant;
}
