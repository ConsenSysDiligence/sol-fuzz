import { assert } from "solc-typed-ast";

/**
 * Return the maximum of the given numbers `nums`.
 */
export function max(...nums: number[]): number {
    assert(nums.length > 0, `max expects at least 1 number`);
    let max = nums[0];
    for (let i = 0; i < nums.length; i++) {
        max = max < nums[i] ? nums[i] : max;
    }

    return max;
}

/**
 * Return the minimum of the given numbers `nums`.
 */
export function min(...nums: number[]): number {
    assert(nums.length > 0, `min expects at least 1 number`);
    let min = nums[0];
    for (let i = 0; i < nums.length; i++) {
        min = min > nums[i] ? nums[i] : min;
    }

    return min;
}

/**
 * Return the sum of the given numbers `nums`.
 */
export function sum(...nums: number[]): number {
    let res = 0;
    for (let i = 0; i < nums.length; i++) {
        res += nums[i];
    }

    return res;
}
