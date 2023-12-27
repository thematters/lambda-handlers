// https://golb.hplar.ch/2018/09/javascript-bigint.html
export class BigIntMath {
  static max(...values: Array<bigint | number>) {
    if (values.length === 0) {
      return null
    }

    if (values.length === 1) {
      return values[0]
    }

    let max = values[0]
    for (let i = 1; i < values.length; i++) {
      if (values[i] > max) {
        max = values[i]
      }
    }
    return max
  }

  static min(...values: Array<bigint | number>) {
    if (values.length === 0) {
      return null
    }

    if (values.length === 1) {
      return values[0]
    }

    let min = values[0]
    for (let i = 1; i < values.length; i++) {
      if (values[i] < min) {
        min = values[i]
      }
    }
    return min
  }

  static sign(value: bigint | number) {
    if (value > 0n) {
      return 1n
    }
    if (value < 0n) {
      return -1n
    }
    return 0n
  }

  static abs(value: bigint | number) {
    if (this.sign(value) === -1n) {
      return -value
    }
    return value
  }

  // https://stackoverflow.com/questions/53683995/javascript-big-integer-square-root/58863398#58863398
  static rootNth(value: bigint, k: bigint = 2n) {
    if (value < 0n) {
      throw 'negative number is not supported'
    }

    let o = 0n
    let x = value
    let limit = 100

    while (x ** k !== k && x !== o && --limit) {
      o = x
      x = ((k - 1n) * x + value / x ** (k - 1n)) / k
    }

    return x
  }

  static sqrt(value: bigint) {
    return BigIntMath.rootNth(value)
  }
}
