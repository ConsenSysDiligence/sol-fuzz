import { assert } from "solc-typed-ast";
import { max, sum } from "./math";

export abstract class Randomness {
    abstract pickAny<T>(choices: T[], site: any, idFun: (x: T) => any): T;
}

export class Unbiased {
    pickAny<T>(choices: T[]): T {
        return pickAny(choices);
    }
}

export class Diversity {
    pickAny<T>(choices: T[], site: any, idFun: (x: T) => any): T {
        return pickAnyDiversity(
            choices.map((c) => [c, idFun(c)]),
            site
        );
    }
}

/**
 * Pick a random object from `choices`
 */
export function pickAny<T>(choices: T[]): T {
    return choices[Math.floor(Math.random() * choices.length)];
}

/**
 * Pick a random object from `choices`. Weight the probability of picking the i-th object
 * by `weights[i]`
 */
export function pickAnyWeighted<T>(choices: T[], weights: number[], weightSum?: number): number {
    weightSum = weightSum === undefined ? sum(...weights) : weightSum;
    const coin = Math.floor(Math.random() * weightSum);

    let t = 0;
    for (let i = 0; i < weights.length; i++) {
        t += weights[i];
        if (coin < t) {
            return i;
        }
    }

    assert(false, `Shouldnt get here`);
}

const ctrs: Map<any, Map<any, number>> = new Map();

/**
 * Pick a random object from `choices` at a given site `site`.  The less often
 * an potential choice P has been seen at a given site, the more likely it is to
 * be picked.
 */
export function pickAnyDiversity<T>(choices: Array<[T, any]>, site: any): T {
    let ctrMap = ctrs.get(site);

    if (ctrMap === undefined) {
        ctrMap = new Map();
        ctrs.set(site, ctrMap);
    }

    const choiceCounts: number[] = choices.map(([, key]) => {
        const c = ctrMap.get(key);
        return c === undefined ? 0 : c;
    });

    const maxCount = max(...choiceCounts);

    const invertedChoiceCounts = choiceCounts.map((c) => maxCount + 1 - c);

    const resInd = pickAnyWeighted(
        choices.map(([c]) => c),
        invertedChoiceCounts
    );

    const res = choices[resInd][0];
    const key = choices[resInd][1];

    let oldCnt = ctrMap.get(key);
    oldCnt = oldCnt === undefined ? 0 : oldCnt;

    ctrMap.set(key, oldCnt + 1);

    return res;
}
