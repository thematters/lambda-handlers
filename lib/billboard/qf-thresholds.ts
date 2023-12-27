export const POINTS = {
  // mattersHasArticlesBeFeatured: 2.0, // has articles be featured
  mattersHasDonatedFeatured: 2.0, // has donated to featured articles
  mattersNumDonatedAuthors: 2.0, // has donated to others authors' articles
  mattersNumArticlesBeDonated: 2.0, // has articles be donated
  mattersReadingPoints: 2.0, // has read articles>= 30 && has reading_days >= 5
  mattersComments: 1.0, // 評論 ≥ 10
  mattersHasBadgedFollowers: 1.0, // has followers with Traveloggers、Badge、ENS
  mattersHas5Followers: 1.0, // need numFollowers >= 5
  mattersAgeBefore: 1.0, // need userRegistraiton time < period beginning
  mattersBadges: 6.0, // need hold badges >= 1
  mattersTravloggHolders: 6.0, // need hold TravloggNFT >= 1

  gitcoinActivities: 3.0, // gitcoin donations >= 1

  hasSocialTwitter: 3.0,
  hasSocialGoogle: 1.0,

  ethENSDomains: 2.0,
  ethNFTs: 1.0, // any other NFTs on ETH mainnet
} as const

export function checkSendersTrustPoints(obj: any) {
  return {
    // obj.numArticlesFeatured > 0 ? POINTS.mattersHasArticlesBeFeatured : 0.0, //
    mattersNumArticlesBeDonated:
      obj.numArticlesBeDonated >= 5 ? POINTS.mattersNumArticlesBeDonated : 0.0,
    mattersNumDonatedAuthors:
      obj.numDonatedAuthors >= 10 ? POINTS.mattersNumDonatedAuthors : 0.0,
    mattersReadingPoints:
      obj.numReadArticles >= 30 && obj.numReadingDays >= 5
        ? POINTS.mattersReadingPoints
        : 0.0,
    mattersComments: obj.numComments >= 10 ? POINTS.mattersComments : 0.0,

    // false ? POINTS.mattersHasDonatedFeatured : 0.0, // TBD
    // false ? POINTS.mattersHasBadgedFollowers : 0.0, // TBD
    mattersHas5Followers:
      obj.numFollowers >= 5 ? POINTS.mattersHas5Followers : 0.0, //
    mattersAgeBefore: obj.isRegisteredBefore ? POINTS.mattersAgeBefore : 0.0, // need userRegistraiton time < period beginning
    mattersBadges: obj.numBadges >= 1 ? POINTS.mattersBadges : 0.0, // need hold badges >= 1
    mattersTravloggHolders:
      obj.numTravloggHolders! >= 1 ? POINTS.mattersTravloggHolders : 0.0, // need hold TravloggNFT >= 1
    numETHMainnetENSDomains:
      obj.numETHMainnetENSDomains! >= 1 ? POINTS.ethENSDomains : 0.0,
    numETHMainnetNFTs: obj.numETHMainnetENSDomains! >= 1 ? POINTS.ethNFTs : 0.0,
    gitcoinActivities:
      obj?.gitcoinActivities > 0 ? POINTS.gitcoinActivities : 0.0,

    // gitcoinActivities: 3.0, // gitcoin donations >= 1

    hasSocialGoogle: obj.hasGoogleAccount ? POINTS.hasSocialGoogle : 0.0,
    hasSocialTwitter: obj.hasTwitterAccount ? POINTS.hasSocialTwitter : 0.0,
    // ethENS: 2.0,
    // ethNFTs: 1.0, // any other NFTs on ETH mainnet
  }
}
