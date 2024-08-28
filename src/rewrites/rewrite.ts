import { ASTContext, ASTNode, ASTNodeFactory } from "solc-typed-ast";

export type Match = Map<string, any>;

export type Matcher = (n: ASTNode) => Match[];
export type Mutator = (n: ASTNode, match: Match, factory: ASTNodeFactory) => void;

/**
 * A re-write is a pair of a matcher function and a mutator function.
 */
export type Rewrite = [Matcher, Mutator];

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

    const [matcher, mutator] = rewrite;

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
