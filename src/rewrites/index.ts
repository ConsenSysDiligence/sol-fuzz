export * from "./rewrite";
import { lessStrictIneqRW } from "./dsl";
import { Rewrite } from "./rewrite";

export const builtinRewrites: Rewrite[] = [lessStrictIneqRW];
