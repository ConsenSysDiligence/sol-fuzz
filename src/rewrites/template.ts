import {
    ASTNode,
    ContractDefinition,
    FunctionDefinition,
    SourceUnit,
    Statement,
    StatementWithChildren,
    StructuredDocumentation,
    VariableDeclaration
} from "solc-typed-ast";

export const MUTATION_TARGET_TAG = "<SOL-FUZZ-TARGET>";

/**
 * Find all targets for rewrites inside a template. Targets are nodes marged with a `MUTATION_TARGET_TAG` docstrings.
 * If there are no such nodes, the whole file is considered a target.
 */
export function findRewriteRegions(template: SourceUnit): ASTNode[] {
    let res: ASTNode[] = [];

    template.walk((n) => {
        if (
            !(
                n instanceof Statement ||
                n instanceof StatementWithChildren ||
                n instanceof FunctionDefinition ||
                n instanceof VariableDeclaration ||
                n instanceof ContractDefinition
            )
        ) {
            return;
        }

        const doc = n.documentation;

        if (doc === undefined) {
            return;
        }

        const docStr = doc instanceof StructuredDocumentation ? doc.text : doc;
        if (docStr.includes(MUTATION_TARGET_TAG)) {
            res.push(n);
        }
    });

    if (res.length === 0) {
        res = [template];
    }

    return res;
}
