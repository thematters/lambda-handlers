import { Readable } from "node:stream";
// import FormData from "form-data";
import { create } from "ipfs-http-client";

export class IPFSServerPool {
  #serverUrls;
  #servers;

  // a list of IPFS servers in comma separated: 'ipfs.dev.vpc:5001, ipfs2...:5001'
  constructor(servers: string) {
    this.#serverUrls = servers.trim().split(/,\s*/).filter(Boolean);
    this.#servers = this.#serverUrls.map((url) => create({ url }));
    // console.log('servers initialized:', this.#servers);
  }
  get size() {
    return this.#servers.length;
  }

  // TODO: manage multiple servers in round-robin
  get() {
    // 97 is a large prime number
    const randIdx = Math.floor(Math.random() * 97) % this.#servers.length;
    // console.log('return randIdx:', { randIdx });
    return this.#servers[randIdx];
  }

  // TODO some thing before release a node
  // release() {}

  async importKey({ name, pem }: { name: string; pem: string }) {
    const randIdx = Math.floor(Math.random() * 97) % this.#servers.length;
    const ipfsServerUrl = this.#serverUrls[randIdx];
    const url = new URL(`${ipfsServerUrl}/api/v0/key/import`);
    url.searchParams.set("arg", name);
    url.searchParams.set("format", "pem-pkcs8-cleartext");
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([pem]), // Readable.from([pem]),
      "keyfile"
    );
    const imported = await fetch(url, {
      method: "POST",
      body: formData,
    }).then(async (res) => {
      if (res.ok) return res.json();
      // console.log( "non json in import key:", res.ok, res.status, res.statusText, res.headers, await res.text());
    });
    // console.log(`imported to server:"${ipfsServerUrl}":`, imported);
    return this.#servers[randIdx];
  }
}

// connect to a different API
export const ipfsPool = new IPFSServerPool(
  process.env.MATTERS_IPFS_SERVERS || "http://ipfs.dev.vpc:5001"
);
