import { CHAINS } from "./chains";
import { ChainSlug } from "./types";

// Standard JSON-RPC call helper with multi-endpoint fallback & timeout
async function callRpc(
  rpcUrls: string[],
  method: string,
  params: any[],
  timeoutMs = 6000
): Promise<any> {
  for (const url of rpcUrls) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method,
          params,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) continue;
      const json = await res.json();
      if (json.error) continue;
      return json.result;
    } catch {
      // Try next RPC url
      continue;
    }
  }
  return null;
}

/**
 * Fetch total on-chain bounty counter from PoidhV3 contract
 * Function selector for bountyCounter(): 0xb4b48698
 */
export async function fetchOnChainBountyCounter(chain: ChainSlug): Promise<number | null> {
  const config = CHAINS[chain];
  if (!config || !config.contractAddress || !config.rpcUrls?.length) return null;

  try {
    const resultHex = await callRpc(
      config.rpcUrls,
      "eth_call",
      [{ to: config.contractAddress, data: "0xb4b48698" }, "latest"]
    );

    if (resultHex && resultHex !== "0x" && resultHex.length >= 66) {
      const count = parseInt(resultHex, 16);
      if (!isNaN(count) && count >= 0) {
        return count;
      }
    }
  } catch (err) {
    console.error(`[POIDH OnChain] bountyCounter error on ${chain}:`, err);
  }

  return null;
}

/**
 * Fetch total web/frontend max ID by combining on-chain counter + V2 offset
 */
export async function fetchMaxFrontendId(chain: ChainSlug): Promise<number | null> {
  const config = CHAINS[chain];
  if (!config) return null;

  const onChainCount = await fetchOnChainBountyCounter(chain);
  if (onChainCount !== null && onChainCount > 0) {
    return onChainCount + config.v2Offset;
  }
  return null;
}
