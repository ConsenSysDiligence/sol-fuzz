import { ASTContext, ASTNode, ASTNodeFactory } from "solc-typed-ast";

export type Match = Map<string, any>;

export type Matcher = (n: ASTNode) => Match | undefined;
export type Mutator = (n: ASTNode, match: Match) => void;

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
        const m = matcher(nd);

        if (m === undefined) {
            return;
        }

        const ctx = new ASTContext();
        const factory = new ASTNodeFactory(ctx);

        const [rootCopy, remap] = factory.copyWithMapping(root);
        const ndCopy = ctx.locate(remap.get(nd.id) as number);
        const matchCopy = translateMatch(m, remap, ctx);

        mutator(ndCopy, matchCopy);
        res.push(rootCopy);
    });

    return res;
}
