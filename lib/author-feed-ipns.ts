import { generateKeyPair } from "node:crypto";
import { promisify } from "node:util";

import {
  // HomepageArticleDigest,
  ArticlePageContext,
  HomepageContext,
  makeArticlePage,
  makeHomepage,
  makeHomepageBundles,
  makeActivityPubBundles,
} from "@matters/ipns-site-generator";
import slugify from "@matters/slugify";

import { ipfsPool } from "../lib/ipfs-servers.js";
import { dbApi, Item } from "../lib/db.js";

const generateKeyPairPromisified = promisify(generateKeyPair);

export const ARTICLE_ACCESS_TYPE = {
  public: "public",
  paywall: "paywall",
} as const;

const siteDomain = process.env.MATTERS_SITE_DOMAIN || "matters.town";

export class AuthorFeed {
  author: Item;
  ipnsKey: string; // the ipns key

  // internal use
  publishedDrafts: Item[];
  userImg?: string | null;
  articles?: Map<string, Item>;
  webfHost?: string;

  // articleService: InstanceType<typeof ArticleService>
  // draftService: InstanceType<typeof DraftService>
  // tagService: InstanceType<typeof TagService>
  // systemService: InstanceType<typeof SystemService>

  constructor({
    author,
    ipnsKey,
    webfHost,
    drafts,
    articles,
  }: {
    author: Item;
    ipnsKey: string;
    webfHost?: string;
    drafts: Item[];
    articles?: Item[];
  }) {
    this.author = author;
    this.ipnsKey = ipnsKey;
    this.webfHost = webfHost || `${this.ipnsKey}.ipns.cf-ipfs.com`;

    // this.articleService = new ArticleService()
    // this.draftService = new DraftService()
    // this.systemService = new SystemService()

    this.publishedDrafts = drafts;
    if (articles) {
      this.articles = new Map(articles.map((arti) => [arti.id, arti]));
    }
  }

  async loadData() {
    this.userImg = await dbApi.findAssetUrl(
      this.author.avatar,
      "w=240,h=240,fit=crop,anim=false"
    ); // this.author.avatar || null; // && (await this.systemService.findAssetUrl(this.author.avatar))
    console.log(new Date(), "loadData got userImg:", this.userImg);
  }

  // mov from articleService.ts
  generate() {
    const { userName, displayName, description } = this.author;

    const context = {
      meta: {
        title: `${displayName} (${userName}) - Matters`,
        description,
        authorName: displayName,
        image: this.userImg || undefined,
        siteDomain,
      },
      byline: {
        author: {
          name: `${displayName} (${userName})`,
          displayName,
          userName,
          uri: `https://${siteDomain}/@${userName}`,
          ipnsKey: this.ipnsKey,
          webfDomain: this.webfHost,
        },
        website: {
          name: "Matters",
          uri: `https://${siteDomain}`,
        },
      },
      rss: this.ipnsKey
        ? {
            // ipnsKey: this.ipnsKey,
            xml: "./rss.xml",
            json: "./feed.json",
          }
        : undefined,
      articles: this.publishedDrafts
        // .sort((a, b) => +b.articleId - +a.articleId)
        .map((draft) => {
          const arti = this.articles?.get(draft.articleId);
          if (!arti) return;

          return {
            id: draft.articleId ?? arti.id,
            author: {
              userName,
              displayName,
            },
            title: draft.title,
            summary: draft.summary,
            // date: draft.updatedAt,
            date: arti.createdAt, // || draft.updatedAt,
            content: draft.content,
            // tags: draft.tags || [],
            uri: `./${draft.articleId ?? arti.id}-${
              arti.slug ?? slugify(arti.title)
            }/`,
            sourceUri: `https://${siteDomain}/@${userName}/${
              draft.articleId ?? arti.id
            }-${arti.slug ?? slugify(arti.title)}/`,
          };
        })
        .filter(Boolean) as any[],
    } as HomepageContext;

    return makeHomepage(context);
  }

  // dup from articleService.ts
  async publishToIPFS(draft: Item) {
    // prepare metadata
    const {
      title,
      content,
      summary,
      cover,
      tags,
      circleId,
      access,
      authorId,
      articleId,
      updatedAt: publishedAt,
    } = draft;

    const {
      userName,
      displayName,
      description, // paymentPointer
    } = this.author;
    const articleCoverImg = await dbApi.findAssetUrl(cover);

    const context: ArticlePageContext = {
      encrypted: false,
      meta: {
        title: `${title} - ${displayName} (${userName})`,
        description: summary,
        authorName: displayName,
        image: articleCoverImg || undefined,
        siteDomain,
      },
      byline: {
        date: publishedAt,
        author: {
          name: `${displayName} (${userName})`,
          displayName,
          userName,
          uri: `https://${siteDomain}/@${userName}`,
          ipnsKey: this.ipnsKey,
          webfDomain: this.webfHost,
        },
        website: {
          name: "Matters",
          uri: `https://${siteDomain}`,
        },
      },
      rss: this.ipnsKey
        ? {
            // ipnsKey: this.ipnsKey,
            xml: "../rss.xml",
            json: "../feed.json",
          }
        : undefined,
      article: {
        id: articleId,
        author: {
          userName,
          displayName,
        },
        title,
        summary,
        date: publishedAt,
        content,
        tags: tags?.map((t: string) => t.trim()).filter(Boolean) || [],
      },
    };

    // paywalled content
    if (circleId && access === ARTICLE_ACCESS_TYPE.paywall) {
      context.encrypted = true;
      console.error(
        new Date(),
        `TODO: support ARTICLE_ACCESS_TYPE.paywall`,
        draft
      );
      return;
    }

    // payment pointer
    // if (paymentPointer) { context.paymentPointer = paymentPointer }

    // make bundle and add content to ipfs
    const directoryName = "article";
    const { bundle, key } = await makeArticlePage(context);

    let ipfs = ipfsPool.client;
    let retries = 0;

    do {
      try {
        const results = [];
        for await (const result of ipfs.addAll(
          bundle
            .map((file) =>
              file
                ? { ...file, path: `${directoryName}/${file.path}` }
                : undefined
            )
            .filter(Boolean) as any
        )) {
          results.push(result);
        }

        // filter out the hash for the bundle
        let entry = results.filter(
          ({ path }: { path: string }) => path === directoryName
        );

        // FIXME: fix missing bundle path and remove fallback logic
        // fallback to index file when no bundle path is matched
        if (entry.length === 0) {
          entry = results.filter(({ path }: { path: string }) =>
            path.endsWith("index.html")
          );
        }

        const contentHash = entry[0].cid.toString();
        const mediaHash = entry[0].cid.toV1().toString(); // cid.toV1().toString() // cid.toBaseEncodedString()
        return { contentHash, mediaHash, key };
      } catch (err) {
        // if the active IPFS client throws exception, try a few more times on Secondary
        console.error(
          `publishToIPFS failed, retries ${++retries} time, ERROR:`,
          err
        );
        ipfs = ipfsPool.backupClient;
      }
    } while (ipfs && retries <= ipfsPool.size); // break the retry if there's no backup

    // re-fill dataHash & mediaHash later in IPNS-listener
    console.error(`failed publishToIPFS after ${retries} retries.`);
  }

  async feedBundles() {
    const { userName, displayName, description } = this.author;

    const context = {
      meta: {
        title: `${displayName} (${userName}) - Matters`,
        description,
        authorName: displayName,
        image: this.userImg || undefined,
        siteDomain,
      },
      byline: {
        author: {
          name: `${displayName} (${userName})`,
          uri: `https://${siteDomain}/@${userName}`,
        },
        website: {
          name: "Matters",
          uri: `https://${siteDomain}`,
        },
      },
      rss: this.ipnsKey
        ? {
            // ipnsKey: this.ipnsKey,
            xml: "./rss.xml",
            json: "./feed.json",
          }
        : undefined,
      articles: this.publishedDrafts
        // .sort((a, b) => +b.articleId - +a.articleId)
        .map((draft) => {
          const arti = this.articles?.get(draft.articleId);
          if (!arti) return;

          return {
            id: draft.articleId ?? arti.id,
            author: {
              userName,
              displayName,
            },
            title: draft.title,
            slug: arti.slug ?? slugify(arti.title),
            summary: draft.summary,
            // date: draft.updatedAt,
            date: arti.createdAt, // || draft.updatedAt,
            content: draft.content,
            // tags: draft.tags || [],
            createdAt: arti.createdAt,
            uri: `./${draft.articleId ?? arti.id}-${
              arti.slug ?? slugify(arti.title)
            }/`,
            sourceUri: `https://${siteDomain}/@${userName}/${
              draft.articleId ?? arti.id
            }-${arti.slug ?? slugify(arti.title)}/`,
          };
        })
        .filter(Boolean) as any[],
    } as HomepageContext;

    return makeHomepageBundles(context);
    /* const { html, xml, json } = await makeHomepage(context);
    return [
      { path: "index.html", content: html },
      { path: "rss.xml", content: xml },
      { path: "feed.json", content: json },
    ] as { path: string; content: string }[]; */
  }

  async activityPubBundles() {
    // const k = await generateKeyPairPromisified("rsa", { modulusLength: 4096, publicKeyEncoding: { type: "spki", format: "pem" }, privateKeyEncoding: { type: "pkcs8", format: "pem" }, });

    const actor = `https://${this.webfHost}/about.jsonld`;
    const outboxItems = this.publishedDrafts; // .slice(0, 3); // test at most 3 entries
    // .sort((a, b) => +b.articleId - +a.articleId)
    const outboxContent = {
      "@context": "https://www.w3.org/ns/activitystreams",
      id: actor,
      type: "OrderedCollection",
      totalItems: outboxItems.length,
      orderedItems: outboxItems.map((draft) => {
        const arti = this.articles?.get(draft.articleId);
        if (!arti) return;
        const url = `https://${this.webfHost}/${draft.articleId ?? arti.id}-${
          arti.slug ?? slugify(arti.title)
        }/`;

        return {
          "@context": "https://www.w3.org/ns/activitystreams",
          type: "Create",
          actor,
          published: arti.createdAt,
          to: ["https://www.w3.org/ns/activitystreams#Public"],
          cc: [`https://${this.webfHost}/followers.jsonld`],
          object: {
            "@context": "https://www.w3.org/ns/activitystreams",

            id: url,
            type: "Note",
            summary: arti.summary,
            published: arti.createdAt,
            content: `${arti.title}<br>${arti.summary}`,
            url,
            attributedTo: actor,
            to: ["https://www.w3.org/ns/activitystreams#Public"],
            cc: [],
            sensitive: false,
            atomUri: url,
            inReplyToAtomUri: null,
            // "conversation": "tag:staticpub.mauve.moe,2023-06-29:objectId=294618:objectType=Conversation",
            // "content": "This is a new post that's getting sent right into your inbox. Can you see it?",
            attachment: [],
            tag: [],
            // "replies": "https://staticpub.mauve.moe/newpost-replies.jsonld"
          },
        };
      }),
    };

    // if (!webfHost) webfHost = `${this.ipnsKey}.ipns.cf-ipfs.com`;

    return [
      {
        path: `.well-known/webfinger`,
        content: JSON.stringify(
          {
            subject: `acct:${this.author.userName}@${this.webfHost}`,
            aliases: Array.from(
              new Set(
                [
                  `https://${this.webfHost}`,
                  `https://${this.ipnsKey}.ipns.cf-ipfs.com`,
                  `https://matters.town/@${this.author.userName}`,
                ].filter(Boolean)
              )
            ),
            links: [
              {
                rel: "http://webfinger.net/rel/profile-page",
                type: "text/html",
                href: `https://${this.webfHost}`,
              },
              {
                rel: "self",
                type: "application/activity+json",
                href: actor,
              },
            ],
          },
          null,
          2
        ),
      },
      {
        path: "about.jsonld",
        content: JSON.stringify(
          {
            "@context": [
              "https://www.w3.org/ns/activitystreams",
              "https://w3id.org/security/v1",
              {
                // "@language": "en- US",
                toot: "http://joinmastodon.org/ns#",
                discoverable: "toot:discoverable",
                alsoKnownAs: {
                  "@id": "as:alsoKnownAs",
                  "@type": "@id",
                },
              },
            ],
            type: "Person",
            id: actor,
            inbox: `https://${this.webfHost}/inbox.jsonld`, // TO accept POST
            outbox: `https://${this.webfHost}/outbox.jsonld`,
            // "following": "https://cloudflare.social/ap/users/cloudflare/following",
            // "followers": "https://cloudflare.social/ap/users/cloudflare/followers",

            // "inbox": "https://social.dp.chanterelle.xyz/v1/@mauve@staticpub.mauve.moe/inbox",
            // "following": "https://staticpub.mauve.moe/following.jsonld",
            // "followers": "https://staticpub.mauve.moe/followers.jsonld",
            preferredUsername: this.author.userName,
            name: `${this.author.displayName}`.trim(),
            summary: (this.author.description || "").trim(),
            discoverable: true,

            icon: this.userImg
              ? [
                  {
                    // type: "Image",
                    // mediaType: "image/png",
                    // name: "Distributed Press logo",
                    url: this.userImg, // avatarUrl,
                  },
                ]
              : undefined,
            publicKey: {
              "@context": "https://w3id.org/security/v1",
              "@type": "Key",
              // "id": "https://paul.kinlan.me/paul#main-key",
              id: `https://${this.webfHost}/about.jsonld#main-key`,
              owner: actor,
              // TODO: save its privateKey in DB
              // publicKeyPem: k.publicKey, // .export({ format: "pem", type: "pkcs1", }),
              // "-----BEGIN PUBLIC KEY-----\nMIICIjANBgkqhkiG9w0B......0r8CAwEAAQ==\n-----END PUBLIC KEY-----",
            },
            // "type": "Person",
            // "id": "https://cloudflare.social/ap/users/cloudflare",
            published: (
              outboxContent.orderedItems?.[0]?.object?.published ?? new Date()
            ).toISOString(), // "2023-02-08T16:38:10.000Z",
            url: `https://${this.webfHost}`, // "https://cloudflare.social/@cloudflare"
          },
          null,
          2
        ),
      },

      {
        path: "outbox.jsonld",
        content: JSON.stringify(outboxContent, null, 2),
      },
    ] as { path: string; content: string }[];
  }
}
