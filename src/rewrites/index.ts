export * from "./rewrite";
import { insertRevert, lessStrictIneqRW, swapStatementRW } from "./dsl";
import { Rewrite } from "./rewrite";

export const builtinRewrites: Rewrite[] = [lessStrictIneqRW, swapStatementRW, insertRevert];
