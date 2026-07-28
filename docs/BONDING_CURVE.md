# Bonding Curve Mathematics

## Exponential Bonding Curve

ForgeX uses an exponential bonding curve for token pricing:

```
P(S) = P₀ × e^(k × S)
```

Where:
- `P(S)` = price per token at supply `S`
- `P₀` = initial price (in stroops)
- `k` = steepness factor
- `S` = tokens sold so far
- `e` = Euler's number

## Cost to Buy

```
Cost(S₁ → S₂) = (P₀ / k) × (e^(k × S₂) - e^(k × S₁))
```

## Payout on Sell

```
Payout(S₂ → S₁) = (P₀ / k) × (e^(k × S₂) - e^(k × S₁))
```

The curve is reversible — buy cost equals sell payout for the same interval.

## Fixed-Point Arithmetic

Soroban does not support floating-point. All calculations use fixed-point arithmetic scaled by `10^7`:

```
SCALE = 10^7
P₀ = initial_price × SCALE
k = steepness × SCALE
```

## Taylor Series Approximation

`e^x` is computed via Taylor series (15 terms):

```
e^x = 1 + x + x²/2! + x³/3! + ...
```

## Default Parameters

| Parameter | Value | Meaning |
|---|---|---|
| `P₀` | 100 stroops | 0.00001 XLM |
| `k` | 0.0000001 | Gentle exponential rise |
| `max_supply` | 1 billion | Total token supply |
| `reserve_target` | 500K XLM | Graduation threshold (v2) |
