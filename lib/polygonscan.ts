const PolygonScanAPIKEY = process.env.MATTERS_POLYGONSCANAPIKEY || "";
// https://api.polygonscan.com/api?module=block&action=getblocknobytime&timestamp=1704184772&closest=before&apikey={key}

export class PolygonScanAPI {
  static async getBlockFromTimestamp({
    timestamp,
    closest,
  }: {
    timestamp: number; // Date | string | number;
    closest: "before" | "after";
  }) {
    const nowTs = Math.floor(+Date.now() / 1e3);
    const params = new URLSearchParams({
      module: "block",
      action: "getblocknobytime",
      timestamp: Math.min(nowTs, timestamp).toString(),
      closest: timestamp >= nowTs ? "before" : closest, // override to before if pass now or future timestamp
      apikey: PolygonScanAPIKEY,
    });
    const u = new URL(`https://api.polygonscan.com/api?${params}`);
    console.log(new Date(), `getblocknobytime with:`, { params, u });
    const res = await fetch(u).then((res) => res.json());

    // {"status":"1","message":"OK","result":"51846093"}
    if (!(res?.status === "1" && res?.message === "OK"))
      console.error(new Date(), `non-ok result:`, res);

    return BigInt(res?.result);
  }

  static async getBlockReward({ blockno }: { blockno: bigint | number }) {
    const params = new URLSearchParams({
      module: "block",
      action: "getblockreward",
      blockno: blockno?.toString(),
      apikey: PolygonScanAPIKEY,
    });
    const u = new URL(`https://api.polygonscan.com/api?${params}`);
    console.log(new Date(), `get with:`, { params, u });
    const res = await fetch(u).then((res) => res.json());

    // {"status":"1","message":"OK","result":"51846093"}
    if (!(res?.status === "1" && res?.message === "OK"))
      console.error(new Date(), `non-ok result:`, res);

    return res?.result;
  }
}
