import JSBI from "jsbi"

// const Q96 = JSBI.exponentiate(JSBI.BigInt(2), JSBI.BigInt(96))

function toFloat(x) {
  return Number(x.toString())
}

/**
 * amount0 -> amount1 helper for Uniswap V3
 */
export function getAmount1FromAmount0({
  amount0,
  sqrtPriceX96,
  sqrtLowerX96,
  sqrtUpperX96,
}) {
  const P = toFloat(sqrtPriceX96) / toFloat(Q96)
  const Pa = toFloat(sqrtLowerX96) / toFloat(Q96)
  const Pb = toFloat(sqrtUpperX96) / toFloat(Q96)

  // liquidity from token0
  const L = amount0 * (P * Pb) / (Pb - P)

  // token1 required
  const amount1 = L * (P - Pa)

  return amount1
}


export function tickToSqrtPriceX96(tick) {
  const sqrt = Math.sqrt(Math.pow(1.0001, tick))
  return BigInt(Math.floor(sqrt * Number(Q96)))
}

const Q96 = 2n ** 96n

function mulDiv(a: bigint, b: bigint, d: bigint): bigint {
  return (a * b) / d
}

export function quoteToken1FromToken0(
  amount0: bigint,
  sqrtP: bigint,
  sqrtPa: bigint,
  sqrtPb: bigint
): bigint {
  const L = mulDiv(
    mulDiv(amount0, sqrtP, Q96),
    sqrtPb,
    sqrtPb - sqrtP
  )

  return mulDiv(L, sqrtP - sqrtPa, Q96)
}
