FROM public.ecr.aws/lambda/nodejs:18 as builder
RUN yum update -y && \
    yum groupinstall "Development Tools" -y && \
    yum install python3 -y

WORKDIR /usr/app
COPY package*.json ./
RUN npm install
COPY ./lib ./lib
COPY ./bin ./bin
COPY ./handlers ./handlers
COPY ./tsconfig.json ./
RUN node --loader ts-node/esm ./bin/gen-handlers-entry.ts
COPY ./tsconfig.json ./*.ts ./
RUN npm run build

FROM public.ecr.aws/lambda/nodejs:18 as runtime
RUN yum update -y && \
    yum groupinstall "Development Tools" -y && \
    yum install python3 -y

WORKDIR /usr/app
COPY package*.json ./
RUN npm ci --omit=dev

## the actual run image
FROM public.ecr.aws/lambda/nodejs:18
RUN yum update -y && \
    yum install postgresql -y

ENV NODE_OPTIONS="--trace-warnings"

WORKDIR ${LAMBDA_TASK_ROOT}
## for ESM module at run-time
COPY package.json ./
COPY ./sql/ ./sql/
COPY --from=runtime /usr/app/node_modules/ ./node_modules/
COPY --from=builder /usr/app/dist/ ./

CMD ["indexer.handler"]
