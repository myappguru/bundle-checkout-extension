// @ts-check

/**
 * @typedef {import("../../checkout-ui/generated/api").CartTransformRunInput} CartTransformRunInput
 * @typedef {import("../../checkout-ui/generated/api").CartTransformRunResult} CartTransformRunResult
 */

/**
 * @type {CartTransformRunResult}
 */
const NO_CHANGES = {
  operations: [],
};

/**
 * @param {CartTransformRunInput} input
 * @returns {CartTransformRunResult}
 */
export function cartTransformRun(input) {
  return NO_CHANGES;
};