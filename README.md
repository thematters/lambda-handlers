
Multiple lambda packaged in one docker image, and to create multiple lambda handlers:

## Lambda functions
feat(lambda): multiple lambda handlers in one repo 

- [x] indexer-meilisearch
- [x] check-motor-badge
- [ ] ipns-listener

## Dependencies
use docker image for lambda, instead of zip packages:
- share lib code for multiple lambda in one place;
- handle dependencies better (ipfs-http-client, opencc, etc);
- can use latest node-v18 & typescript together, (many other tools have failed)
