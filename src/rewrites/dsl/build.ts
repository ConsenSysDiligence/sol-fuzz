import {
    ArrayTypeName,
    assert,
    Assignment,
    ASTNode,
    ASTNodeConstructor,
    ASTNodeFactory,
    BinaryOperation,
    Block,
    Break,
    Conditional,
    Continue,
    ContractDefinition,
    DoWhileStatement,
    ElementaryTypeName,
    ElementaryTypeNameExpression,
    EmitStatement,
    EnumDefinition,
    EnumValue,
    ErrorDefinition,
    EventDefinition,
    ExpressionStatement,
    ForStatement,
    FunctionCall,
    FunctionCallOptions,
    FunctionDefinition,
    FunctionTypeName,
    Identifier,
    IdentifierPath,
    IfStatement,
    ImportDirective,
    IndexAccess,
    IndexRangeAccess,
    InheritanceSpecifier,
    InlineAssembly,
    Literal,
    Mapping,
    MemberAccess,
    ModifierDefinition,
    ModifierInvocation,
    NewExpression,
    OverrideSpecifier,
    ParameterList,
    PlaceholderStatement,
    PragmaDirective,
    PrimaryExpression,
    Return,
    RevertStatement,
    SourceUnit,
    StructDefinition,
    StructuredDocumentation,
    Throw,
    TryCatchClause,
    TryStatement,
    TupleExpression,
    UnaryOperation,
    UncheckedBlock,
    UserDefinedTypeName,
    UserDefinedValueTypeDefinition,
    UsingForDirective,
    VariableDeclaration,
    VariableDeclarationStatement,
    WhileStatement
} from "solc-typed-ast";
import { Match } from "../rewrite";
import { BaseRewritePattern, RWArr, RWChoice, RWGen, RWLiteral, RWNode, RWVar } from "./ast";
import { MatchSlice } from "./match";

const knownASTTypes: Array<ASTNodeConstructor<any>> = [
    ContractDefinition,
    EnumDefinition,
    EnumValue,
    ErrorDefinition,
    EventDefinition,
    FunctionDefinition,
    ModifierDefinition,
    StructDefinition,
    UserDefinedValueTypeDefinition,
    VariableDeclaration,
    Assignment,
    BinaryOperation,
    Conditional,
    ElementaryTypeNameExpression,
    FunctionCall,
    FunctionCallOptions,
    Identifier,
    IndexAccess,
    IndexRangeAccess,
    Literal,
    MemberAccess,
    NewExpression,
    PrimaryExpression,
    TupleExpression,
    UnaryOperation,
    IdentifierPath,
    ImportDirective,
    InheritanceSpecifier,
    ModifierInvocation,
    OverrideSpecifier,
    ParameterList,
    PragmaDirective,
    SourceUnit,
    StructuredDocumentation,
    UsingForDirective,
    Block,
    Break,
    Continue,
    DoWhileStatement,
    EmitStatement,
    ExpressionStatement,
    ForStatement,
    IfStatement,
    InlineAssembly,
    PlaceholderStatement,
    Return,
    RevertStatement,
    Throw,
    TryCatchClause,
    TryStatement,
    UncheckedBlock,
    VariableDeclarationStatement,
    WhileStatement,
    ArrayTypeName,
    ElementaryTypeName,
    FunctionTypeName,
    Mapping,
    UserDefinedTypeName
];

const nameToConstructor = new Map(knownASTTypes.map((constr) => [constr.name, constr]));

export type GenEnv = Map<string, BaseRewritePattern>;

export function pickAny<T>(choices: T[]): T {
    return choices[Math.floor(Math.random() * choices.length)];
}

export function build(
    pattern: BaseRewritePattern,
    match: Match,
    factory: ASTNodeFactory,
    env: GenEnv,
    used: Set<number> = new Set()
): any {
    if (pattern instanceof RWLiteral) {
        return pattern.value;
    }

    if (pattern instanceof RWVar) {
        let val = match.get(pattern.name);

        if (val instanceof ASTNode) {
            if (!used.has(val.id)) {
                used.add(val.id);
            } else {
                val = factory.copy(val);
            }
        }

        return val;
    }

    if (pattern instanceof RWArr) {
        const res: any[] = [];

        for (const compPat of pattern.components) {
            const comp = build(compPat, match, factory, env, used);

            if (comp instanceof MatchSlice) {
                res.push(...comp.arr.slice(comp.start, comp.end));
            } else {
                res.push(comp);
            }
        }

        return res;
    }

    if (pattern instanceof RWGen) {
        const rwPattern = env.get(pattern.name);

        if (rwPattern === undefined) {
            throw new Error(`Unknown gen attern ${pattern.name}`);
        }

        return build(rwPattern, match, factory, env, used);
    }

    if (pattern instanceof RWChoice) {
        return build(pickAny(pattern.choices), match, factory, env, used);
    }

    if (!(pattern instanceof RWNode)) {
        throw new Error(`NYI re-write node ${pattern}`);
    }

    const constr = nameToConstructor.get(pattern.type);
    assert(constr !== undefined, `NYI constructor ${pattern.type}`);

    const args = pattern.args.map((arg) => build(arg, match, factory, env, used));

    return factory.make(constr, ...args);
}
