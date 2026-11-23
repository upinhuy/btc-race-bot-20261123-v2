// Breakout Split Rider — a cbBTC minute-bar trading bot for agent-fun/bars-replay/v1.
//
// Strategy, in plain words:
//   1. Wait flat until the latest close breaks above the highest close of the
//      previous CHANNEL bars: a fresh upside breakout, the start of a move
//      worth more than the ~0.5% a round trip costs in fees, slippage and
//      price impact.
//   2. Enter in TRANCHES equal slices over TRANCHES consecutive bars instead
//      of one all-in order. Every bar's pool starts again from its own open
//      depth, so fifteen small buys pay far less price impact in total than
//      one large buy, while still being fully invested within fifteen
//      minutes of the signal.
//   3. Hold the position. The only exit is a wide protective trailing stop:
//      if the close falls more than 7% below the highest close since entry,
//      sell everything. After a stop-out the bot is flat again and the same
//      breakout rule may re-enter on a later signal.
//
// The bot is fully deterministic: it reads only the bars and the account the
// harness sends it — no clock, no environment, no randomness, no files — so
// two executions on the same data answer with byte-identical orders.

import { runBars } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
/** Breakout lookback: the latest close must beat the best of this many prior closes. */
const CHANNEL = 12;
/** The entry is split into this many equal buys, one per batch. */
const TRANCHES = 15;
/** Protective trailing stop: sell when close < peak * TRAIL_NUM / TRAIL_DEN (a 7% give-back). */
const TRAIL_NUM = 93n;
const TRAIL_DEN = 100n;
/** Orders accept fills at most this many bps from the latest close. */
const MAX_SLIP_BPS = 500;
/** A buy must spend at least 1 USDC (the protocol's minimum notional). */
const MIN_NOTIONAL = 1_000_000n;

/** Every close seen so far, oldest first, at the symbol's price scale. */
const closes: bigint[] = [];
/** Entry buys still to send after the one that opened the entry. */
let tranchesLeft = 0;
/** Highest close since the current entry began. */
let peak = 0n;

await runBars({
  onBatch(state, batch) {
    const bar = batch.bars.find((b) => b.symbol === SYMBOL);
    if (bar !== undefined) closes.push(BigInt(bar.c));
    if (state.warmingUp) return [];
    const close = state.close(SYMBOL);
    if (close === null) return [];
    const held = state.positions.get(SYMBOL);
    const qty = held === undefined ? 0n : held.qty;

    // An entry is in progress: send the next slice, whatever the bar did.
    if (tranchesLeft > 0) {
      if (close > peak) peak = close;
      const left = tranchesLeft;
      tranchesLeft -= 1;
      const cash = state.cash;
      if (cash < MIN_NOTIONAL) {
        tranchesLeft = 0;
        return [];
      }
      const amount = left === 1 ? cash : cash / BigInt(left);
      return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: amount, max_slippage_bps: MAX_SLIP_BPS }];
    }

    // Holding: trail the peak and honour the protective stop only.
    if (qty > 0n) {
      if (close > peak) peak = close;
      if (peak > 0n && close * TRAIL_DEN < peak * TRAIL_NUM) {
        return [{ side: 'sell', symbol: SYMBOL, qty, max_slippage_bps: MAX_SLIP_BPS }];
      }
      return [];
    }

    // Flat: look for a fresh breakout over the prior CHANNEL closes.
    if (closes.length > CHANNEL) {
      let ref = 0n;
      for (let i = closes.length - 1 - CHANNEL; i < closes.length - 1; i++) {
        if (closes[i] > ref) ref = closes[i];
      }
      if (close > ref) {
        peak = close;
        const cash = state.cash;
        const slice = cash / BigInt(TRANCHES);
        if (slice < MIN_NOTIONAL) {
          // Too little cash to slice: go in with one order or not at all.
          tranchesLeft = 0;
          if (cash < MIN_NOTIONAL) return [];
          return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: cash, max_slippage_bps: MAX_SLIP_BPS }];
        }
        tranchesLeft = TRANCHES - 1;
        return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: slice, max_slippage_bps: MAX_SLIP_BPS }];
      }
    }
    return [];
  },
});
