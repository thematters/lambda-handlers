import path from "node:path";
import shuffle from "lodash/shuffle.js";

import { AuthorFeed } from "../lib/author-feed-ipns.js";
import { ipfsPool } from "../lib/ipfs-servers.js";
import { dbApi, Item } from "../lib/db.js";

const GW3_API_BASE_URL = "https://gw3.io";
const GW3_ACCOUNT_API_BASE_URL = "https://account.gw3.io";

// import { Client } from 'gw3-sdk';
const gw3AccessKey = process.env.GW3_ACCESS_KEY || "";
const gw3AccessSecret = process.env.GW3_ACCESS_SECRET || "";
const MATTERS_SITE_DOMAIN_PREFIX =
  process.env.MATTERS_SITE_DOMAIN_PREFIX || "matters.town";

// export const gw3Client = new Client(gw3AccessKey, gw3AccessSecret);

function getTs() {
  return Math.floor(Date.now() / 1000).toString();
}

class GW3Client {
  #gw3AccessKey: string;
  #gw3AccessSecret: string;
  #config: { baseURL: string };
  #authHeaders: {
    "X-Access-Key": string;
    "X-Access-Secret": string;
  };

  constructor(key: string, secret: string) {
    this.#gw3AccessKey = key;
    this.#gw3AccessSecret = secret;
    this.#authHeaders = {
      "X-Access-Key": this.#gw3AccessKey,
      "X-Access-Secret": this.#gw3AccessSecret,
    };
    this.#config = { baseURL: "https://gw3.io" };
  }
  #makeAuthHeaders() {
    return {
      "X-Access-Key": this.#gw3AccessKey,
      "X-Access-Secret": this.#gw3AccessSecret,
    };
  }

  async addPin(cid: string, name?: string) {
    const u = new URL(
      `${this.#config.baseURL}/api/v0/pin/add?arg=${cid}&ts=${getTs()}`
    );
    // let pinUrl = `/api/v0/pin/add?arg=${cid}&ts=${getTs()}`;
    if (name) {
      // pinUrl += `&name=${name}`;
      u.searchParams.set("name", name);
    }

    const res = await fetch(u, {
      method: "POST",
      headers: this.#authHeaders, // this.#makeAuthHeaders(),
    });
    // console.log(new Date(), "addPin res:", res.ok, res.status, res.headers);

    return res.json();
  }

  async rmPin(cid: string) {
    const u = new URL(
      `${this.#config.baseURL}/api/v0/pin/rm?arg=${cid}&ts=${getTs()}`
    );
    const res = await fetch(u, {
      method: "POST",
      headers: this.#authHeaders, // this.#makeAuthHeaders(),
    });
    // console.log(new Date(), "rmPin res:", res.ok, res.status, res.headers);

    return res.json();
  }

  async getPin(cid: string) {
    const u = `${GW3_ACCOUNT_API_BASE_URL}/api/v0/pin/${cid}?ts=${getTs()}`;
    const res = await fetch(u, {
      method: "GET",
      headers: this.#authHeaders, // this.#makeAuthHeaders(),
    });
    // console.log(new Date(), "getPin res:", res.ok, res.status, res.headers);

    return res.json();
  }

  async renamePin(cid: string, name: string) {
    const u = `${GW3_ACCOUNT_API_BASE_URL}/api/v0/pin/rename?ts=${getTs()}`;
    const res = await fetch(u, {
      method: "POST",
      headers: this.#authHeaders, // this.#makeAuthHeaders(),
      body: JSON.stringify({ cid, name }),
    });
    // console.log(new Date(), "getPin res:", res.ok, res.status, res.headers);

    return res.json();
  }

  async addPinWait(cid: string, name?: string, wait = 60e3) {
    await this.addPin(cid, name);
    do {
      const res = await this.getPin(cid);
      console.log(new Date(), "check addPin wait:", res?.data);
      if (res.code === 200 && res.data?.status !== "pinning") {
        return res.data;
      }
      const r = 1000 * (2 + 10 * Math.random());
      await delay(r);

      wait -= r;
    } while (wait > 0);
  }

  async getDAG(cid: string) {
    const u = `${GW3_API_BASE_URL}/api/v0/dag/get?ts=${getTs()}&arg=${cid}`;
    const res = await fetch(u, {
      method: "GET",
      headers: this.#authHeaders, // this.#makeAuthHeaders(),
    });
    console.log(
      new Date(),
      "getDAG res:",
      res.ok,
      res.status,
      res.statusText,
      res.headers
    );

    return res.json();
  }

  async importFolder(cid: string) {
    const res = await fetch(
      `https://gw3.io/api/v0/folder/${cid}?ts=${getTs()}`,
      {
        method: "PUT",
        headers: this.#authHeaders, // this.#makeAuthHeaders(),
      }
    );
    if (!res.ok) {
      console.error(
        new Date(),
        "folder import res:",
        res.ok,
        res.status,
        res.statusText,
        res.headers,
        await res.text()
      );
      return;
    }

    return res.json();
  }

  async callFolderOperation(
    cid: string,
    {
      add,
      remove,
      pin_new,
      unpin_old = true,
    }: {
      add?: [string, string][];
      remove?: string[];
      pin_new?: boolean;
      unpin_old?: boolean;
    } = {}
  ) {
    const reqBody = { cid, add, remove, pin_new, unpin_old };
    const res = await fetch(
      `https://gw3.io/api/v0/folder/operation?ts=${getTs()}`,
      {
        method: "POST",
        headers: this.#authHeaders, // this.#makeAuthHeaders(),
        body: JSON.stringify(reqBody),
      }
    );
    console.log(
      new Date(),
      "folder operation res:",
      res.ok,
      res.status,
      res.statusText,
      res.headers,
      reqBody
    );
    return res.json();
  }

  async updateIPNSName({ ipnsKey, cid }: { ipnsKey: string; cid: string }) {
    const res = await fetch(
      `https://gw3.io/api/v0/name/publish?key=${ipnsKey}&arg=${cid}&ts=${getTs()}`,
      {
        method: "POST",
        headers: this.#authHeaders, // this.#makeAuthHeaders(),
      }
    );

    console.log(
      new Date(),
      `ipns name update res:`,
      res.ok,
      res.status,
      res.statusText,
      res.headers,
      { ipnsKey, cid }
      // reqBody
    );
    return res.json();
  }

  async importIPNSName({
    ipnsKey,
    cid,
    alias,
    pem,
    seq = 10000,
  }: {
    ipnsKey: string;
    cid: string;
    pem: string;
    alias?: string;
    seq?: number;
  }) {
    const reqBody = {
      name: ipnsKey,
      value: cid,
      secret_key: pem,
      format: "pem-pkcs8-cleartext",
      alias,
      seq,
    };
    const res = await fetch(`https://gw3.io/api/v0/name/import?ts=${getTs()}`, {
      method: "POST",
      headers: this.#authHeaders, // this.#makeAuthHeaders(),
      body: JSON.stringify(reqBody),
    });
    console.log(
      new Date(),
      "ipns name import res:",
      res.ok,
      res.status,
      res.statusText,
      res.headers,
      { ipnsKey, cid, alias }
      // reqBody
    );
    return res.json();
  }

  async getIpns(kid: string) {
    const u = `${GW3_ACCOUNT_API_BASE_URL}/api/v0/ipns/${kid}?ts=${getTs()}`;
    const res = await fetch(u, {
      method: "GET",
      headers: this.#authHeaders, // this.#makeAuthHeaders(),
    });
    // console.log(new Date(), "getPin res:", res.ok, res.status, res.headers);

    return res.json();
  }
}

export const gw3Client = new GW3Client(gw3AccessKey, gw3AccessSecret);

export async function refreshPinLatest({ limit = 100, offset = 0 } = {}) {
  const articles = await dbApi.listRecentArticles({
    take: limit,
    skip: offset,
  });
  const articlesByCid = new Map(
    articles
      .filter(({ dataHash }) => dataHash)
      .map((item) => [item.dataHash, item])
  );

  console.log(
    new Date(),
    `got ${articles.length} latest articles`,
    articles.map(
      ({ id, slug, userName }) =>
        `${MATTERS_SITE_DOMAIN_PREFIX}/@${userName}/${id}-${slug}`
    )
  );
  const resAdd = await Promise.all(
    articles.map(
      async ({ id, slug, userName, dataHash }) =>
        dataHash && {
          userName,
          dataHash,
          ...(await gw3Client.addPin(
            dataHash,
            `${MATTERS_SITE_DOMAIN_PREFIX}/@${userName}/${id}-${slug}`
          )),
        }
    )
  );
  console.log(
    new Date(),
    `added ${articles.length} pins, not ok ones:`,
    resAdd.filter((r) => r?.code !== 200)
  );

  const rowsByStatus = new Map<string, any[]>();
  const addedTime = Date.now();
  for (let tries = 0; tries < 5; tries++) {
    await delay(1000 * (2 + 10 * Math.random()));

    const res = await Promise.all(
      articles.map(
        async ({ id, slug, userName, dataHash }) =>
          dataHash && {
            userName,
            dataHash,
            ...(await gw3Client.getPin(dataHash)),
          }
      )
    );
    const rows = res.map((r) => (r?.code === 200 ? r.data : r));
    rowsByStatus.clear();
    rows.forEach((item) => {
      const status = item?.status ?? "no-result";
      const group = rowsByStatus.get(status) || [];
      if (!rowsByStatus.has(status)) rowsByStatus.set(status, group);
      group.push(item);
    });
    const now = new Date();
    console.log(
      now,
      `after ${tries} retries ${+now - +addedTime}ms elapsed, got ${
        rowsByStatus.get("pinned")?.length
      } pinned...`
    );
    if (rowsByStatus.get("pinned")?.length === limit) break; // break if all pinned early
  }

  // merge the pinned into a big directory:
  const EMPTY_DAG_ROOT = "QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn";
  await gw3Client.addPinWait(EMPTY_DAG_ROOT, "EMPTY_DAG_ROOT");

  const toAddEntries = rowsByStatus.get("pinned")?.map(({ name, cid }) => {
    if (name) name = path.basename(name);
    const arti = articlesByCid.get(cid);
    return [
      name
        ? path.basename(name)
        : arti
        ? `${arti.id}-${arti.slug}`
        : `${new Date().toISOString()}`,
      cid,
    ];
  }) as [string, string][];
  console.log(
    new Date(),
    `merging ${toAddEntries.length} cids into one.`,
    toAddEntries
  );
  let newTopDir = EMPTY_DAG_ROOT; // starts from empty
  while (toAddEntries?.length > 0) {
    await gw3Client.importFolder(newTopDir);

    const resFolderOps = await gw3Client.callFolderOperation(newTopDir, {
      add: toAddEntries.splice(0, 50), // gw3 API changed the limit to 50 since 8/28
      pin_new: true,
      unpin_old: true,
    });
    console.log(
      new Date(),
      "folder/operation res:",
      toAddEntries.length,
      resFolderOps
    );
    if (!resFolderOps?.data?.cid) {
      console.error(
        new Date(),
        `folder/operation failed, stopped at ${newTopDir}: with ${toAddEntries.length} remaining addEntries.`
      );
      break;
    }
    // const prior = lastCid;
    newTopDir = resFolderOps.data.cid;
  }

  const stats: { [key: string]: number } = Array.from(
    rowsByStatus,
    ([status, group]) => [status, group.length]
  ).reduce(
    (acc, [status, length]) => Object.assign(acc, { [status]: length }),
    {}
  );
  console.log(
    new Date(),
    `merged ${stats["pinned"]} cids into one, with ${toAddEntries.length} left, unpin all pinned sub-links.`,
    newTopDir
  );

  // unpin all sub-links
  if (newTopDir !== EMPTY_DAG_ROOT && toAddEntries?.length === 0)
    rowsByStatus
      .get("pinned")
      ?.forEach(({ cid }) => cid && gw3Client.rmPin(cid));

  console.log(
    new Date(),
    `tried pinning ${articles.length} cids:`,
    stats
    // rows?.slice(0, 10)
  );

  gw3Client.addPin(EMPTY_DAG_ROOT, "EMPTY_DAG_ROOT");
}

const ALLOWED_USER_STATES = new Set(["active", "onboarding", "frozen"]);

export async function refreshIPNSFeed(
  userName: string,
  {
    limit = 50,
    incremental = true,
    forceReplace = false,
    useMattersIPNS,
  }: {
    limit?: number;
    incremental?: boolean;
    forceReplace?: boolean;
    useMattersIPNS?: boolean;
  } = {}
) {
  const [author] = await dbApi.getAuthor(userName);
  console.log(new Date(), "get author:", author);
  if (!author || !ALLOWED_USER_STATES.has(author?.state)) {
    console.log(new Date(), `no such user:`, author);
    return;
  }
  const [ipnsKeyRec] = await dbApi.getUserIPNSKey(author.id);
  console.log(new Date(), "get user ipns:", ipnsKeyRec);
  if (!ipnsKeyRec) {
    // TODO: generate ipnsKeyRec here
    console.error(
      new Date(),
      `skip no ipnsKeyRec: for author: '${author.displayName} (@${author.userName})'`
    );
    // return;
  }
  // if (useMattersIPNS == null) { // undefined
  console.log(
    new Date(),
    `input useMattersIPNS:`,
    typeof useMattersIPNS,
    useMattersIPNS,
    ipnsKeyRec?.stats?.useMattersIPNS
  );
  useMattersIPNS = useMattersIPNS ?? ipnsKeyRec?.stats?.useMattersIPNS ?? false; // remember the settings from last time
  console.log(
    new Date(),
    `input useMattersIPNS:`,
    typeof useMattersIPNS,
    useMattersIPNS,
    ipnsKeyRec?.stats?.useMattersIPNS
  );

  const articles = await dbApi.listAuthorArticles({
    authorId: author.id,
    take: limit,
  });
  const drafts = await dbApi.listDrafts({
    ids: articles.map((item: Item) => item.draftId as string),
    take: limit,
  });

  const lastArti = articles[0];

  console.log(
    new Date(),
    `get ${articles.length} articles /${drafts.length} drafts for author: '${author.displayName} (@${author.userName})', last_article:`,
    lastArti
  );
  if (articles.length <= 10) {
    forceReplace = true;
    console.log(
      new Date(),
      `author '${author.displayName} (@${author.userName})' has ${articles.length} (<=10) articles, set all replace mode.`
    );
  }

  const feed = new AuthorFeed(author, ipnsKeyRec?.ipnsKey, drafts, articles);
  // console.log(new Date(), "get author feed:", feed);
  await feed.loadData();
  const { html, xml, json } = feed.generate();
  // console.log(new Date(), "get author feed generated:", { html, xml, json });

  const kname = `matters-town-homepages-topdir-for-${author.userName}-${author.uuid}`;

  const key = await ipfsPool.genKey();
  // const pem = key.privateKey.export({ format: "pem", type: "pkcs8" }) as string;
  let imported,
    ipfs = ipfsPool.get();
  const keyPair = {
    ipnsKey: "",
    pem: key.privateKey.export({ format: "pem", type: "pkcs8" }) as string,
  };
  // let failures = 0;
  for (let failures = 0; failures <= ipfsPool.size; failures++) {
    try {
      console.log(
        new Date(),
        "importing key:",
        key // pem
      );
      ({ imported, client: ipfs } = await ipfsPool.importKey({
        name: kname,
        pem: keyPair.pem,
      }));
      if (imported) {
        console.log(new Date(), "new generated key:", imported);
        keyPair.ipnsKey = imported.Id;
        // keyPair.pem = key.privateKey.export({ format: "pem", type: "pkcs8" }) as string;
        Promise.resolve(ipfs.key.rm(kname)).catch((err) => {
          console.error(new Date(), `ERROR:`, err);
        }); // rm async
        break;
      }
      console.log(
        new Date(),
        `got nothing from imported, probably has an existing name:`,
        kname
      );
      // ipfs.key.rm(kname);
      Promise.resolve(ipfs.key.rm(kname)).catch((err) => {
        console.error(new Date(), `ERROR:`, err);
      }); // rm async
    } catch (err) {
      console.error(new Date(), "get ipfs import ERROR:", err);
    }
  }
  if (!imported) {
    console.log(new Date(), "no keys generated", ipfsPool.size);
    return;
  }

  // console.log(new Date, `processing ${}'s last article:`, );

  const directoryName = `${kname}-with-${lastArti?.id || ""}-${
    lastArti?.slug || ""
  }@${new Date().toISOString().substring(0, 13)}`;

  const contents = [
    {
      path: `${directoryName}/index.html`,
      content: html,
    },
    {
      path: `${directoryName}/rss.xml`,
      content: xml,
    },
    {
      path: `${directoryName}/feed.json`,
      content: json,
    },
  ];

  const addEntries: [string, string][] = [];
  const promises: Promise<any>[] = [];

  const results = [];
  let topDirHash = "";
  for await (const result of ipfs.addAll(contents)) {
    results.push(result);
    if (result.path === directoryName) {
      topDirHash = result.cid?.toString();
      promises.push(gw3Client.addPin(result.cid?.toString(), result.path));
    } else if (result.path.startsWith(directoryName) && !forceReplace) {
      // replace mode will start with this new topDirHash, no need to keep pinning files inside
      // get all paths below, 'index.html' 'feed.json' 'rss.xml'
      // if (result.cid)
      addEntries.push([path.basename(result.path), result.cid?.toString()]);
      promises.push(gw3Client.addPin(result.cid?.toString(), result.path));
    }
  }
  await Promise.all(promises);
  promises.splice(0, promises.length);

  console.log(
    new Date(),
    `ipfs.addAll got ${results.length} results:`,
    results,
    addEntries
  );

  // const res = await Promise.all( results .map(({ path, cid }) => gw3Client.addPin(cid?.toString(), path)));
  // console.log(new Date(), "ipfs.addAll results pinning:", res);

  // TODO: pool wait'ing all becomes pinned

  const lastDataHash = ipnsKeyRec?.lastDataHash as string;

  let lastCid = (forceReplace ? topDirHash : lastDataHash) || topDirHash; // fallback to topDirHash if non existed before

  let lastCidData = await gw3Client.addPinWait(
    lastCid,
    `matters.town/@${author.userName}-lastest-top-dir-hash`
  );
  if (lastCidData?.status !== "pinned") {
    console.log(
      new Date(),
      `lastCid top-dir-hash: "${lastCid}" not pinned yet:`,
      lastCidData
    );
    return;
  }

  let dagLinks = await gw3Client.getDAG(lastCid);
  console.log(
    new Date(),
    `get prior running last cid ${lastCid} dag ${+dagLinks?.Links
      ?.length} links:`,
    dagLinks?.Links
  );
  let existingLinks = new Map<string, any>(
    dagLinks?.Links?.map((e: any) => [e.Name, e])
  );
  let existingCids = new Set<string>(
    dagLinks?.Links?.map((e: any) => e.Hash["/"])?.filter(Boolean)
  );

  articles // .slice(0, limit)
    .forEach((arti) => {
      if (arti.dataHash && !existingCids.has(arti.dataHash)) {
        addEntries.push([`${arti.id}-${arti.slug}`, arti.dataHash]);

        promises.push(
          gw3Client
            .addPin(
              arti.dataHash,
              `matters.town/@${author.userName}/${arti.id}-${arti.slug}`
            )
            .then((resData) => {
              if (resData?.code !== 200) {
                console.error(
                  new Date(),
                  `failed add pin ${arti.dataHash}:`,
                  resData
                );
              }
            })
        );
      }
    });
  console.log(new Date(), `wait adding non-existed ${promises.length} cids.`);
  if (promises.length > 0) {
    await Promise.all(promises);
    promises.splice(0, promises.length);

    await delay(1000 * (2 + 10 * Math.random()));
  }

  const res = await Promise.all(
    addEntries.map(([, cid]) => gw3Client.getPin(cid))
  );
  console.log(
    new Date(),
    `get all 3 index + lastest articles ${addEntries.length} pinning:`,
    // res,
    res.map((r) => (r.code === 200 ? r.data : r))
  );

  const waitCids = new Set([lastCid]);
  addEntries // .slice(0, 10)
    .forEach(([, cid]) => {
      if (cid && !existingCids.has(cid)) waitCids.add(cid);
    });

  for (let i = 0; i < 10 && waitCids.size > 0; i++) {
    console.log(
      new Date(),
      `wait on ${waitCids.size} cids to settle:`,
      waitCids
    );
    const res = await Promise.all(
      Array.from(waitCids, (cid) => cid && gw3Client.getPin(cid))
    );
    const rows = res.map((r) => (r.code === 200 ? r.data : r));
    console.log(new Date(), `pinning status:`, rows);
    rows.forEach((r) => {
      if (r.status !== "pinning") waitCids.delete(r.cid);
    });
    if (waitCids.size === 0) {
      console.log(new Date(), "all settled (pinned or failure).");
      break;
    }
    await delay(1000 * (5 + 20 * Math.random()));
  }

  console.log(
    new Date(),
    `after poll waiting, ${waitCids.size} not pinned, will add rest ${addEntries.length} entries:`,
    addEntries
  );

  const toAddEntries = forceReplace
    ? articles
        .filter(({ dataHash }) => dataHash && !waitCids.has(dataHash))
        .map(
          (arti) =>
            [`${arti.id}-${arti.slug}`, arti.dataHash] as [string, string]
        )
    : addEntries.filter(([name, cid]) => {
        if (existingLinks.get(name)?.Hash?.["/"] === cid) return false; // already there, no need to re-attach
        if (waitCids.has(cid)) return false; // can no way add it if not pinned
        return true;
      });
  console.log(
    new Date(),
    `missing ${toAddEntries.length} (from ${addEntries.length}) entries:`,
    toAddEntries
  );

  console.log(
    new Date(),
    `import ${toAddEntries.length} entries into folder:`,
    lastCid
  );
  while (toAddEntries.length > 0) {
    // await gw3Client.addPin(lastCid, `matters-town-homepages/for-${author.userName}-latest-top-dir-hash`);
    await gw3Client.importFolder(lastCid);
    // after PUT folder, better to wait 1sec
    // otherwise, often got { code: 400, msg: 'PIN resource is locked for processing by the system' }
    // await delay(1000 * (1 + 10 * Math.random()));

    const resFolderOps = await gw3Client.callFolderOperation(lastCid, {
      add: toAddEntries.splice(0, 50), // gw3 API changed the limit to 50 since 8/28
      pin_new: true,
      unpin_old: true,
    });
    console.log(
      new Date(),
      "folder/operation res:",
      toAddEntries.length,
      resFolderOps
    );
    if (!resFolderOps?.data?.cid) {
      console.error(
        new Date(),
        `folder/operation failed, stopped at ${lastCid}: with ${toAddEntries.length} remaining addEntries.`
      );
      break;
    }
    const prior = lastCid;
    lastCid = resFolderOps.data.cid;
    console.log(
      new Date(),
      "folder/operation after attached new cid:",
      lastCid
    );

    if (incremental) {
      console.log(
        new Date(),
        `once folder/operation only for incremental mode, still has ${toAddEntries.length} missing.`
      );
      break;
    }

    // toAddEntries.splice(0, 10);
    shuffle(toAddEntries);
    // await gw3Client.addPin( lastCid, `matters-town-homepages/for-${author.userName}-latest`);
    // TODO: wait it becomes 'pinned'

    // if (prior !== lastCid) gw3Client.rmPin(prior); // no need to wait, let it run async with best effort
  }

  if (useMattersIPNS && ipnsKeyRec?.privKeyPem) {
    console.log(
      new Date(),
      `use matters pre-generated keypair:`,
      useMattersIPNS
    );
    keyPair.ipnsKey = ipnsKeyRec.ipnsKey;
    keyPair.pem = ipnsKeyRec.privKeyPem;
  } else if (!useMattersIPNS) {
    // use the new generated key pair
  } else if (ipnsKeyRec?.stats?.testGw3IPNSKey && ipnsKeyRec?.stats?.pem) {
    keyPair.ipnsKey = ipnsKeyRec.stats.testGw3IPNSKey;
    keyPair.pem = ipnsKeyRec.stats.pem;
  }

  const testGw3IPNSKey = keyPair.ipnsKey; // imported.Id;
  const resGetIpns1 = await gw3Client.getIpns(testGw3IPNSKey);
  // console.log(new Date(), "ipns name get:", resGetIpns2);
  console.log(new Date(), `ipns name get ${testGw3IPNSKey}:`, resGetIpns1);

  let resIPNS;

  const topAuthorDirName = `matters.town/@${author.userName}`;
  if (resGetIpns1?.code === 200) {
    // existed: do update
    if (resGetIpns1?.data.value === lastCid) {
      console.log(new Date(), `lastCid remained the same, no need to update:`, {
        testGw3IPNSKey,
        lastCid,
      });
      return ipnsKeyRec?.stats;
    }

    resIPNS = await gw3Client.updateIPNSName({
      ipnsKey: testGw3IPNSKey,
      cid: lastCid,
    });
    console.log(new Date(), `updated ipns:`, resIPNS);
  } else {
    // not existed: do import

    const importArgs = {
      ipnsKey: testGw3IPNSKey,
      cid: lastCid,
      pem: keyPair.pem,
      alias: topAuthorDirName,
    };
    resIPNS = await gw3Client.importIPNSName(importArgs);
    // console.log(new Date(), "ipns name (import) publish:", resImport, { lastDataHash, lastCid, });
  }
  if (resIPNS?.code !== 200) {
    console.error(new Date(), `failed ipns update:`, resIPNS, {
      lastDataHash,
      lastCid,
    });
    return;
  }

  const resGetIpns2 = await gw3Client.getIpns(testGw3IPNSKey);
  // console.log(new Date(), "ipns name get:", resGetIpns2);
  console.log(new Date(), `ipns name get ${testGw3IPNSKey}:`, resGetIpns2);

  dagLinks = await gw3Client.getDAG(lastCid); // retrieve again
  console.log(
    new Date(),
    `get current running last cid ${lastCid} dag ${+dagLinks?.Links
      ?.length} links:`,
    dagLinks?.Links
  );
  existingLinks = new Map<string, any>(
    dagLinks?.Links?.map((e: any) => [e.Name, e])
  );
  existingCids = new Set<string>(
    dagLinks?.Links?.map((e: any) => e.Hash["/"])?.filter(Boolean)
  );

  // add all sub-links to unpin
  const toUnpinCids = new Set<string>(existingCids);

  const missingEntries = articles.filter(
    ({ id, slug, dataHash }) =>
      // !(existingLinks.get(name)?.Hash["/"] === cid) && waitCids.has(cid)
      !existingLinks.has(`${id}-${slug}`)
  );
  const missingEntriesInLast50 = articles.slice(0, 50).filter(
    ({ id, slug, dataHash }) =>
      // !(existingLinks.get(name)?.Hash["/"] === cid) && waitCids.has(cid)
      !existingLinks.has(`${id}-${slug}`)
  );
  if (missingEntries.length > 0) {
    console.log(
      new Date(),
      `still has ${missingEntries.length} entries missing:`,
      missingEntries.map(({ id, slug, dataHash }) => ({
        path: `${id}-${slug}`,
        dataHash,
      }))
    );
  }
  gw3Client.renamePin(lastCid, topAuthorDirName); // async without wait'ing
  lastCidData = await gw3Client.addPinWait(lastCid, topAuthorDirName);
  console.log(new Date(), `lastCid ${lastCid} pin:`, lastCidData);

  const newTopDagLinks = await gw3Client.getDAG(lastCid);
  newTopDagLinks?.Links?.forEach((e: any) => toUnpinCids.add(e?.Hash["/"]));

  const statsData = {
    userName: author.userName,
    limit: Math.max(articles.length, drafts.length),
    missing: missingEntries.length,
    missingInLast50:
      missingEntries.length === 0 ? undefined : missingEntriesInLast50.length,
    testGw3IPNSKey,
    ipnsKey: testGw3IPNSKey,
    pem: keyPair.pem,
    pemName: kname,
    lastDataHash: lastCid,
    lastCidSize: lastCidData?.size,
    lastCidSublinks: newTopDagLinks?.Links?.length,
    // lastPublished: ipnsKeyRecUpdated?.lastPublished,
    lastPublished: resGetIpns2?.data?.publish_at
      ? new Date(resGetIpns2.data.publish_at * 1000)
      : undefined,
    retriesAfterMissing:
      missingEntries.length > 0
        ? (ipnsKeyRec?.stats?.retriesAfterMissing ?? 0) + 1
        : undefined,
    useMattersIPNS: useMattersIPNS || undefined,
  };
  let ipnsKeyRecUpdated: Item = ipnsKeyRec!;

  if (lastCid === lastDataHash) {
    console.log(
      new Date(),
      `skip update because new lastCid is same as lastDataHash:`,
      { lastCid, lastDataHash }
    );
  } else {
    const [ret] = await dbApi.upsertUserIPNSKey(
      author.id,
      statsData,
      Array.from(
        // keys to delte from stats
        new Set(
          [
            [
              missingEntries.length === 0
                ? ["retriesAfterMissing", "missingInLast50"]
                : undefined,
            ],
            [
              missingEntriesInLast50.length === 0
                ? "missingInLast50"
                : undefined,
            ],
            [useMattersIPNS ? undefined : "useMattersIPNS"],
          ]
            .flat(Infinity)
            .filter(Boolean)
        )
      ) as string[]
    );
    console.log(new Date(), "ipns name updated:", ret);
    if (ret) {
      ipnsKeyRecUpdated = ret;
      // statsData.lastPublished = ret.lastPublished;
    }
  }

  console.log(
    new Date(),
    `updated for author: '${author.displayName} (@${author.userName})': get ${articles.length} articles /${drafts.length} drafts`,
    missingEntriesInLast50.map(({ id, slug, dataHash }) => ({
      path: `${id}-${slug}`,
      dataHash,
    })),
    statsData
  );

  toUnpinCids.delete(lastCid);
  if (ipnsKeyRecUpdated?.lastDataHash)
    toUnpinCids.delete(ipnsKeyRecUpdated.lastDataHash);
  if (toUnpinCids.size > 0) {
    console.log(
      new Date(),
      `try unpin all ${toUnpinCids.size} unneeded pins:`,
      toUnpinCids
    );
    toUnpinCids.forEach((cid) => {
      gw3Client.rmPin(cid);
    });
  }

  return statsData;
}

function delay(timeout: number) {
  return new Promise((fulfilled) => setTimeout(fulfilled, timeout));
}
