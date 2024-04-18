import { generateKeyPair } from 'crypto'

import { Readable } from 'node:stream'
// import FormData from "form-data";
import { create } from 'ipfs-http-client'
// import { Readable } from 'stream'
import { promisify } from 'util'

const generateKeyPairPromisified = promisify(generateKeyPair)

export class IPFSServerPool {
  #serverUrls
  #servers

  // a list of IPFS servers in comma separated: 'ipfs.dev.vpc:5001, ipfs2...:5001'
  constructor(servers: string) {
    this.#serverUrls = servers.trim().split(/,\s*/).filter(Boolean)
    this.#servers = this.#serverUrls.map((url) => create({ url }))
    // console.log('servers initialized:', this.#servers);
  }
  get size() {
    return this.#servers.length
  }
  get client() {
    // const idx = active ? 0 : Math.floor(1 + Math.random() * (this.size - 1))
    // return this.clients[0];
    return this.#servers[0]
  }
  get backupClient() {
    const idx = Math.floor(1 + Math.random() * (this.size - 1))
    return this.#servers[idx]
  }

  // TODO: manage multiple servers in round-robin
  get() {
    // just a large prime number
    // const randIdx = Math.floor(Math.random() * 97) % this.#servers.length;
    const randIdx = Math.floor(
      Math.pow(Math.random(), 2) * this.#servers.length
    ) // leaning toward left
    // console.log('return randIdx:', { randIdx });
    return this.#servers[randIdx]
  }

  // TODO some thing before release a node
  // release() {}

  // same as `openssl genpkey -algorithm ED25519`
  genKey = async () => generateKeyPairPromisified('ed25519') // {

  async importKey({
    name,
    pem,
    lastIdx,
  }: {
    name: string
    pem: string
    lastIdx?: number
  }) {
    const idx =
      lastIdx != null
        ? (lastIdx + 1) % this.#servers.length
        : Math.floor(Math.pow(Math.random(), 2) * this.#servers.length) // leaning toward left
    const ipfsServerUrl = this.#serverUrls[idx]
    const u = new URL(`${ipfsServerUrl}/api/v0/key/import`)
    u.searchParams.set('arg', name)
    u.searchParams.set('format', 'pem-pkcs8-cleartext')
    const formData = new FormData()
    formData.append(
      'file',
      new Blob([pem]), // Readable.from([pem]),
      'keyfile'
    )
    const imported = await fetch(u, {
      method: 'POST',
      body: formData,
    }).then(async (res) => {
      if (res.ok) return res.json()
      console.log(
        new Date(),
        'non json in import key:',
        res.ok,
        res.status,
        res.statusText,
        res.headers,
        await res.text()
      )
    })
    console.log(new Date(), `imported to server:"${ipfsServerUrl}":`, imported)
    return { imported, client: this.#servers[idx], lastIdx: idx }
  }
}

// connect to a different API
export const ipfsPool = new IPFSServerPool(
  process.env.MATTERS_IPFS_SERVERS || 'http://ipfs.dev.vpc:5001'
)
