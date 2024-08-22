export * from "./rewrite";
import { binaryIneqRewrite } from "./builtin_rewrites";
import { Rewrite } from "./rewrite";

export const builtinRewrites: Rewrite[] = [binaryIneqRewrite];
