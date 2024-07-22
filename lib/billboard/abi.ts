export const billboardAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: 'currency_',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'registry_',
        type: 'address',
        internalType: 'address payable',
      },
      {
        name: 'admin_',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'name_',
        type: 'string',
        internalType: 'string',
      },
      {
        name: 'symbol_',
        type: 'string',
        internalType: 'string',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: '_tokenURI',
    inputs: [
      {
        name: 'tokenId_',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'uri',
        type: 'string',
        internalType: 'string',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'admin',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'calculateTax',
    inputs: [
      {
        name: 'tokenId_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'amount_',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'tax',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'clearAuction',
    inputs: [
      {
        name: 'tokenId_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'epoch_',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'highestBidder',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'price',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'tax',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'clearAuctions',
    inputs: [
      {
        name: 'tokenIds_',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
      {
        name: 'epochs_',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
    ],
    outputs: [
      {
        name: 'highestBidders',
        type: 'address[]',
        internalType: 'address[]',
      },
      {
        name: 'prices',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
      {
        name: 'taxes',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'closed',
    inputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getBid',
    inputs: [
      {
        name: 'tokenId_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'epoch_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'bidder_',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: 'bid',
        type: 'tuple',
        internalType: 'struct IBillboardRegistry.Bid',
        components: [
          {
            name: 'price',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'tax',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'contentURI',
            type: 'string',
            internalType: 'string',
          },
          {
            name: 'redirectURI',
            type: 'string',
            internalType: 'string',
          },
          {
            name: 'placedAt',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'updatedAt',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'isWon',
            type: 'bool',
            internalType: 'bool',
          },
          {
            name: 'isWithdrawn',
            type: 'bool',
            internalType: 'bool',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getBids',
    inputs: [
      {
        name: 'tokenId_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'epoch_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'limit_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'offset_',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'total',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'limit',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'offset',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'bids',
        type: 'tuple[]',
        internalType: 'struct IBillboardRegistry.Bid[]',
        components: [
          {
            name: 'price',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'tax',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'contentURI',
            type: 'string',
            internalType: 'string',
          },
          {
            name: 'redirectURI',
            type: 'string',
            internalType: 'string',
          },
          {
            name: 'placedAt',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'updatedAt',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'isWon',
            type: 'bool',
            internalType: 'bool',
          },
          {
            name: 'isWithdrawn',
            type: 'bool',
            internalType: 'bool',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getBlockFromEpoch',
    inputs: [
      {
        name: 'startedAt_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'epoch_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'epochInterval_',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'blockNumber',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    name: 'getBoard',
    inputs: [
      {
        name: 'tokenId_',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'board',
        type: 'tuple',
        internalType: 'struct IBillboardRegistry.Board',
        components: [
          {
            name: 'creator',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'taxRate',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'epochInterval',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'startedAt',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'name',
            type: 'string',
            internalType: 'string',
          },
          {
            name: 'description',
            type: 'string',
            internalType: 'string',
          },
          {
            name: 'imageURI',
            type: 'string',
            internalType: 'string',
          },
          {
            name: 'location',
            type: 'string',
            internalType: 'string',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getEpochFromBlock',
    inputs: [
      {
        name: 'startedAt_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'block_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'epochInterval_',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'epoch',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    name: 'getTaxRate',
    inputs: [
      {
        name: 'tokenId_',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'taxRate',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'mintBoard',
    inputs: [
      {
        name: 'taxRate_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'epochInterval_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'startedAt_',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'tokenId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'mintBoard',
    inputs: [
      {
        name: 'taxRate_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'epochInterval_',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'tokenId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'placeBid',
    inputs: [
      {
        name: 'tokenId_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'epoch_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'price_',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'placeBid',
    inputs: [
      {
        name: 'tokenId_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'epoch_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'price_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'contentURI_',
        type: 'string',
        internalType: 'string',
      },
      {
        name: 'redirectURI_',
        type: 'string',
        internalType: 'string',
      },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'registry',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'contract BillboardRegistry',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'setBidURIs',
    inputs: [
      {
        name: 'tokenId_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'epoch_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'contentURI_',
        type: 'string',
        internalType: 'string',
      },
      {
        name: 'redirectURI_',
        type: 'string',
        internalType: 'string',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setBoard',
    inputs: [
      {
        name: 'tokenId_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'name_',
        type: 'string',
        internalType: 'string',
      },
      {
        name: 'description_',
        type: 'string',
        internalType: 'string',
      },
      {
        name: 'imageURI_',
        type: 'string',
        internalType: 'string',
      },
      {
        name: 'location_',
        type: 'string',
        internalType: 'string',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setClosed',
    inputs: [
      {
        name: 'tokenId_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'closed_',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setRegistryOperator',
    inputs: [
      {
        name: 'operator_',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setWhitelist',
    inputs: [
      {
        name: 'tokenId_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'account_',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'whitelisted',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'whitelist',
    inputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'withdrawBid',
    inputs: [
      {
        name: 'tokenId_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'epoch_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'bidder_',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'withdrawTax',
    inputs: [
      {
        name: 'creator_',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: 'tax',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
  },
] as const

export const billboardRegistryAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: 'currency_',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'operator_',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'name_',
        type: 'string',
        internalType: 'string',
      },
      {
        name: 'symbol_',
        type: 'string',
        internalType: 'string',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'receive',
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'approve',
    inputs: [
      {
        name: 'to',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'tokenId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [
      {
        name: 'owner',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'bidders',
    inputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'bids',
    inputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: 'price',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'tax',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'contentURI',
        type: 'string',
        internalType: 'string',
      },
      {
        name: 'redirectURI',
        type: 'string',
        internalType: 'string',
      },
      {
        name: 'placedAt',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'updatedAt',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'isWon',
        type: 'bool',
        internalType: 'bool',
      },
      {
        name: 'isWithdrawn',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'boards',
    inputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'creator',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'taxRate',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'epochInterval',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'startedAt',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'name',
        type: 'string',
        internalType: 'string',
      },
      {
        name: 'description',
        type: 'string',
        internalType: 'string',
      },
      {
        name: 'imageURI',
        type: 'string',
        internalType: 'string',
      },
      {
        name: 'location',
        type: 'string',
        internalType: 'string',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'currency',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'contract IERC20',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'emitAuctionCleared',
    inputs: [
      {
        name: 'tokenId_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'epoch_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'highestBidder_',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'emitTaxWithdrawn',
    inputs: [
      {
        name: 'owner_',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'amount_',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'exists',
    inputs: [
      {
        name: 'tokenId_',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getApproved',
    inputs: [
      {
        name: 'tokenId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getBid',
    inputs: [
      {
        name: 'tokenId_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'auctionId_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'bidder_',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: 'bid',
        type: 'tuple',
        internalType: 'struct IBillboardRegistry.Bid',
        components: [
          {
            name: 'price',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'tax',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'contentURI',
            type: 'string',
            internalType: 'string',
          },
          {
            name: 'redirectURI',
            type: 'string',
            internalType: 'string',
          },
          {
            name: 'placedAt',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'updatedAt',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'isWon',
            type: 'bool',
            internalType: 'bool',
          },
          {
            name: 'isWithdrawn',
            type: 'bool',
            internalType: 'bool',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getBidCount',
    inputs: [
      {
        name: 'tokenId_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'epoch_',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'count',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getBoard',
    inputs: [
      {
        name: 'tokenId_',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'board',
        type: 'tuple',
        internalType: 'struct IBillboardRegistry.Board',
        components: [
          {
            name: 'creator',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'taxRate',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'epochInterval',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'startedAt',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'name',
            type: 'string',
            internalType: 'string',
          },
          {
            name: 'description',
            type: 'string',
            internalType: 'string',
          },
          {
            name: 'imageURI',
            type: 'string',
            internalType: 'string',
          },
          {
            name: 'location',
            type: 'string',
            internalType: 'string',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'highestBidder',
    inputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isApprovedForAll',
    inputs: [
      {
        name: 'owner',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'operator',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'lastTokenId',
    inputs: [],
    outputs: [
      {
        name: '_value',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'name',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'string',
        internalType: 'string',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'newBid',
    inputs: [
      {
        name: 'tokenId_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'epoch_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'bidder_',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'price_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'tax_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'contentURI_',
        type: 'string',
        internalType: 'string',
      },
      {
        name: 'redirectURI_',
        type: 'string',
        internalType: 'string',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'newBoard',
    inputs: [
      {
        name: 'to_',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'taxRate_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'epochInterval_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'startedAt_',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'tokenId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'operator',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'ownerOf',
    inputs: [
      {
        name: 'tokenId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'safeTransferByOperator',
    inputs: [
      {
        name: 'from_',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'to_',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'tokenId_',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'safeTransferFrom',
    inputs: [
      {
        name: 'from',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'to',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'tokenId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'safeTransferFrom',
    inputs: [
      {
        name: 'from',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'to',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'tokenId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'data',
        type: 'bytes',
        internalType: 'bytes',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setApprovalForAll',
    inputs: [
      {
        name: 'operator',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'approved',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setBid',
    inputs: [
      {
        name: 'tokenId_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'epoch_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'bidder_',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'price_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'tax_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'contentURI_',
        type: 'string',
        internalType: 'string',
      },
      {
        name: 'redirectURI_',
        type: 'string',
        internalType: 'string',
      },
      {
        name: 'hasURIs',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setBidURIs',
    inputs: [
      {
        name: 'tokenId_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'epoch_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'bidder_',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'contentURI_',
        type: 'string',
        internalType: 'string',
      },
      {
        name: 'redirectURI_',
        type: 'string',
        internalType: 'string',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setBidWithdrawn',
    inputs: [
      {
        name: 'tokenId_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'epoch_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'bidder_',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'isWithdrawn_',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setBidWon',
    inputs: [
      {
        name: 'tokenId_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'epoch_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'bidder_',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'isWon_',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setBoard',
    inputs: [
      {
        name: 'tokenId_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'name_',
        type: 'string',
        internalType: 'string',
      },
      {
        name: 'description_',
        type: 'string',
        internalType: 'string',
      },
      {
        name: 'imageURI_',
        type: 'string',
        internalType: 'string',
      },
      {
        name: 'location_',
        type: 'string',
        internalType: 'string',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setOperator',
    inputs: [
      {
        name: 'operator_',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setTaxTreasury',
    inputs: [
      {
        name: 'owner_',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'accumulated_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'withdrawn_',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'supportsInterface',
    inputs: [
      {
        name: 'interfaceId',
        type: 'bytes4',
        internalType: 'bytes4',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'symbol',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'string',
        internalType: 'string',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'taxTreasury',
    inputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: 'accumulated',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'withdrawn',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'tokenURI',
    inputs: [
      {
        name: 'tokenId_',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'uri',
        type: 'string',
        internalType: 'string',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'transferCurrencyByOperator',
    inputs: [
      {
        name: 'to_',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'amount_',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'transferFrom',
    inputs: [
      {
        name: 'from_',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'to_',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'tokenId_',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'Approval',
    inputs: [
      {
        name: 'owner',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'approved',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'tokenId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'ApprovalForAll',
    inputs: [
      {
        name: 'owner',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'operator',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'approved',
        type: 'bool',
        indexed: false,
        internalType: 'bool',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'AuctionCleared',
    inputs: [
      {
        name: 'tokenId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'epoch',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'highestBidder',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'BidUpdated',
    inputs: [
      {
        name: 'tokenId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'epoch',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'bidder',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'price',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'tax',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'contentURI',
        type: 'string',
        indexed: false,
        internalType: 'string',
      },
      {
        name: 'redirectURI',
        type: 'string',
        indexed: false,
        internalType: 'string',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'BidWithdrawn',
    inputs: [
      {
        name: 'tokenId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'epoch',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'bidder',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'BidWon',
    inputs: [
      {
        name: 'tokenId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'epoch',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'bidder',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'BoardCreated',
    inputs: [
      {
        name: 'tokenId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'to',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'taxRate',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'epochInterval',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'BoardUpdated',
    inputs: [
      {
        name: 'tokenId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'name',
        type: 'string',
        indexed: false,
        internalType: 'string',
      },
      {
        name: 'description',
        type: 'string',
        indexed: false,
        internalType: 'string',
      },
      {
        name: 'imageURI',
        type: 'string',
        indexed: false,
        internalType: 'string',
      },
      {
        name: 'location',
        type: 'string',
        indexed: false,
        internalType: 'string',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'OperatorUpdated',
    inputs: [
      {
        name: 'operator',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'TaxWithdrawn',
    inputs: [
      {
        name: 'owner',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      {
        name: 'from',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'to',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'tokenId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
] as const

export const distributionAbi = [
  {
    inputs: [
      {
        internalType: 'address',
        name: 'token_',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'admin_',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'prevAccount_',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'account_',
        type: 'address',
      },
    ],
    name: 'AdminChanged',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'string',
        name: 'cid_',
        type: 'string',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'account_',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount_',
        type: 'uint256',
      },
    ],
    name: 'Claim',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'string',
        name: 'treeId_',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount_',
        type: 'uint256',
      },
    ],
    name: 'Drop',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'previousOwner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'OwnershipTransferred',
    type: 'event',
  },
  {
    inputs: [],
    name: 'admin',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    name: 'balances',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'share_',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'totalAmount_',
        type: 'uint256',
      },
    ],
    name: 'calculateAmount',
    outputs: [
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'treeId_',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'cid_',
        type: 'string',
      },
      {
        internalType: 'address',
        name: 'account_',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'share_',
        type: 'uint256',
      },
      {
        internalType: 'bytes32[]',
        name: 'merkleProof_',
        type: 'bytes32[]',
      },
    ],
    name: 'claim',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'treeId_',
        type: 'string',
      },
      {
        internalType: 'bytes32',
        name: 'merkleRoot_',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'amount_',
        type: 'uint256',
      },
    ],
    name: 'drop',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'hasClaimed',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    name: 'merkleRoots',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account_',
        type: 'address',
      },
    ],
    name: 'setAdmin',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'treeId_',
        type: 'string',
      },
      {
        internalType: 'address',
        name: 'target_',
        type: 'address',
      },
    ],
    name: 'sweep',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'token',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    name: 'totalAmounts',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const
