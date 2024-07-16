# lambda handlers

Multiple lambda packaged in one docker image, and to create multiple lambda handlers:

## Lambda functions

feat(lambda): multiple lambda handlers in one repo

- [x] refresh-search-index (include search_index.{article,user,tag})
- [x] check-motor-badge
- [x] sendmail
- [ ] ipns-listener
- [x] user-retention
- [x] likecoin
- [x] cloudflare-image-stats-alert (not using docker, copy the source code to lambda to deploy)
- [x] sync-ga4-data
- [x] archive-user
- [x] daily-summary-email
- [x] notification

## Dependencies

use docker image for lambda, instead of zip packages:

- share lib code for multiple lambda in one place;
- handle dependencies better (ipfs-http-client, opencc, etc);
- can use latest node-v18 & typescript together, (many other tools have failed)

## Development

### Setup

- Pull submodule:  `git submodule update --init`
- Install deps: `npm install . && npm run prepare`


### Format & Lint & Test

- Run format: `npm run format`
- Run lint: `npm run lint`
- Run test cases: `npm run test`

## Deployment

merge to `main` will trigger build docker image and publish to ECR registry, with version like:

    <account>.dkr.ecr.ap-southeast-1.amazonaws.com/lambda-handlers-image:v0.1.0

Tips: at development phase, can also manually run `docker build -t {above-full-image}:v{date-tag} .`,
do a login `aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.ap-southeast-1.amazonaws.com` first,
and push it with `docker image push {above-full-image}:v{date-tag}`, test it with manually update lambda function image;

### Create new lambda worker:

1. create handler entry code in `./handlers/<new-lambda>.ts`, export the handler;
2. create a PR and after merged, the CI will build and publish to ECR registry:
   `<account>.dkr.ecr.ap-southeast-1.amazonaws.com/lambda-handlers-image:v<new-version>`
3. from AWS Lambda Console, create the lambda function from docker image, use above full `image_uri`,
   fill the handler CMD as `<new-lambda>.handler`;
4. in AWS Lambda Console, configure s3 or sns or sqs trigger,
   - or for cron job, use EventBridge can generate events at given cron rules;

Can test trigger from the AWS Lambda Console

You can also deploy lambdas and related AWS resources by Cloudformation, see deployment/ folder.

### Add manual auto deploy in Github Action:

after first time manually create the Lambda function, all later updates can be done in Action CI:
add proper `deploy-<new-lambda>-dev` `deploy-<new-lambda>-prod` jobs in `.github/workflows/deploy.yml`,
the `deploy-<new-lambda>-dev` will be automatically updating the function after each PR merge,
and `deploy-<new-lambda>-prod` will need a manual approval to be deploying.
