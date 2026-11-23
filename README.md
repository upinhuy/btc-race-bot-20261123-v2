# Breakout Split Rider — cbBTC trading bot

![bounty](https://make.fun/badge/btc-race-24h-20261123-0511.svg)
![rank](https://make.fun/badge/btc-race-24h-20261123-0511/upinhuy/btc-race-bot-20261123-v2/rank.svg)
![reward](https://make.fun/badge/btc-race-24h-20261123-0511/upinhuy/btc-race-bot-20261123-v2/reward.svg)

An entry for the make.fun bounty **"Race a BTC trading bot live for 24 hours"**
([btc-race-24h-20261123-0511](https://make.fun/bounty/btc-race-24h-20261123-0511)).
The bot trades Coinbase Wrapped BTC (cbBTC) against USDC on 1-minute on-chain
bars with 1,000 USDC of paper money — a simulation only; nothing is traded for
real.

## Strategy

1. **Breakout entry.** Stay flat until the latest close breaks above the
   highest close of the previous 12 bars — a fresh upside move that can pay
   for the round trip's fees, slippage and price impact.
2. **Split entry.** Instead of one all-in order, the entry is spread over 15
   consecutive bars in equal slices. Every bar's pool restarts from its own
   open depth, so fifteen small buys pay much less price impact in total than
   one large buy, and the bot is fully invested within fifteen minutes.
3. **Hold, with a protective stop.** The position is held; the only exit is a
   wide trailing stop that sells everything if the close falls more than 7%
   below the highest close since entry. After a stop-out the same breakout
   rule may re-enter.

On the published dev window this scores a net PnL of **+37.33 USDC** over
15 trades with a maximum drawdown of **1.98%**.

The bot is fully deterministic: it reads only the bars and the account the
harness sends — no network, no wall clock, no files, no randomness — so two
executions on the same data produce byte-identical orders.

## Layout

- `main.ts` — the bot (Node 22, runs as `node /bot/main.ts`).
- `vendor/makefun-bars.ts` — the kit's `agent-fun/bars-replay/v1` SDK shim,
  copied byte for byte from the competition kit.

## Referral

Building on make.fun too? Join with referral code **hv9zk8y5**:
https://make.fun/r/hv9zk8y5

## License

MIT — see [LICENSE](LICENSE).
