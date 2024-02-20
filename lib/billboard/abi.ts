export const billboardAbi = [
    {
      inputs: [
        {
          internalType: "address",
          name: "token_",
          type: "address",
        },
        {
          internalType: "address payable",
          name: "registry_",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "taxRate_",
          type: "uint256",
        },
        {
          internalType: "uint64",
          name: "leaseTerm_",
          type: "uint64",
        },
        {
          internalType: "string",
          name: "name_",
          type: "string",
        },
        {
          internalType: "string",
          name: "symbol_",
          type: "string",
        },
      ],
      stateMutability: "nonpayable",
      type: "constructor",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "value_",
          type: "address",
        },
      ],
      name: "addToWhitelist",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "admin",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "amount_",
          type: "uint256",
        },
      ],
      name: "calculateTax",
      outputs: [
        {
          internalType: "uint256",
          name: "tax",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "tokenId_",
          type: "uint256",
        },
      ],
      name: "clearAuction",
      outputs: [
        {
          internalType: "uint256",
          name: "price",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "tax",
          type: "uint256",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256[]",
          name: "tokenIds_",
          type: "uint256[]",
        },
      ],
      name: "clearAuctions",
      outputs: [
        {
          internalType: "uint256[]",
          name: "prices",
          type: "uint256[]",
        },
        {
          internalType: "uint256[]",
          name: "taxes",
          type: "uint256[]",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "tokenId_",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "auctionId_",
          type: "uint256",
        },
      ],
      name: "getAuction",
      outputs: [
        {
          components: [
            {
              internalType: "uint64",
              name: "startAt",
              type: "uint64",
            },
            {
              internalType: "uint64",
              name: "endAt",
              type: "uint64",
            },
            {
              internalType: "uint64",
              name: "leaseStartAt",
              type: "uint64",
            },
            {
              internalType: "uint64",
              name: "leaseEndAt",
              type: "uint64",
            },
            {
              internalType: "address",
              name: "highestBidder",
              type: "address",
            },
          ],
          internalType: "struct IBillboardRegistry.Auction",
          name: "auction",
          type: "tuple",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "tokenId_",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "auctionId_",
          type: "uint256",
        },
        {
          internalType: "address",
          name: "bidder_",
          type: "address",
        },
      ],
      name: "getBid",
      outputs: [
        {
          components: [
            {
              internalType: "uint256",
              name: "price",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "tax",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "placedAt",
              type: "uint256",
            },
            {
              internalType: "bool",
              name: "isWon",
              type: "bool",
            },
            {
              internalType: "bool",
              name: "isWithdrawn",
              type: "bool",
            },
          ],
          internalType: "struct IBillboardRegistry.Bid",
          name: "bid",
          type: "tuple",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "tokenId_",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "auctionId_",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "limit_",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "offset_",
          type: "uint256",
        },
      ],
      name: "getBids",
      outputs: [
        {
          internalType: "uint256",
          name: "total",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "limit",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "offset",
          type: "uint256",
        },
        {
          components: [
            {
              internalType: "uint256",
              name: "price",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "tax",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "placedAt",
              type: "uint256",
            },
            {
              internalType: "bool",
              name: "isWon",
              type: "bool",
            },
            {
              internalType: "bool",
              name: "isWithdrawn",
              type: "bool",
            },
          ],
          internalType: "struct IBillboardRegistry.Bid[]",
          name: "bids",
          type: "tuple[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "tokenId_",
          type: "uint256",
        },
      ],
      name: "getBoard",
      outputs: [
        {
          components: [
            {
              internalType: "address",
              name: "creator",
              type: "address",
            },
            {
              internalType: "string",
              name: "name",
              type: "string",
            },
            {
              internalType: "string",
              name: "description",
              type: "string",
            },
            {
              internalType: "string",
              name: "location",
              type: "string",
            },
            {
              internalType: "string",
              name: "contentURI",
              type: "string",
            },
            {
              internalType: "string",
              name: "redirectURI",
              type: "string",
            },
          ],
          internalType: "struct IBillboardRegistry.Board",
          name: "board",
          type: "tuple",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getTaxRate",
      outputs: [
        {
          internalType: "uint256",
          name: "taxRate",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "isOpened",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "to_",
          type: "address",
        },
      ],
      name: "mintBoard",
      outputs: [
        {
          internalType: "uint256",
          name: "tokenId",
          type: "uint256",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "tokenId_",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "amount_",
          type: "uint256",
        },
      ],
      name: "placeBid",
      outputs: [],
      stateMutability: "payable",
      type: "function",
    },
    {
      inputs: [],
      name: "registry",
      outputs: [
        {
          internalType: "contract BillboardRegistry",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "value_",
          type: "address",
        },
      ],
      name: "removeFromWhitelist",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "tokenId_",
          type: "uint256",
        },
        {
          internalType: "string",
          name: "contentURI_",
          type: "string",
        },
      ],
      name: "setBoardContentURI",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "tokenId_",
          type: "uint256",
        },
        {
          internalType: "string",
          name: "description_",
          type: "string",
        },
      ],
      name: "setBoardDescription",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "tokenId_",
          type: "uint256",
        },
        {
          internalType: "string",
          name: "location_",
          type: "string",
        },
      ],
      name: "setBoardLocation",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "tokenId_",
          type: "uint256",
        },
        {
          internalType: "string",
          name: "name_",
          type: "string",
        },
      ],
      name: "setBoardName",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "tokenId_",
          type: "uint256",
        },
        {
          internalType: "string",
          name: "redirectURI_",
          type: "string",
        },
      ],
      name: "setBoardRedirectURI",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bool",
          name: "value_",
          type: "bool",
        },
      ],
      name: "setIsOpened",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "operator_",
          type: "address",
        },
      ],
      name: "setRegistryOperator",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "taxRate_",
          type: "uint256",
        },
      ],
      name: "setTaxRate",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      name: "whitelist",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "tokenId_",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "auctionId_",
          type: "uint256",
        },
      ],
      name: "withdrawBid",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "withdrawTax",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
  ] as const;
  
  export const billboardRegistryAbi = [
    {
      inputs: [
        {
          internalType: "address",
          name: "token_",
          type: "address",
        },
        {
          internalType: "address",
          name: "operator_",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "taxRate_",
          type: "uint256",
        },
        {
          internalType: "uint64",
          name: "leaseTerm_",
          type: "uint64",
        },
        {
          internalType: "string",
          name: "name_",
          type: "string",
        },
        {
          internalType: "string",
          name: "symbol_",
          type: "string",
        },
      ],
      stateMutability: "nonpayable",
      type: "constructor",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "owner",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "approved",
          type: "address",
        },
        {
          indexed: true,
          internalType: "uint256",
          name: "tokenId",
          type: "uint256",
        },
      ],
      name: "Approval",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "owner",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "operator",
          type: "address",
        },
        {
          indexed: false,
          internalType: "bool",
          name: "approved",
          type: "bool",
        },
      ],
      name: "ApprovalForAll",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "uint256",
          name: "tokenId",
          type: "uint256",
        },
        {
          indexed: true,
          internalType: "uint256",
          name: "auctionId",
          type: "uint256",
        },
        {
          indexed: true,
          internalType: "address",
          name: "highestBidder",
          type: "address",
        },
        {
          indexed: false,
          internalType: "uint64",
          name: "leaseStartAt",
          type: "uint64",
        },
        {
          indexed: false,
          internalType: "uint64",
          name: "leaseEndAt",
          type: "uint64",
        },
      ],
      name: "AuctionCleared",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "uint256",
          name: "tokenId",
          type: "uint256",
        },
        {
          indexed: true,
          internalType: "uint256",
          name: "auctionId",
          type: "uint256",
        },
        {
          indexed: false,
          internalType: "uint64",
          name: "startAt",
          type: "uint64",
        },
        {
          indexed: false,
          internalType: "uint64",
          name: "endAt",
          type: "uint64",
        },
      ],
      name: "AuctionCreated",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "uint256",
          name: "tokenId",
          type: "uint256",
        },
        {
          indexed: true,
          internalType: "uint256",
          name: "auctionId",
          type: "uint256",
        },
        {
          indexed: true,
          internalType: "address",
          name: "bidder",
          type: "address",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "price",
          type: "uint256",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "tax",
          type: "uint256",
        },
      ],
      name: "BidCreated",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "uint256",
          name: "tokenId",
          type: "uint256",
        },
        {
          indexed: true,
          internalType: "uint256",
          name: "auctionId",
          type: "uint256",
        },
        {
          indexed: true,
          internalType: "address",
          name: "bidder",
          type: "address",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "price",
          type: "uint256",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "tax",
          type: "uint256",
        },
      ],
      name: "BidWithdrawn",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "uint256",
          name: "tokenId",
          type: "uint256",
        },
        {
          indexed: true,
          internalType: "uint256",
          name: "auctionId",
          type: "uint256",
        },
        {
          indexed: true,
          internalType: "address",
          name: "bidder",
          type: "address",
        },
      ],
      name: "BidWon",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "uint256",
          name: "tokenId",
          type: "uint256",
        },
        {
          indexed: false,
          internalType: "string",
          name: "contentURI",
          type: "string",
        },
      ],
      name: "BoardContentURIUpdated",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "uint256",
          name: "tokenId",
          type: "uint256",
        },
        {
          indexed: false,
          internalType: "string",
          name: "description",
          type: "string",
        },
      ],
      name: "BoardDescriptionUpdated",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "uint256",
          name: "tokenId",
          type: "uint256",
        },
        {
          indexed: false,
          internalType: "string",
          name: "location",
          type: "string",
        },
      ],
      name: "BoardLocationUpdated",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "uint256",
          name: "tokenId",
          type: "uint256",
        },
        {
          indexed: false,
          internalType: "string",
          name: "name",
          type: "string",
        },
      ],
      name: "BoardNameUpdated",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "uint256",
          name: "tokenId",
          type: "uint256",
        },
        {
          indexed: false,
          internalType: "string",
          name: "redirectURI",
          type: "string",
        },
      ],
      name: "BoardRedirectURIUpdated",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "operator",
          type: "address",
        },
      ],
      name: "OperatorUpdated",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "uint256",
          name: "taxRate",
          type: "uint256",
        },
      ],
      name: "TaxRateUpdated",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "owner",
          type: "address",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "amount",
          type: "uint256",
        },
      ],
      name: "TaxWithdrawn",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "from",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "to",
          type: "address",
        },
        {
          indexed: true,
          internalType: "uint256",
          name: "tokenId",
          type: "uint256",
        },
      ],
      name: "Transfer",
      type: "event",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "to",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "tokenId",
          type: "uint256",
        },
      ],
      name: "approve",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      name: "auctionBidders",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      name: "auctionBids",
      outputs: [
        {
          internalType: "uint256",
          name: "price",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "tax",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "placedAt",
          type: "uint256",
        },
        {
          internalType: "bool",
          name: "isWon",
          type: "bool",
        },
        {
          internalType: "bool",
          name: "isWithdrawn",
          type: "bool",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "owner",
          type: "address",
        },
      ],
      name: "balanceOf",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      name: "boardAuctions",
      outputs: [
        {
          internalType: "uint64",
          name: "startAt",
          type: "uint64",
        },
        {
          internalType: "uint64",
          name: "endAt",
          type: "uint64",
        },
        {
          internalType: "uint64",
          name: "leaseStartAt",
          type: "uint64",
        },
        {
          internalType: "uint64",
          name: "leaseEndAt",
          type: "uint64",
        },
        {
          internalType: "address",
          name: "highestBidder",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      name: "boards",
      outputs: [
        {
          internalType: "address",
          name: "creator",
          type: "address",
        },
        {
          internalType: "string",
          name: "name",
          type: "string",
        },
        {
          internalType: "string",
          name: "description",
          type: "string",
        },
        {
          internalType: "string",
          name: "location",
          type: "string",
        },
        {
          internalType: "string",
          name: "contentURI",
          type: "string",
        },
        {
          internalType: "string",
          name: "redirectURI",
          type: "string",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "tokenId_",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "auctionId_",
          type: "uint256",
        },
        {
          internalType: "address",
          name: "highestBidder_",
          type: "address",
        },
        {
          internalType: "uint64",
          name: "leaseStartAt_",
          type: "uint64",
        },
        {
          internalType: "uint64",
          name: "leaseEndAt_",
          type: "uint64",
        },
      ],
      name: "emitAuctionCleared",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "tokenId_",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "auctionId_",
          type: "uint256",
        },
        {
          internalType: "address",
          name: "bidder_",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "price_",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "tax_",
          type: "uint256",
        },
      ],
      name: "emitBidWithdrawn",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "owner_",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "amount_",
          type: "uint256",
        },
      ],
      name: "emitTaxWithdrawn",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "tokenId",
          type: "uint256",
        },
      ],
      name: "getApproved",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "tokenId_",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "auctionId_",
          type: "uint256",
        },
      ],
      name: "getAuction",
      outputs: [
        {
          components: [
            {
              internalType: "uint64",
              name: "startAt",
              type: "uint64",
            },
            {
              internalType: "uint64",
              name: "endAt",
              type: "uint64",
            },
            {
              internalType: "uint64",
              name: "leaseStartAt",
              type: "uint64",
            },
            {
              internalType: "uint64",
              name: "leaseEndAt",
              type: "uint64",
            },
            {
              internalType: "address",
              name: "highestBidder",
              type: "address",
            },
          ],
          internalType: "struct IBillboardRegistry.Auction",
          name: "auction",
          type: "tuple",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "tokenId_",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "auctionId_",
          type: "uint256",
        },
        {
          internalType: "address",
          name: "bidder_",
          type: "address",
        },
      ],
      name: "getBid",
      outputs: [
        {
          components: [
            {
              internalType: "uint256",
              name: "price",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "tax",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "placedAt",
              type: "uint256",
            },
            {
              internalType: "bool",
              name: "isWon",
              type: "bool",
            },
            {
              internalType: "bool",
              name: "isWithdrawn",
              type: "bool",
            },
          ],
          internalType: "struct IBillboardRegistry.Bid",
          name: "bid",
          type: "tuple",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "tokenId_",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "auctionId_",
          type: "uint256",
        },
      ],
      name: "getBidCount",
      outputs: [
        {
          internalType: "uint256",
          name: "count",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "tokenId_",
          type: "uint256",
        },
      ],
      name: "getBoard",
      outputs: [
        {
          components: [
            {
              internalType: "address",
              name: "creator",
              type: "address",
            },
            {
              internalType: "string",
              name: "name",
              type: "string",
            },
            {
              internalType: "string",
              name: "description",
              type: "string",
            },
            {
              internalType: "string",
              name: "location",
              type: "string",
            },
            {
              internalType: "string",
              name: "contentURI",
              type: "string",
            },
            {
              internalType: "string",
              name: "redirectURI",
              type: "string",
            },
          ],
          internalType: "struct IBillboardRegistry.Board",
          name: "board",
          type: "tuple",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "owner",
          type: "address",
        },
        {
          internalType: "address",
          name: "operator",
          type: "address",
        },
      ],
      name: "isApprovedForAll",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "lastTokenId",
      outputs: [
        {
          internalType: "uint256",
          name: "_value",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "leaseTerm",
      outputs: [
        {
          internalType: "uint64",
          name: "",
          type: "uint64",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "to_",
          type: "address",
        },
      ],
      name: "mintBoard",
      outputs: [
        {
          internalType: "uint256",
          name: "tokenId",
          type: "uint256",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "name",
      outputs: [
        {
          internalType: "string",
          name: "",
          type: "string",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "tokenId_",
          type: "uint256",
        },
        {
          internalType: "uint64",
          name: "startAt_",
          type: "uint64",
        },
        {
          internalType: "uint64",
          name: "endAt_",
          type: "uint64",
        },
      ],
      name: "newAuction",
      outputs: [
        {
          internalType: "uint256",
          name: "newAuctionId",
          type: "uint256",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "tokenId_",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "auctionId_",
          type: "uint256",
        },
        {
          internalType: "address",
          name: "bidder_",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "price_",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "tax_",
          type: "uint256",
        },
      ],
      name: "newBid",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      name: "nextBoardAuctionId",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "operator",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "tokenId",
          type: "uint256",
        },
      ],
      name: "ownerOf",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "from_",
          type: "address",
        },
        {
          internalType: "address",
          name: "to_",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "tokenId_",
          type: "uint256",
        },
      ],
      name: "safeTransferByOperator",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "from",
          type: "address",
        },
        {
          internalType: "address",
          name: "to",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "tokenId",
          type: "uint256",
        },
      ],
      name: "safeTransferFrom",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "from",
          type: "address",
        },
        {
          internalType: "address",
          name: "to",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "tokenId",
          type: "uint256",
        },
        {
          internalType: "bytes",
          name: "data",
          type: "bytes",
        },
      ],
      name: "safeTransferFrom",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "operator",
          type: "address",
        },
        {
          internalType: "bool",
          name: "approved",
          type: "bool",
        },
      ],
      name: "setApprovalForAll",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "tokenId_",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "auctionId_",
          type: "uint256",
        },
        {
          internalType: "uint64",
          name: "leaseStartAt_",
          type: "uint64",
        },
        {
          internalType: "uint64",
          name: "leaseEndAt_",
          type: "uint64",
        },
      ],
      name: "setAuctionLease",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "tokenId_",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "auctionId_",
          type: "uint256",
        },
        {
          internalType: "address",
          name: "bidder_",
          type: "address",
        },
        {
          internalType: "bool",
          name: "isWithdrawn_",
          type: "bool",
        },
      ],
      name: "setBidWithdrawn",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "tokenId_",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "auctionId_",
          type: "uint256",
        },
        {
          internalType: "address",
          name: "bidder_",
          type: "address",
        },
        {
          internalType: "bool",
          name: "isWon_",
          type: "bool",
        },
      ],
      name: "setBidWon",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "tokenId_",
          type: "uint256",
        },
        {
          internalType: "string",
          name: "contentURI_",
          type: "string",
        },
      ],
      name: "setBoardContentURI",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "tokenId_",
          type: "uint256",
        },
        {
          internalType: "string",
          name: "description_",
          type: "string",
        },
      ],
      name: "setBoardDescription",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "tokenId_",
          type: "uint256",
        },
        {
          internalType: "string",
          name: "location_",
          type: "string",
        },
      ],
      name: "setBoardLocation",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "tokenId_",
          type: "uint256",
        },
        {
          internalType: "string",
          name: "name_",
          type: "string",
        },
      ],
      name: "setBoardName",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "tokenId_",
          type: "uint256",
        },
        {
          internalType: "string",
          name: "redirectURI_",
          type: "string",
        },
      ],
      name: "setBoardRedirectURI",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "operator_",
          type: "address",
        },
      ],
      name: "setOperator",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "taxRate_",
          type: "uint256",
        },
      ],
      name: "setTaxRate",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "owner_",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "accumulated_",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "withdrawn_",
          type: "uint256",
        },
      ],
      name: "setTaxTreasury",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes4",
          name: "interfaceId",
          type: "bytes4",
        },
      ],
      name: "supportsInterface",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "symbol",
      outputs: [
        {
          internalType: "string",
          name: "",
          type: "string",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "taxRate",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      name: "taxTreasury",
      outputs: [
        {
          internalType: "uint256",
          name: "accumulated",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "withdrawn",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "token",
      outputs: [
        {
          internalType: "contract IERC20",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "tokenId_",
          type: "uint256",
        },
      ],
      name: "tokenURI",
      outputs: [
        {
          internalType: "string",
          name: "uri",
          type: "string",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "to_",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "amount_",
          type: "uint256",
        },
      ],
      name: "transferAmount",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "from_",
          type: "address",
        },
        {
          internalType: "address",
          name: "to_",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "tokenId_",
          type: "uint256",
        },
      ],
      name: "transferFrom",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      stateMutability: "payable",
      type: "receive",
    },
  ] as const;
  
  export const distributionAbi = [
    {
      inputs: [
        {
          internalType: "address",
          name: "token_",
          type: "address",
        },
        {
          internalType: "address",
          name: "admin_",
          type: "address",
        },
      ],
      stateMutability: "nonpayable",
      type: "constructor",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "prevAccount_",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "account_",
          type: "address",
        },
      ],
      name: "AdminChanged",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "string",
          name: "cid_",
          type: "string",
        },
        {
          indexed: true,
          internalType: "address",
          name: "account_",
          type: "address",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "amount_",
          type: "uint256",
        },
      ],
      name: "Claim",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "string",
          name: "treeId_",
          type: "string",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "amount_",
          type: "uint256",
        },
      ],
      name: "Drop",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "previousOwner",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "newOwner",
          type: "address",
        },
      ],
      name: "OwnershipTransferred",
      type: "event",
    },
    {
      inputs: [],
      name: "admin",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "string",
          name: "",
          type: "string",
        },
      ],
      name: "balances",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "share_",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "totalAmount_",
          type: "uint256",
        },
      ],
      name: "calculateAmount",
      outputs: [
        {
          internalType: "uint256",
          name: "amount",
          type: "uint256",
        },
      ],
      stateMutability: "pure",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "string",
          name: "treeId_",
          type: "string",
        },
        {
          internalType: "string",
          name: "cid_",
          type: "string",
        },
        {
          internalType: "address",
          name: "account_",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "share_",
          type: "uint256",
        },
        {
          internalType: "bytes32[]",
          name: "merkleProof_",
          type: "bytes32[]",
        },
      ],
      name: "claim",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "string",
          name: "treeId_",
          type: "string",
        },
        {
          internalType: "bytes32",
          name: "merkleRoot_",
          type: "bytes32",
        },
        {
          internalType: "uint256",
          name: "amount_",
          type: "uint256",
        },
      ],
      name: "drop",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "string",
          name: "",
          type: "string",
        },
        {
          internalType: "string",
          name: "",
          type: "string",
        },
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      name: "hasClaimed",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "string",
          name: "",
          type: "string",
        },
      ],
      name: "merkleRoots",
      outputs: [
        {
          internalType: "bytes32",
          name: "",
          type: "bytes32",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "owner",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "renounceOwnership",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "account_",
          type: "address",
        },
      ],
      name: "setAdmin",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "string",
          name: "treeId_",
          type: "string",
        },
        {
          internalType: "address",
          name: "target_",
          type: "address",
        },
      ],
      name: "sweep",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "token",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "string",
          name: "",
          type: "string",
        },
      ],
      name: "totalAmounts",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "newOwner",
          type: "address",
        },
      ],
      name: "transferOwnership",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
  ] as const;
  