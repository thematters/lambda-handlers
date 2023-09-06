import {
  // HomepageArticleDigest,
  ArticlePageContext,
  HomepageContext,
  makeArticlePage,
  makeHomepage,
} from "@matters/ipns-site-generator";
import slugify from "@matters/slugify";

import { ipfsPool } from "../lib/ipfs-servers.js";
import { dbApi, Item } from "../lib/db.js";

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

  // articleService: InstanceType<typeof ArticleService>
  // draftService: InstanceType<typeof DraftService>
  // tagService: InstanceType<typeof TagService>
  // systemService: InstanceType<typeof SystemService>

  constructor(
    author: Item,
    ipnsKey: string,
    drafts: Item[],
    articles?: Item[]
  ) {
    this.author = author;
    this.ipnsKey = ipnsKey;

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
      "w=240,h=240,fit=crop"
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
          uri: `https://${siteDomain}/@${userName}`,
        },
        website: {
          name: "Matters",
          uri: `https://${siteDomain}`,
        },
      },
      rss: this.ipnsKey
        ? {
            ipnsKey: this.ipnsKey,
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
          uri: `https://${siteDomain}/@${userName}`,
        },
        website: {
          name: "Matters",
          uri: `https://${siteDomain}`,
        },
      },
      rss: this.ipnsKey
        ? {
            ipnsKey: this.ipnsKey,
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
}
