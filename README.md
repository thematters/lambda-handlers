# lambda handlers

Multiple lambda packaged in one docker image, and to create multiple lambda handlers:

## Lambda functions

feat(lambda): multiple lambda handlers in one repo

- [x] indexer-meilisearch
- [x] check-motor-badge
- [x] sendmail
- [ ] ipns-listener
- [x] user-retention

## Dependencies

use docker image for lambda, instead of zip packages:

- share lib code for multiple lambda in one place;
- handle dependencies better (ipfs-http-client, opencc, etc);
- can use latest node-v18 & typescript together, (many other tools have failed)

## Development

### Setup

- Pull submodule:  `git submodule update --init`
- Install deps: `npm install .`


### Format & Lint & Test

- Run format: `npm run format`
- Run lint: `npm run lint`
- Run test cases: `npm run test`

## Deployment

merge to `main` will trigger build docker image and publish to ECR registry, with version like:

    <account>.dkr.ecr.ap-southeast-1.amazonaws.com/lambda-handlers-image:v0.1.0

Tips: at development phase, can also manually run `docker build -t {above-full-image}:v{date-tag} .`,
do a login `docker login --username AWS --password-stdin <account>.dkr.ecr.ap-southeast-1.amazonaws.com` first,
and push it with `docker image push {above-full-image}:v{date-tag}`, test it with manually update lambda function image;

### Create new lambda worker:

1. create handler entry code in `./handlers/<new-lambda>.ts`, export the handler;
2. create a one liner entry code at top level, like:
   export \* from "./handlers/<new-lambda>.js";
   ( this part might be able to automated later; )
3. create a PR and after merged, the CI will build and publish to ECR register:
   `<acount>.dkr.ecr.ap-southeast-1.amazonaws.com/lambda-handlers-image:v<new-version>`
4. from AWS Lambda Console, create the lambda function from docker image, use above full `image_uri`,
   fill the handler CMD as `<new-lambda>.handler`;
5. in AWS Lambda Console, configure s3 or sns or sqs trigger,
   - or for cron job, use EventBridge can generate events at given cron rules;

Can test trigger from the AWS Lambda Console

### Add manual auto deploy in Github Action:

after first time manually create the Lambda function, all later updates can be done in Action CI:
add proper `deploy-<new-lambda>-dev` `deploy-<new-lambda>-prod` jobs in `.github/workflows/deploy.yml`,
the `deploy-<new-lambda>-dev` will be automatically updating the function after each PR merge,
and `deploy-<new-lambda>-prod` will need a manual approval to be deploying.
