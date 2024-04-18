import postgres from 'postgres'
import knex from 'knex'
import { knexSnakeCaseMappers } from 'objection'

const baseApplicationName = `${process.env.AWS_LAMBDA_FUNCTION_NAME}/${process.env.AWS_LAMBDA_FUNCTION_VERSION}`

export const getKnexClient = (connectionString: string) =>
  knex({
    client: 'pg',
    // TBD: handler connectionString having query-string
    connection:
      connectionString + `?application_name=${baseApplicationName + '/knex'}`,
    pool: { min: 0, max: 2 },

    // searchPath: ["knex", "public"],
    ...knexSnakeCaseMappers(),
  })

export const getPostgresJsClient = (connectionString: string) =>
  postgres(connectionString, {
    // idle_timeout: 300 for 5min, // auto end when idl'ing, use PGIDLE_TIMEOUT
    // connect_timeout: 10,
    // idle_timeout: 20,
    // max_lifetime: 60 * 30,

    transform: {
      undefined: null,
      ...postgres.toCamel,
    },

    // types: { bigint: postgres.BigInt, },
    debug(connection, query, params, types) {
      console.log(`debug: query --:\n${query}\n`, {
        connection,
        params,
        types,
      })
    },
    connection: {
      application_name: baseApplicationName + '/postgres-js',
      // application_name: `${process.env.npm_package_name}/${process.env.npm_package_version}`
      // statement_timeout: 10e3,
      // connect_timeout: 10e3,
    },
  })
