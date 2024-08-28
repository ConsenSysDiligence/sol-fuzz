export * from "./rewrite";
import { lessStrictIneqRW, swapStatementRW } from "./dsl";
import { Rewrite } from "./rewrite";

export const builtinRewrites: Rewrite[] = [lessStrictIneqRW, swapStatementRW];
