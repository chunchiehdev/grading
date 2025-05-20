
/**
 * Client
 */

import * as runtime from '@prisma/client/runtime/library'
import * as process from 'node:process'
import * as path from 'node:path'
    import { fileURLToPath } from 'node:url'

    const __dirname = path.dirname(fileURLToPath(import.meta.url))


export type PrismaPromise<T> = runtime.Types.Public.PrismaPromise<T>


/**
 * Model User
 * 
 */
export type User = runtime.Types.Result.DefaultSelection<Prisma.$UserPayload>
/**
 * Model GradingTask
 * 
 */
export type GradingTask = runtime.Types.Result.DefaultSelection<Prisma.$GradingTaskPayload>
/**
 * Model Rubric
 * 
 */
export type Rubric = runtime.Types.Result.DefaultSelection<Prisma.$RubricPayload>
/**
 * Model RubricCriteria
 * 
 */
export type RubricCriteria = runtime.Types.Result.DefaultSelection<Prisma.$RubricCriteriaPayload>



/**
 * Create the Client
 */
const config: runtime.GetPrismaClientConfig = {
  "generator": {
    "name": "client",
    "provider": {
      "fromEnvVar": null,
      "value": "prisma-client"
    },
    "output": {
      "value": "/home/chunc/workspace/grading/app/generated/prisma/client",
      "fromEnvVar": null
    },
    "config": {
      "engineType": "library"
    },
    "binaryTargets": [
      {
        "fromEnvVar": null,
        "value": "debian-openssl-3.0.x",
        "native": true
      },
      {
        "fromEnvVar": null,
        "value": "linux-musl-openssl-3.0.x"
      }
    ],
    "previewFeatures": [],
    "sourceFilePath": "/home/chunc/workspace/grading/prisma/schema.prisma",
    "isCustomOutput": true
  },
  "relativePath": "../../../../prisma",
  "clientVersion": "6.6.0",
  "engineVersion": "f676762280b54cd07c770017ed3711ddde35f37a",
  "datasourceNames": [
    "db"
  ],
  "activeProvider": "postgresql",
  "postinstall": true,
  "inlineDatasources": {
    "db": {
      "url": {
        "fromEnvVar": "DATABASE_URL",
        "value": null
      }
    }
  },
  "inlineSchema": "generator client {\n  provider      = \"prisma-client\"\n  output        = \"../app/generated/prisma/client\"\n  binaryTargets = [\"native\", \"linux-musl-openssl-3.0.x\"]\n}\n\ndatasource db {\n  provider = \"postgresql\"\n  url      = env(\"DATABASE_URL\")\n}\n\nmodel User {\n  id           String        @id @default(uuid())\n  email        String        @unique\n  password     String\n  createdAt    DateTime      @default(now())\n  updatedAt    DateTime      @updatedAt\n  gradingTasks GradingTask[]\n\n  @@map(\"users\")\n}\n\nmodel GradingTask {\n  id          String    @id @default(uuid())\n  authorId    String\n  author      User      @relation(fields: [authorId], references: [id])\n  courseId    String?\n  status      String    @default(\"created\")\n  createdAt   DateTime  @default(now())\n  updatedAt   DateTime  @updatedAt\n  completedAt DateTime?\n  score       Int?\n  feedback    Json?\n  metadata    Json?\n\n  @@index([authorId])\n  @@index([status])\n  @@map(\"grading_tasks\")\n}\n\nmodel Rubric {\n  id          String           @id @default(uuid())\n  name        String\n  description String\n  createdAt   DateTime         @default(now())\n  updatedAt   DateTime         @updatedAt\n  criteria    RubricCriteria[]\n\n  @@map(\"rubrics\")\n}\n\nmodel RubricCriteria {\n  id          String @id @default(uuid())\n  name        String\n  description String\n  levels      Json // 存储评分等级 [{score: number, description: string}]\n  rubricId    String\n  rubric      Rubric @relation(fields: [rubricId], references: [id], onDelete: Cascade)\n\n  @@map(\"rubric_criteria\")\n}\n",
  "inlineSchemaHash": "2034a39d66d34ab8b9b96352f6cfd6d712ce1e5e47c9830b515f6c9ae9c3a58b",
  "copyEngine": true,
  "runtimeDataModel": {
    "models": {},
    "enums": {},
    "types": {}
  },
  "dirname": ""
}
config.dirname = __dirname

config.runtimeDataModel = JSON.parse("{\"models\":{\"User\":{\"dbName\":\"users\",\"schema\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"nativeType\":null,\"default\":{\"name\":\"uuid\",\"args\":[4]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"email\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"password\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"nativeType\":null,\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"gradingTasks\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"GradingTask\",\"nativeType\":null,\"relationName\":\"GradingTaskToUser\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"GradingTask\":{\"dbName\":\"grading_tasks\",\"schema\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"nativeType\":null,\"default\":{\"name\":\"uuid\",\"args\":[4]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"authorId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"author\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"User\",\"nativeType\":null,\"relationName\":\"GradingTaskToUser\",\"relationFromFields\":[\"authorId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"courseId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"status\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"nativeType\":null,\"default\":\"created\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"nativeType\":null,\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"completedAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"score\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"feedback\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Json\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"metadata\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Json\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"Rubric\":{\"dbName\":\"rubrics\",\"schema\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"nativeType\":null,\"default\":{\"name\":\"uuid\",\"args\":[4]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"description\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"nativeType\":null,\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"criteria\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"RubricCriteria\",\"nativeType\":null,\"relationName\":\"RubricToRubricCriteria\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"RubricCriteria\":{\"dbName\":\"rubric_criteria\",\"schema\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"nativeType\":null,\"default\":{\"name\":\"uuid\",\"args\":[4]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"description\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"levels\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Json\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"rubricId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"rubric\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Rubric\",\"nativeType\":null,\"relationName\":\"RubricToRubricCriteria\",\"relationFromFields\":[\"rubricId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false}},\"enums\":{},\"types\":{}}")
config.engineWasm = undefined
config.compilerWasm = undefined



// file annotations for bundling tools to include these files
path.join(__dirname, "libquery_engine-debian-openssl-3.0.x.so.node")
path.join(process.cwd(), "app/generated/prisma/client/libquery_engine-debian-openssl-3.0.x.so.node")

// file annotations for bundling tools to include these files
path.join(__dirname, "libquery_engine-linux-musl-openssl-3.0.x.so.node")
path.join(process.cwd(), "app/generated/prisma/client/libquery_engine-linux-musl-openssl-3.0.x.so.node")
// file annotations for bundling tools to include these files
path.join(__dirname, "schema.prisma")
path.join(process.cwd(), "app/generated/prisma/client/schema.prisma")


interface PrismaClientConstructor {
    /**
   * ## Prisma Client
   *
   * Type-safe database client for TypeScript
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Users
   * const users = await prisma.user.findMany()
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */
  new <
    ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
    U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
    ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs
  >(options?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>): PrismaClient<ClientOptions, U, ExtArgs>
}

/**
 * ## Prisma Client
 *
 * Type-safe database client for TypeScript
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Users
 * const users = await prisma.user.findMany()
 * ```
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export interface PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): runtime.Types.Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): runtime.Types.Utils.JsPromise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): runtime.Types.Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => runtime.Types.Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): runtime.Types.Utils.JsPromise<R>


  $extends: runtime.Types.Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, runtime.Types.Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.user`: Exposes CRUD operations for the **User** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.user.findMany()
    * ```
    */
  get user(): Prisma.UserDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.gradingTask`: Exposes CRUD operations for the **GradingTask** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more GradingTasks
    * const gradingTasks = await prisma.gradingTask.findMany()
    * ```
    */
  get gradingTask(): Prisma.GradingTaskDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.rubric`: Exposes CRUD operations for the **Rubric** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Rubrics
    * const rubrics = await prisma.rubric.findMany()
    * ```
    */
  get rubric(): Prisma.RubricDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.rubricCriteria`: Exposes CRUD operations for the **RubricCriteria** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more RubricCriteria
    * const rubricCriteria = await prisma.rubricCriteria.findMany()
    * ```
    */
  get rubricCriteria(): Prisma.RubricCriteriaDelegate<ExtArgs, ClientOptions>;
}

export const PrismaClient = runtime.getPrismaClient(config) as unknown as PrismaClientConstructor

export namespace Prisma {
  export type DMMF = typeof runtime.DMMF

  export type PrismaPromise<T> = runtime.Types.Public.PrismaPromise<T>

  /**
   * Validator
   */
  export const validator = runtime.Public.validator

  /**
   * Prisma Errors
   */

  export const PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export type PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError

  export const PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export type PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError

  export const PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export type PrismaClientRustPanicError = runtime.PrismaClientRustPanicError

  export const PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export type PrismaClientInitializationError = runtime.PrismaClientInitializationError

  export const PrismaClientValidationError = runtime.PrismaClientValidationError
  export type PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export const sql = runtime.sqltag
  export const empty = runtime.empty
  export const join = runtime.join
  export const raw = runtime.raw
  export const Sql = runtime.Sql
  export type Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export const Decimal = runtime.Decimal
  export type Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export type Extension = runtime.Types.Extensions.UserArgs
  export const getExtensionContext = runtime.Extensions.getExtensionContext
  export type Args<T, F extends runtime.Operation> = runtime.Types.Public.Args<T, F>
  export type Payload<T, F extends runtime.Operation = never> = runtime.Types.Public.Payload<T, F>
  export type Result<T, A, F extends runtime.Operation> = runtime.Types.Public.Result<T, A, F>
  export type Exact<A, W> = runtime.Types.Public.Exact<A, W>

  export type PrismaVersion = {
    client: string
    engine: string
  }

  /**
   * Prisma Client JS version: 6.6.0
   * Query Engine version: f676762280b54cd07c770017ed3711ddde35f37a
   */
  export const prismaVersion: PrismaVersion = {
    client: "6.6.0",
    engine: "f676762280b54cd07c770017ed3711ddde35f37a"
  }

  /**
   * Utility Types
   */


  export type JsonObject = runtime.JsonObject
  export type JsonArray = runtime.JsonArray
  export type JsonValue = runtime.JsonValue
  export type InputJsonObject = runtime.InputJsonObject
  export type InputJsonArray = runtime.InputJsonArray
  export type InputJsonValue = runtime.InputJsonValue

  export const NullTypes = {
    DbNull: runtime.objectEnumValues.classes.DbNull as (new (secret: never) => typeof runtime.objectEnumValues.instances.DbNull),
    JsonNull: runtime.objectEnumValues.classes.JsonNull as (new (secret: never) => typeof runtime.objectEnumValues.instances.JsonNull),
    AnyNull: runtime.objectEnumValues.classes.AnyNull as (new (secret: never) => typeof runtime.objectEnumValues.instances.AnyNull),
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull = runtime.objectEnumValues.instances.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull = runtime.objectEnumValues.instances.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull = runtime.objectEnumValues.instances.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };

  export type Enumerable<T> = T | Array<T>;

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  export type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  export type Boolean = True | False

  export type True = 1

  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName = {
    User: 'User',
    GradingTask: 'GradingTask',
    Rubric: 'Rubric',
    RubricCriteria: 'RubricCriteria'
  } as const

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  export interface TypeMapCb<ClientOptions = {}> extends runtime.Types.Utils.Fn<{extArgs: runtime.Types.Extensions.InternalArgs }, runtime.Types.Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "user" | "gradingTask" | "rubric" | "rubricCriteria"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      User: {
        payload: Prisma.$UserPayload<ExtArgs>
        fields: Prisma.UserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserFindUniqueArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findFirst: {
            args: Prisma.UserFindFirstArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findMany: {
            args: Prisma.UserFindManyArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          create: {
            args: Prisma.UserCreateArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UserPayload>
          }
          createMany: {
            args: Prisma.UserCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserCreateManyAndReturnArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          delete: {
            args: Prisma.UserDeleteArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UserPayload>
          }
          update: {
            args: Prisma.UserUpdateArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UserPayload>
          }
          deleteMany: {
            args: Prisma.UserDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UserUpdateManyAndReturnArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          upsert: {
            args: Prisma.UserUpsertArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UserPayload>
          }
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<AggregateUser>
          }
          groupBy: {
            args: Prisma.UserGroupByArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserCountArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<UserCountAggregateOutputType> | number
          }
        }
      }
      GradingTask: {
        payload: Prisma.$GradingTaskPayload<ExtArgs>
        fields: Prisma.GradingTaskFieldRefs
        operations: {
          findUnique: {
            args: Prisma.GradingTaskFindUniqueArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$GradingTaskPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.GradingTaskFindUniqueOrThrowArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$GradingTaskPayload>
          }
          findFirst: {
            args: Prisma.GradingTaskFindFirstArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$GradingTaskPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.GradingTaskFindFirstOrThrowArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$GradingTaskPayload>
          }
          findMany: {
            args: Prisma.GradingTaskFindManyArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$GradingTaskPayload>[]
          }
          create: {
            args: Prisma.GradingTaskCreateArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$GradingTaskPayload>
          }
          createMany: {
            args: Prisma.GradingTaskCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.GradingTaskCreateManyAndReturnArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$GradingTaskPayload>[]
          }
          delete: {
            args: Prisma.GradingTaskDeleteArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$GradingTaskPayload>
          }
          update: {
            args: Prisma.GradingTaskUpdateArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$GradingTaskPayload>
          }
          deleteMany: {
            args: Prisma.GradingTaskDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.GradingTaskUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.GradingTaskUpdateManyAndReturnArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$GradingTaskPayload>[]
          }
          upsert: {
            args: Prisma.GradingTaskUpsertArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$GradingTaskPayload>
          }
          aggregate: {
            args: Prisma.GradingTaskAggregateArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<AggregateGradingTask>
          }
          groupBy: {
            args: Prisma.GradingTaskGroupByArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<GradingTaskGroupByOutputType>[]
          }
          count: {
            args: Prisma.GradingTaskCountArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<GradingTaskCountAggregateOutputType> | number
          }
        }
      }
      Rubric: {
        payload: Prisma.$RubricPayload<ExtArgs>
        fields: Prisma.RubricFieldRefs
        operations: {
          findUnique: {
            args: Prisma.RubricFindUniqueArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$RubricPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.RubricFindUniqueOrThrowArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$RubricPayload>
          }
          findFirst: {
            args: Prisma.RubricFindFirstArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$RubricPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.RubricFindFirstOrThrowArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$RubricPayload>
          }
          findMany: {
            args: Prisma.RubricFindManyArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$RubricPayload>[]
          }
          create: {
            args: Prisma.RubricCreateArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$RubricPayload>
          }
          createMany: {
            args: Prisma.RubricCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.RubricCreateManyAndReturnArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$RubricPayload>[]
          }
          delete: {
            args: Prisma.RubricDeleteArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$RubricPayload>
          }
          update: {
            args: Prisma.RubricUpdateArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$RubricPayload>
          }
          deleteMany: {
            args: Prisma.RubricDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.RubricUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.RubricUpdateManyAndReturnArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$RubricPayload>[]
          }
          upsert: {
            args: Prisma.RubricUpsertArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$RubricPayload>
          }
          aggregate: {
            args: Prisma.RubricAggregateArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<AggregateRubric>
          }
          groupBy: {
            args: Prisma.RubricGroupByArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<RubricGroupByOutputType>[]
          }
          count: {
            args: Prisma.RubricCountArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<RubricCountAggregateOutputType> | number
          }
        }
      }
      RubricCriteria: {
        payload: Prisma.$RubricCriteriaPayload<ExtArgs>
        fields: Prisma.RubricCriteriaFieldRefs
        operations: {
          findUnique: {
            args: Prisma.RubricCriteriaFindUniqueArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$RubricCriteriaPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.RubricCriteriaFindUniqueOrThrowArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$RubricCriteriaPayload>
          }
          findFirst: {
            args: Prisma.RubricCriteriaFindFirstArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$RubricCriteriaPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.RubricCriteriaFindFirstOrThrowArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$RubricCriteriaPayload>
          }
          findMany: {
            args: Prisma.RubricCriteriaFindManyArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$RubricCriteriaPayload>[]
          }
          create: {
            args: Prisma.RubricCriteriaCreateArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$RubricCriteriaPayload>
          }
          createMany: {
            args: Prisma.RubricCriteriaCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.RubricCriteriaCreateManyAndReturnArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$RubricCriteriaPayload>[]
          }
          delete: {
            args: Prisma.RubricCriteriaDeleteArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$RubricCriteriaPayload>
          }
          update: {
            args: Prisma.RubricCriteriaUpdateArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$RubricCriteriaPayload>
          }
          deleteMany: {
            args: Prisma.RubricCriteriaDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.RubricCriteriaUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.RubricCriteriaUpdateManyAndReturnArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$RubricCriteriaPayload>[]
          }
          upsert: {
            args: Prisma.RubricCriteriaUpsertArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$RubricCriteriaPayload>
          }
          aggregate: {
            args: Prisma.RubricCriteriaAggregateArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<AggregateRubricCriteria>
          }
          groupBy: {
            args: Prisma.RubricCriteriaGroupByArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<RubricCriteriaGroupByOutputType>[]
          }
          count: {
            args: Prisma.RubricCriteriaCountArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<RubricCriteriaCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension = runtime.Extensions.defineExtension as unknown as runtime.Types.Extensions.ExtendsHook<"define", Prisma.TypeMapCb, runtime.Types.Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events
     * log: [
     *   { emit: 'stdout', level: 'query' },
     *   { emit: 'stdout', level: 'info' },
     *   { emit: 'stdout', level: 'warn' }
     *   { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    user?: UserOmit
    gradingTask?: GradingTaskOmit
    rubric?: RubricOmit
    rubricCriteria?: RubricCriteriaOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition ? T['emit'] extends 'event' ? T['level'] : never : never
  export type GetEvents<T extends any> = T extends Array<LogLevel | LogDefinition> ?
    GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
    : never

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName
    action: PrismaAction
    args: any
    dataPath: string[]
    runInTransaction: boolean
  }

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => runtime.Types.Utils.JsPromise<T>,
  ) => runtime.Types.Utils.JsPromise<T>

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type UserCountOutputType
   */

  export type UserCountOutputType = {
    gradingTasks: number
  }

  export type UserCountOutputTypeSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    gradingTasks?: boolean | UserCountOutputTypeCountGradingTasksArgs
  }

  // Custom InputTypes
  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCountOutputType
     */
    select?: UserCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountGradingTasksArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: GradingTaskWhereInput
  }


  /**
   * Count Type RubricCountOutputType
   */

  export type RubricCountOutputType = {
    criteria: number
  }

  export type RubricCountOutputTypeSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    criteria?: boolean | RubricCountOutputTypeCountCriteriaArgs
  }

  // Custom InputTypes
  /**
   * RubricCountOutputType without action
   */
  export type RubricCountOutputTypeDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RubricCountOutputType
     */
    select?: RubricCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * RubricCountOutputType without action
   */
  export type RubricCountOutputTypeCountCriteriaArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: RubricCriteriaWhereInput
  }


  /**
   * Models
   */

  /**
   * Model User
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  export type UserMinAggregateOutputType = {
    id: string | null
    email: string | null
    password: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserMaxAggregateOutputType = {
    id: string | null
    email: string | null
    password: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserCountAggregateOutputType = {
    id: number
    email: number
    password: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type UserMinAggregateInputType = {
    id?: true
    email?: true
    password?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserMaxAggregateInputType = {
    id?: true
    email?: true
    password?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserCountAggregateInputType = {
    id?: true
    email?: true
    password?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type UserAggregateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which User to aggregate.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Users
    **/
    _count?: true | UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserMaxAggregateInputType
  }

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
        [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>
  }




  export type UserGroupByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: UserWhereInput
    orderBy?: UserOrderByWithAggregationInput | UserOrderByWithAggregationInput[]
    by: UserScalarFieldEnum[] | UserScalarFieldEnum
    having?: UserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCountAggregateInputType | true
    _min?: UserMinAggregateInputType
    _max?: UserMaxAggregateInputType
  }

  export type UserGroupByOutputType = {
    id: string
    email: string
    password: string
    createdAt: Date
    updatedAt: Date
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserGroupByOutputType[P]>
            : GetScalarType<T[P], UserGroupByOutputType[P]>
        }
      >
    >


  export type UserSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    password?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    gradingTasks?: boolean | User$gradingTasksArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>

  export type UserSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    password?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    password?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectScalar = {
    id?: boolean
    email?: boolean
    password?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type UserOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "email" | "password" | "createdAt" | "updatedAt", ExtArgs["result"]["user"]>
  export type UserInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    gradingTasks?: boolean | User$gradingTasksArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type UserIncludeCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {}
  export type UserIncludeUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {}

  export type $UserPayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "User"
    objects: {
      gradingTasks: Prisma.$GradingTaskPayload<ExtArgs>[]
    }
    scalars: runtime.Types.Extensions.GetPayloadResult<{
      id: string
      email: string
      password: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["user"]>
    composites: {}
  }

  export type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = runtime.Types.Result.GetResult<Prisma.$UserPayload, S>

  export type UserCountArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> =
    Omit<UserFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UserCountAggregateInputType | true
    }

  export interface UserDelegate<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['User'], meta: { name: 'User' } }
    /**
     * Find zero or one User that matches the filter.
     * @param {UserFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserFindUniqueArgs>(args: SelectSubset<T, UserFindUniqueArgs<ExtArgs>>): Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one User that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UserFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs>(args: SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserFindFirstArgs>(args?: SelectSubset<T, UserFindFirstArgs<ExtArgs>>): Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs>(args?: SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userWithIdOnly = await prisma.user.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UserFindManyArgs>(args?: SelectSubset<T, UserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a User.
     * @param {UserCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     * 
     */
    create<T extends UserCreateArgs>(args: SelectSubset<T, UserCreateArgs<ExtArgs>>): Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Users.
     * @param {UserCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserCreateManyArgs>(args?: SelectSubset<T, UserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Users and returns the data saved in the database.
     * @param {UserCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Users and only return the `id`
     * const userWithIdOnly = await prisma.user.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserCreateManyAndReturnArgs>(args?: SelectSubset<T, UserCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a User.
     * @param {UserDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     * 
     */
    delete<T extends UserDeleteArgs>(args: SelectSubset<T, UserDeleteArgs<ExtArgs>>): Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one User.
     * @param {UserUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserUpdateArgs>(args: SelectSubset<T, UserUpdateArgs<ExtArgs>>): Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Users.
     * @param {UserDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserDeleteManyArgs>(args?: SelectSubset<T, UserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserUpdateManyArgs>(args: SelectSubset<T, UserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users and returns the data updated in the database.
     * @param {UserUpdateManyAndReturnArgs} args - Arguments to update many Users.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Users and only return the `id`
     * const userWithIdOnly = await prisma.user.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UserUpdateManyAndReturnArgs>(args: SelectSubset<T, UserUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one User.
     * @param {UserUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
     */
    upsert<T extends UserUpsertArgs>(args: SelectSubset<T, UserUpsertArgs<ExtArgs>>): Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends UserCountArgs>(
      args?: Subset<T, UserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends runtime.Types.Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserAggregateArgs>(args: Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserGroupByArgs['orderBy'] }
        : { orderBy?: UserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the User model
   */
  readonly fields: UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserClient<T, Null = never, ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    gradingTasks<T extends User$gradingTasksArgs<ExtArgs> = {}>(args?: Subset<T, User$gradingTasksArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$GradingTaskPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): runtime.Types.Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): runtime.Types.Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): runtime.Types.Utils.JsPromise<T>
  }




  /**
   * Fields of the User model
   */
  export interface UserFieldRefs {
    readonly id: FieldRef<"User", 'String'>
    readonly email: FieldRef<"User", 'String'>
    readonly password: FieldRef<"User", 'String'>
    readonly createdAt: FieldRef<"User", 'DateTime'>
    readonly updatedAt: FieldRef<"User", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * User findUnique
   */
  export type UserFindUniqueArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findUniqueOrThrow
   */
  export type UserFindUniqueOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findFirst
   */
  export type UserFindFirstArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findFirstOrThrow
   */
  export type UserFindFirstOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findMany
   */
  export type UserFindManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which Users to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User create
   */
  export type UserCreateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to create a User.
     */
    data: XOR<UserCreateInput, UserUncheckedCreateInput>
  }

  /**
   * User createMany
   */
  export type UserCreateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User createManyAndReturn
   */
  export type UserCreateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User update
   */
  export type UserUpdateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to update a User.
     */
    data: XOR<UserUpdateInput, UserUncheckedUpdateInput>
    /**
     * Choose, which User to update.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User updateMany
   */
  export type UserUpdateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User updateManyAndReturn
   */
  export type UserUpdateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User upsert
   */
  export type UserUpsertArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The filter to search for the User to update in case it exists.
     */
    where: UserWhereUniqueInput
    /**
     * In case the User found by the `where` argument doesn't exist, create a new User with this data.
     */
    create: XOR<UserCreateInput, UserUncheckedCreateInput>
    /**
     * In case the User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserUpdateInput, UserUncheckedUpdateInput>
  }

  /**
   * User delete
   */
  export type UserDeleteArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter which User to delete.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User deleteMany
   */
  export type UserDeleteManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which Users to delete
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to delete.
     */
    limit?: number
  }

  /**
   * User.gradingTasks
   */
  export type User$gradingTasksArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingTask
     */
    select?: GradingTaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GradingTask
     */
    omit?: GradingTaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingTaskInclude<ExtArgs> | null
    where?: GradingTaskWhereInput
    orderBy?: GradingTaskOrderByWithRelationInput | GradingTaskOrderByWithRelationInput[]
    cursor?: GradingTaskWhereUniqueInput
    take?: number
    skip?: number
    distinct?: GradingTaskScalarFieldEnum | GradingTaskScalarFieldEnum[]
  }

  /**
   * User without action
   */
  export type UserDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
  }


  /**
   * Model GradingTask
   */

  export type AggregateGradingTask = {
    _count: GradingTaskCountAggregateOutputType | null
    _avg: GradingTaskAvgAggregateOutputType | null
    _sum: GradingTaskSumAggregateOutputType | null
    _min: GradingTaskMinAggregateOutputType | null
    _max: GradingTaskMaxAggregateOutputType | null
  }

  export type GradingTaskAvgAggregateOutputType = {
    score: number | null
  }

  export type GradingTaskSumAggregateOutputType = {
    score: number | null
  }

  export type GradingTaskMinAggregateOutputType = {
    id: string | null
    authorId: string | null
    courseId: string | null
    status: string | null
    createdAt: Date | null
    updatedAt: Date | null
    completedAt: Date | null
    score: number | null
  }

  export type GradingTaskMaxAggregateOutputType = {
    id: string | null
    authorId: string | null
    courseId: string | null
    status: string | null
    createdAt: Date | null
    updatedAt: Date | null
    completedAt: Date | null
    score: number | null
  }

  export type GradingTaskCountAggregateOutputType = {
    id: number
    authorId: number
    courseId: number
    status: number
    createdAt: number
    updatedAt: number
    completedAt: number
    score: number
    feedback: number
    metadata: number
    _all: number
  }


  export type GradingTaskAvgAggregateInputType = {
    score?: true
  }

  export type GradingTaskSumAggregateInputType = {
    score?: true
  }

  export type GradingTaskMinAggregateInputType = {
    id?: true
    authorId?: true
    courseId?: true
    status?: true
    createdAt?: true
    updatedAt?: true
    completedAt?: true
    score?: true
  }

  export type GradingTaskMaxAggregateInputType = {
    id?: true
    authorId?: true
    courseId?: true
    status?: true
    createdAt?: true
    updatedAt?: true
    completedAt?: true
    score?: true
  }

  export type GradingTaskCountAggregateInputType = {
    id?: true
    authorId?: true
    courseId?: true
    status?: true
    createdAt?: true
    updatedAt?: true
    completedAt?: true
    score?: true
    feedback?: true
    metadata?: true
    _all?: true
  }

  export type GradingTaskAggregateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which GradingTask to aggregate.
     */
    where?: GradingTaskWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GradingTasks to fetch.
     */
    orderBy?: GradingTaskOrderByWithRelationInput | GradingTaskOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: GradingTaskWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GradingTasks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GradingTasks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned GradingTasks
    **/
    _count?: true | GradingTaskCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: GradingTaskAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: GradingTaskSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: GradingTaskMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: GradingTaskMaxAggregateInputType
  }

  export type GetGradingTaskAggregateType<T extends GradingTaskAggregateArgs> = {
        [P in keyof T & keyof AggregateGradingTask]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateGradingTask[P]>
      : GetScalarType<T[P], AggregateGradingTask[P]>
  }




  export type GradingTaskGroupByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: GradingTaskWhereInput
    orderBy?: GradingTaskOrderByWithAggregationInput | GradingTaskOrderByWithAggregationInput[]
    by: GradingTaskScalarFieldEnum[] | GradingTaskScalarFieldEnum
    having?: GradingTaskScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: GradingTaskCountAggregateInputType | true
    _avg?: GradingTaskAvgAggregateInputType
    _sum?: GradingTaskSumAggregateInputType
    _min?: GradingTaskMinAggregateInputType
    _max?: GradingTaskMaxAggregateInputType
  }

  export type GradingTaskGroupByOutputType = {
    id: string
    authorId: string
    courseId: string | null
    status: string
    createdAt: Date
    updatedAt: Date
    completedAt: Date | null
    score: number | null
    feedback: JsonValue | null
    metadata: JsonValue | null
    _count: GradingTaskCountAggregateOutputType | null
    _avg: GradingTaskAvgAggregateOutputType | null
    _sum: GradingTaskSumAggregateOutputType | null
    _min: GradingTaskMinAggregateOutputType | null
    _max: GradingTaskMaxAggregateOutputType | null
  }

  type GetGradingTaskGroupByPayload<T extends GradingTaskGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<GradingTaskGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof GradingTaskGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], GradingTaskGroupByOutputType[P]>
            : GetScalarType<T[P], GradingTaskGroupByOutputType[P]>
        }
      >
    >


  export type GradingTaskSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    authorId?: boolean
    courseId?: boolean
    status?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    completedAt?: boolean
    score?: boolean
    feedback?: boolean
    metadata?: boolean
    author?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["gradingTask"]>

  export type GradingTaskSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    authorId?: boolean
    courseId?: boolean
    status?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    completedAt?: boolean
    score?: boolean
    feedback?: boolean
    metadata?: boolean
    author?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["gradingTask"]>

  export type GradingTaskSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    authorId?: boolean
    courseId?: boolean
    status?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    completedAt?: boolean
    score?: boolean
    feedback?: boolean
    metadata?: boolean
    author?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["gradingTask"]>

  export type GradingTaskSelectScalar = {
    id?: boolean
    authorId?: boolean
    courseId?: boolean
    status?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    completedAt?: boolean
    score?: boolean
    feedback?: boolean
    metadata?: boolean
  }

  export type GradingTaskOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "authorId" | "courseId" | "status" | "createdAt" | "updatedAt" | "completedAt" | "score" | "feedback" | "metadata", ExtArgs["result"]["gradingTask"]>
  export type GradingTaskInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    author?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type GradingTaskIncludeCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    author?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type GradingTaskIncludeUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    author?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $GradingTaskPayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "GradingTask"
    objects: {
      author: Prisma.$UserPayload<ExtArgs>
    }
    scalars: runtime.Types.Extensions.GetPayloadResult<{
      id: string
      authorId: string
      courseId: string | null
      status: string
      createdAt: Date
      updatedAt: Date
      completedAt: Date | null
      score: number | null
      feedback: Prisma.JsonValue | null
      metadata: Prisma.JsonValue | null
    }, ExtArgs["result"]["gradingTask"]>
    composites: {}
  }

  export type GradingTaskGetPayload<S extends boolean | null | undefined | GradingTaskDefaultArgs> = runtime.Types.Result.GetResult<Prisma.$GradingTaskPayload, S>

  export type GradingTaskCountArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> =
    Omit<GradingTaskFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: GradingTaskCountAggregateInputType | true
    }

  export interface GradingTaskDelegate<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['GradingTask'], meta: { name: 'GradingTask' } }
    /**
     * Find zero or one GradingTask that matches the filter.
     * @param {GradingTaskFindUniqueArgs} args - Arguments to find a GradingTask
     * @example
     * // Get one GradingTask
     * const gradingTask = await prisma.gradingTask.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends GradingTaskFindUniqueArgs>(args: SelectSubset<T, GradingTaskFindUniqueArgs<ExtArgs>>): Prisma__GradingTaskClient<runtime.Types.Result.GetResult<Prisma.$GradingTaskPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one GradingTask that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {GradingTaskFindUniqueOrThrowArgs} args - Arguments to find a GradingTask
     * @example
     * // Get one GradingTask
     * const gradingTask = await prisma.gradingTask.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends GradingTaskFindUniqueOrThrowArgs>(args: SelectSubset<T, GradingTaskFindUniqueOrThrowArgs<ExtArgs>>): Prisma__GradingTaskClient<runtime.Types.Result.GetResult<Prisma.$GradingTaskPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first GradingTask that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GradingTaskFindFirstArgs} args - Arguments to find a GradingTask
     * @example
     * // Get one GradingTask
     * const gradingTask = await prisma.gradingTask.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends GradingTaskFindFirstArgs>(args?: SelectSubset<T, GradingTaskFindFirstArgs<ExtArgs>>): Prisma__GradingTaskClient<runtime.Types.Result.GetResult<Prisma.$GradingTaskPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first GradingTask that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GradingTaskFindFirstOrThrowArgs} args - Arguments to find a GradingTask
     * @example
     * // Get one GradingTask
     * const gradingTask = await prisma.gradingTask.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends GradingTaskFindFirstOrThrowArgs>(args?: SelectSubset<T, GradingTaskFindFirstOrThrowArgs<ExtArgs>>): Prisma__GradingTaskClient<runtime.Types.Result.GetResult<Prisma.$GradingTaskPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more GradingTasks that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GradingTaskFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all GradingTasks
     * const gradingTasks = await prisma.gradingTask.findMany()
     * 
     * // Get first 10 GradingTasks
     * const gradingTasks = await prisma.gradingTask.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const gradingTaskWithIdOnly = await prisma.gradingTask.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends GradingTaskFindManyArgs>(args?: SelectSubset<T, GradingTaskFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$GradingTaskPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a GradingTask.
     * @param {GradingTaskCreateArgs} args - Arguments to create a GradingTask.
     * @example
     * // Create one GradingTask
     * const GradingTask = await prisma.gradingTask.create({
     *   data: {
     *     // ... data to create a GradingTask
     *   }
     * })
     * 
     */
    create<T extends GradingTaskCreateArgs>(args: SelectSubset<T, GradingTaskCreateArgs<ExtArgs>>): Prisma__GradingTaskClient<runtime.Types.Result.GetResult<Prisma.$GradingTaskPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many GradingTasks.
     * @param {GradingTaskCreateManyArgs} args - Arguments to create many GradingTasks.
     * @example
     * // Create many GradingTasks
     * const gradingTask = await prisma.gradingTask.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends GradingTaskCreateManyArgs>(args?: SelectSubset<T, GradingTaskCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many GradingTasks and returns the data saved in the database.
     * @param {GradingTaskCreateManyAndReturnArgs} args - Arguments to create many GradingTasks.
     * @example
     * // Create many GradingTasks
     * const gradingTask = await prisma.gradingTask.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many GradingTasks and only return the `id`
     * const gradingTaskWithIdOnly = await prisma.gradingTask.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends GradingTaskCreateManyAndReturnArgs>(args?: SelectSubset<T, GradingTaskCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$GradingTaskPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a GradingTask.
     * @param {GradingTaskDeleteArgs} args - Arguments to delete one GradingTask.
     * @example
     * // Delete one GradingTask
     * const GradingTask = await prisma.gradingTask.delete({
     *   where: {
     *     // ... filter to delete one GradingTask
     *   }
     * })
     * 
     */
    delete<T extends GradingTaskDeleteArgs>(args: SelectSubset<T, GradingTaskDeleteArgs<ExtArgs>>): Prisma__GradingTaskClient<runtime.Types.Result.GetResult<Prisma.$GradingTaskPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one GradingTask.
     * @param {GradingTaskUpdateArgs} args - Arguments to update one GradingTask.
     * @example
     * // Update one GradingTask
     * const gradingTask = await prisma.gradingTask.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends GradingTaskUpdateArgs>(args: SelectSubset<T, GradingTaskUpdateArgs<ExtArgs>>): Prisma__GradingTaskClient<runtime.Types.Result.GetResult<Prisma.$GradingTaskPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more GradingTasks.
     * @param {GradingTaskDeleteManyArgs} args - Arguments to filter GradingTasks to delete.
     * @example
     * // Delete a few GradingTasks
     * const { count } = await prisma.gradingTask.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends GradingTaskDeleteManyArgs>(args?: SelectSubset<T, GradingTaskDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more GradingTasks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GradingTaskUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many GradingTasks
     * const gradingTask = await prisma.gradingTask.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends GradingTaskUpdateManyArgs>(args: SelectSubset<T, GradingTaskUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more GradingTasks and returns the data updated in the database.
     * @param {GradingTaskUpdateManyAndReturnArgs} args - Arguments to update many GradingTasks.
     * @example
     * // Update many GradingTasks
     * const gradingTask = await prisma.gradingTask.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more GradingTasks and only return the `id`
     * const gradingTaskWithIdOnly = await prisma.gradingTask.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends GradingTaskUpdateManyAndReturnArgs>(args: SelectSubset<T, GradingTaskUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$GradingTaskPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one GradingTask.
     * @param {GradingTaskUpsertArgs} args - Arguments to update or create a GradingTask.
     * @example
     * // Update or create a GradingTask
     * const gradingTask = await prisma.gradingTask.upsert({
     *   create: {
     *     // ... data to create a GradingTask
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the GradingTask we want to update
     *   }
     * })
     */
    upsert<T extends GradingTaskUpsertArgs>(args: SelectSubset<T, GradingTaskUpsertArgs<ExtArgs>>): Prisma__GradingTaskClient<runtime.Types.Result.GetResult<Prisma.$GradingTaskPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of GradingTasks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GradingTaskCountArgs} args - Arguments to filter GradingTasks to count.
     * @example
     * // Count the number of GradingTasks
     * const count = await prisma.gradingTask.count({
     *   where: {
     *     // ... the filter for the GradingTasks we want to count
     *   }
     * })
    **/
    count<T extends GradingTaskCountArgs>(
      args?: Subset<T, GradingTaskCountArgs>,
    ): Prisma.PrismaPromise<
      T extends runtime.Types.Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], GradingTaskCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a GradingTask.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GradingTaskAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends GradingTaskAggregateArgs>(args: Subset<T, GradingTaskAggregateArgs>): Prisma.PrismaPromise<GetGradingTaskAggregateType<T>>

    /**
     * Group by GradingTask.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GradingTaskGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends GradingTaskGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: GradingTaskGroupByArgs['orderBy'] }
        : { orderBy?: GradingTaskGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, GradingTaskGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetGradingTaskGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the GradingTask model
   */
  readonly fields: GradingTaskFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for GradingTask.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__GradingTaskClient<T, Null = never, ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    author<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): runtime.Types.Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): runtime.Types.Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): runtime.Types.Utils.JsPromise<T>
  }




  /**
   * Fields of the GradingTask model
   */
  export interface GradingTaskFieldRefs {
    readonly id: FieldRef<"GradingTask", 'String'>
    readonly authorId: FieldRef<"GradingTask", 'String'>
    readonly courseId: FieldRef<"GradingTask", 'String'>
    readonly status: FieldRef<"GradingTask", 'String'>
    readonly createdAt: FieldRef<"GradingTask", 'DateTime'>
    readonly updatedAt: FieldRef<"GradingTask", 'DateTime'>
    readonly completedAt: FieldRef<"GradingTask", 'DateTime'>
    readonly score: FieldRef<"GradingTask", 'Int'>
    readonly feedback: FieldRef<"GradingTask", 'Json'>
    readonly metadata: FieldRef<"GradingTask", 'Json'>
  }
    

  // Custom InputTypes
  /**
   * GradingTask findUnique
   */
  export type GradingTaskFindUniqueArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingTask
     */
    select?: GradingTaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GradingTask
     */
    omit?: GradingTaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingTaskInclude<ExtArgs> | null
    /**
     * Filter, which GradingTask to fetch.
     */
    where: GradingTaskWhereUniqueInput
  }

  /**
   * GradingTask findUniqueOrThrow
   */
  export type GradingTaskFindUniqueOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingTask
     */
    select?: GradingTaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GradingTask
     */
    omit?: GradingTaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingTaskInclude<ExtArgs> | null
    /**
     * Filter, which GradingTask to fetch.
     */
    where: GradingTaskWhereUniqueInput
  }

  /**
   * GradingTask findFirst
   */
  export type GradingTaskFindFirstArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingTask
     */
    select?: GradingTaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GradingTask
     */
    omit?: GradingTaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingTaskInclude<ExtArgs> | null
    /**
     * Filter, which GradingTask to fetch.
     */
    where?: GradingTaskWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GradingTasks to fetch.
     */
    orderBy?: GradingTaskOrderByWithRelationInput | GradingTaskOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for GradingTasks.
     */
    cursor?: GradingTaskWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GradingTasks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GradingTasks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of GradingTasks.
     */
    distinct?: GradingTaskScalarFieldEnum | GradingTaskScalarFieldEnum[]
  }

  /**
   * GradingTask findFirstOrThrow
   */
  export type GradingTaskFindFirstOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingTask
     */
    select?: GradingTaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GradingTask
     */
    omit?: GradingTaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingTaskInclude<ExtArgs> | null
    /**
     * Filter, which GradingTask to fetch.
     */
    where?: GradingTaskWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GradingTasks to fetch.
     */
    orderBy?: GradingTaskOrderByWithRelationInput | GradingTaskOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for GradingTasks.
     */
    cursor?: GradingTaskWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GradingTasks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GradingTasks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of GradingTasks.
     */
    distinct?: GradingTaskScalarFieldEnum | GradingTaskScalarFieldEnum[]
  }

  /**
   * GradingTask findMany
   */
  export type GradingTaskFindManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingTask
     */
    select?: GradingTaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GradingTask
     */
    omit?: GradingTaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingTaskInclude<ExtArgs> | null
    /**
     * Filter, which GradingTasks to fetch.
     */
    where?: GradingTaskWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GradingTasks to fetch.
     */
    orderBy?: GradingTaskOrderByWithRelationInput | GradingTaskOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing GradingTasks.
     */
    cursor?: GradingTaskWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GradingTasks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GradingTasks.
     */
    skip?: number
    distinct?: GradingTaskScalarFieldEnum | GradingTaskScalarFieldEnum[]
  }

  /**
   * GradingTask create
   */
  export type GradingTaskCreateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingTask
     */
    select?: GradingTaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GradingTask
     */
    omit?: GradingTaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingTaskInclude<ExtArgs> | null
    /**
     * The data needed to create a GradingTask.
     */
    data: XOR<GradingTaskCreateInput, GradingTaskUncheckedCreateInput>
  }

  /**
   * GradingTask createMany
   */
  export type GradingTaskCreateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to create many GradingTasks.
     */
    data: GradingTaskCreateManyInput | GradingTaskCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * GradingTask createManyAndReturn
   */
  export type GradingTaskCreateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingTask
     */
    select?: GradingTaskSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the GradingTask
     */
    omit?: GradingTaskOmit<ExtArgs> | null
    /**
     * The data used to create many GradingTasks.
     */
    data: GradingTaskCreateManyInput | GradingTaskCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingTaskIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * GradingTask update
   */
  export type GradingTaskUpdateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingTask
     */
    select?: GradingTaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GradingTask
     */
    omit?: GradingTaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingTaskInclude<ExtArgs> | null
    /**
     * The data needed to update a GradingTask.
     */
    data: XOR<GradingTaskUpdateInput, GradingTaskUncheckedUpdateInput>
    /**
     * Choose, which GradingTask to update.
     */
    where: GradingTaskWhereUniqueInput
  }

  /**
   * GradingTask updateMany
   */
  export type GradingTaskUpdateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to update GradingTasks.
     */
    data: XOR<GradingTaskUpdateManyMutationInput, GradingTaskUncheckedUpdateManyInput>
    /**
     * Filter which GradingTasks to update
     */
    where?: GradingTaskWhereInput
    /**
     * Limit how many GradingTasks to update.
     */
    limit?: number
  }

  /**
   * GradingTask updateManyAndReturn
   */
  export type GradingTaskUpdateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingTask
     */
    select?: GradingTaskSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the GradingTask
     */
    omit?: GradingTaskOmit<ExtArgs> | null
    /**
     * The data used to update GradingTasks.
     */
    data: XOR<GradingTaskUpdateManyMutationInput, GradingTaskUncheckedUpdateManyInput>
    /**
     * Filter which GradingTasks to update
     */
    where?: GradingTaskWhereInput
    /**
     * Limit how many GradingTasks to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingTaskIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * GradingTask upsert
   */
  export type GradingTaskUpsertArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingTask
     */
    select?: GradingTaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GradingTask
     */
    omit?: GradingTaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingTaskInclude<ExtArgs> | null
    /**
     * The filter to search for the GradingTask to update in case it exists.
     */
    where: GradingTaskWhereUniqueInput
    /**
     * In case the GradingTask found by the `where` argument doesn't exist, create a new GradingTask with this data.
     */
    create: XOR<GradingTaskCreateInput, GradingTaskUncheckedCreateInput>
    /**
     * In case the GradingTask was found with the provided `where` argument, update it with this data.
     */
    update: XOR<GradingTaskUpdateInput, GradingTaskUncheckedUpdateInput>
  }

  /**
   * GradingTask delete
   */
  export type GradingTaskDeleteArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingTask
     */
    select?: GradingTaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GradingTask
     */
    omit?: GradingTaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingTaskInclude<ExtArgs> | null
    /**
     * Filter which GradingTask to delete.
     */
    where: GradingTaskWhereUniqueInput
  }

  /**
   * GradingTask deleteMany
   */
  export type GradingTaskDeleteManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which GradingTasks to delete
     */
    where?: GradingTaskWhereInput
    /**
     * Limit how many GradingTasks to delete.
     */
    limit?: number
  }

  /**
   * GradingTask without action
   */
  export type GradingTaskDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingTask
     */
    select?: GradingTaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GradingTask
     */
    omit?: GradingTaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingTaskInclude<ExtArgs> | null
  }


  /**
   * Model Rubric
   */

  export type AggregateRubric = {
    _count: RubricCountAggregateOutputType | null
    _min: RubricMinAggregateOutputType | null
    _max: RubricMaxAggregateOutputType | null
  }

  export type RubricMinAggregateOutputType = {
    id: string | null
    name: string | null
    description: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type RubricMaxAggregateOutputType = {
    id: string | null
    name: string | null
    description: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type RubricCountAggregateOutputType = {
    id: number
    name: number
    description: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type RubricMinAggregateInputType = {
    id?: true
    name?: true
    description?: true
    createdAt?: true
    updatedAt?: true
  }

  export type RubricMaxAggregateInputType = {
    id?: true
    name?: true
    description?: true
    createdAt?: true
    updatedAt?: true
  }

  export type RubricCountAggregateInputType = {
    id?: true
    name?: true
    description?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type RubricAggregateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which Rubric to aggregate.
     */
    where?: RubricWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Rubrics to fetch.
     */
    orderBy?: RubricOrderByWithRelationInput | RubricOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: RubricWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Rubrics from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Rubrics.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Rubrics
    **/
    _count?: true | RubricCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: RubricMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: RubricMaxAggregateInputType
  }

  export type GetRubricAggregateType<T extends RubricAggregateArgs> = {
        [P in keyof T & keyof AggregateRubric]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateRubric[P]>
      : GetScalarType<T[P], AggregateRubric[P]>
  }




  export type RubricGroupByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: RubricWhereInput
    orderBy?: RubricOrderByWithAggregationInput | RubricOrderByWithAggregationInput[]
    by: RubricScalarFieldEnum[] | RubricScalarFieldEnum
    having?: RubricScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: RubricCountAggregateInputType | true
    _min?: RubricMinAggregateInputType
    _max?: RubricMaxAggregateInputType
  }

  export type RubricGroupByOutputType = {
    id: string
    name: string
    description: string
    createdAt: Date
    updatedAt: Date
    _count: RubricCountAggregateOutputType | null
    _min: RubricMinAggregateOutputType | null
    _max: RubricMaxAggregateOutputType | null
  }

  type GetRubricGroupByPayload<T extends RubricGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<RubricGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof RubricGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], RubricGroupByOutputType[P]>
            : GetScalarType<T[P], RubricGroupByOutputType[P]>
        }
      >
    >


  export type RubricSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    description?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    criteria?: boolean | Rubric$criteriaArgs<ExtArgs>
    _count?: boolean | RubricCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["rubric"]>

  export type RubricSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    description?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["rubric"]>

  export type RubricSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    description?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["rubric"]>

  export type RubricSelectScalar = {
    id?: boolean
    name?: boolean
    description?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type RubricOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "name" | "description" | "createdAt" | "updatedAt", ExtArgs["result"]["rubric"]>
  export type RubricInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    criteria?: boolean | Rubric$criteriaArgs<ExtArgs>
    _count?: boolean | RubricCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type RubricIncludeCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {}
  export type RubricIncludeUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {}

  export type $RubricPayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "Rubric"
    objects: {
      criteria: Prisma.$RubricCriteriaPayload<ExtArgs>[]
    }
    scalars: runtime.Types.Extensions.GetPayloadResult<{
      id: string
      name: string
      description: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["rubric"]>
    composites: {}
  }

  export type RubricGetPayload<S extends boolean | null | undefined | RubricDefaultArgs> = runtime.Types.Result.GetResult<Prisma.$RubricPayload, S>

  export type RubricCountArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> =
    Omit<RubricFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: RubricCountAggregateInputType | true
    }

  export interface RubricDelegate<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Rubric'], meta: { name: 'Rubric' } }
    /**
     * Find zero or one Rubric that matches the filter.
     * @param {RubricFindUniqueArgs} args - Arguments to find a Rubric
     * @example
     * // Get one Rubric
     * const rubric = await prisma.rubric.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends RubricFindUniqueArgs>(args: SelectSubset<T, RubricFindUniqueArgs<ExtArgs>>): Prisma__RubricClient<runtime.Types.Result.GetResult<Prisma.$RubricPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Rubric that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {RubricFindUniqueOrThrowArgs} args - Arguments to find a Rubric
     * @example
     * // Get one Rubric
     * const rubric = await prisma.rubric.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends RubricFindUniqueOrThrowArgs>(args: SelectSubset<T, RubricFindUniqueOrThrowArgs<ExtArgs>>): Prisma__RubricClient<runtime.Types.Result.GetResult<Prisma.$RubricPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Rubric that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RubricFindFirstArgs} args - Arguments to find a Rubric
     * @example
     * // Get one Rubric
     * const rubric = await prisma.rubric.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends RubricFindFirstArgs>(args?: SelectSubset<T, RubricFindFirstArgs<ExtArgs>>): Prisma__RubricClient<runtime.Types.Result.GetResult<Prisma.$RubricPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Rubric that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RubricFindFirstOrThrowArgs} args - Arguments to find a Rubric
     * @example
     * // Get one Rubric
     * const rubric = await prisma.rubric.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends RubricFindFirstOrThrowArgs>(args?: SelectSubset<T, RubricFindFirstOrThrowArgs<ExtArgs>>): Prisma__RubricClient<runtime.Types.Result.GetResult<Prisma.$RubricPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Rubrics that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RubricFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Rubrics
     * const rubrics = await prisma.rubric.findMany()
     * 
     * // Get first 10 Rubrics
     * const rubrics = await prisma.rubric.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const rubricWithIdOnly = await prisma.rubric.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends RubricFindManyArgs>(args?: SelectSubset<T, RubricFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$RubricPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Rubric.
     * @param {RubricCreateArgs} args - Arguments to create a Rubric.
     * @example
     * // Create one Rubric
     * const Rubric = await prisma.rubric.create({
     *   data: {
     *     // ... data to create a Rubric
     *   }
     * })
     * 
     */
    create<T extends RubricCreateArgs>(args: SelectSubset<T, RubricCreateArgs<ExtArgs>>): Prisma__RubricClient<runtime.Types.Result.GetResult<Prisma.$RubricPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Rubrics.
     * @param {RubricCreateManyArgs} args - Arguments to create many Rubrics.
     * @example
     * // Create many Rubrics
     * const rubric = await prisma.rubric.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends RubricCreateManyArgs>(args?: SelectSubset<T, RubricCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Rubrics and returns the data saved in the database.
     * @param {RubricCreateManyAndReturnArgs} args - Arguments to create many Rubrics.
     * @example
     * // Create many Rubrics
     * const rubric = await prisma.rubric.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Rubrics and only return the `id`
     * const rubricWithIdOnly = await prisma.rubric.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends RubricCreateManyAndReturnArgs>(args?: SelectSubset<T, RubricCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$RubricPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Rubric.
     * @param {RubricDeleteArgs} args - Arguments to delete one Rubric.
     * @example
     * // Delete one Rubric
     * const Rubric = await prisma.rubric.delete({
     *   where: {
     *     // ... filter to delete one Rubric
     *   }
     * })
     * 
     */
    delete<T extends RubricDeleteArgs>(args: SelectSubset<T, RubricDeleteArgs<ExtArgs>>): Prisma__RubricClient<runtime.Types.Result.GetResult<Prisma.$RubricPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Rubric.
     * @param {RubricUpdateArgs} args - Arguments to update one Rubric.
     * @example
     * // Update one Rubric
     * const rubric = await prisma.rubric.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends RubricUpdateArgs>(args: SelectSubset<T, RubricUpdateArgs<ExtArgs>>): Prisma__RubricClient<runtime.Types.Result.GetResult<Prisma.$RubricPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Rubrics.
     * @param {RubricDeleteManyArgs} args - Arguments to filter Rubrics to delete.
     * @example
     * // Delete a few Rubrics
     * const { count } = await prisma.rubric.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends RubricDeleteManyArgs>(args?: SelectSubset<T, RubricDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Rubrics.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RubricUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Rubrics
     * const rubric = await prisma.rubric.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends RubricUpdateManyArgs>(args: SelectSubset<T, RubricUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Rubrics and returns the data updated in the database.
     * @param {RubricUpdateManyAndReturnArgs} args - Arguments to update many Rubrics.
     * @example
     * // Update many Rubrics
     * const rubric = await prisma.rubric.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Rubrics and only return the `id`
     * const rubricWithIdOnly = await prisma.rubric.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends RubricUpdateManyAndReturnArgs>(args: SelectSubset<T, RubricUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$RubricPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Rubric.
     * @param {RubricUpsertArgs} args - Arguments to update or create a Rubric.
     * @example
     * // Update or create a Rubric
     * const rubric = await prisma.rubric.upsert({
     *   create: {
     *     // ... data to create a Rubric
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Rubric we want to update
     *   }
     * })
     */
    upsert<T extends RubricUpsertArgs>(args: SelectSubset<T, RubricUpsertArgs<ExtArgs>>): Prisma__RubricClient<runtime.Types.Result.GetResult<Prisma.$RubricPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Rubrics.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RubricCountArgs} args - Arguments to filter Rubrics to count.
     * @example
     * // Count the number of Rubrics
     * const count = await prisma.rubric.count({
     *   where: {
     *     // ... the filter for the Rubrics we want to count
     *   }
     * })
    **/
    count<T extends RubricCountArgs>(
      args?: Subset<T, RubricCountArgs>,
    ): Prisma.PrismaPromise<
      T extends runtime.Types.Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], RubricCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Rubric.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RubricAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends RubricAggregateArgs>(args: Subset<T, RubricAggregateArgs>): Prisma.PrismaPromise<GetRubricAggregateType<T>>

    /**
     * Group by Rubric.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RubricGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends RubricGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: RubricGroupByArgs['orderBy'] }
        : { orderBy?: RubricGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, RubricGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetRubricGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Rubric model
   */
  readonly fields: RubricFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Rubric.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__RubricClient<T, Null = never, ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    criteria<T extends Rubric$criteriaArgs<ExtArgs> = {}>(args?: Subset<T, Rubric$criteriaArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$RubricCriteriaPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): runtime.Types.Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): runtime.Types.Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): runtime.Types.Utils.JsPromise<T>
  }




  /**
   * Fields of the Rubric model
   */
  export interface RubricFieldRefs {
    readonly id: FieldRef<"Rubric", 'String'>
    readonly name: FieldRef<"Rubric", 'String'>
    readonly description: FieldRef<"Rubric", 'String'>
    readonly createdAt: FieldRef<"Rubric", 'DateTime'>
    readonly updatedAt: FieldRef<"Rubric", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Rubric findUnique
   */
  export type RubricFindUniqueArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Rubric
     */
    select?: RubricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Rubric
     */
    omit?: RubricOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RubricInclude<ExtArgs> | null
    /**
     * Filter, which Rubric to fetch.
     */
    where: RubricWhereUniqueInput
  }

  /**
   * Rubric findUniqueOrThrow
   */
  export type RubricFindUniqueOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Rubric
     */
    select?: RubricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Rubric
     */
    omit?: RubricOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RubricInclude<ExtArgs> | null
    /**
     * Filter, which Rubric to fetch.
     */
    where: RubricWhereUniqueInput
  }

  /**
   * Rubric findFirst
   */
  export type RubricFindFirstArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Rubric
     */
    select?: RubricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Rubric
     */
    omit?: RubricOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RubricInclude<ExtArgs> | null
    /**
     * Filter, which Rubric to fetch.
     */
    where?: RubricWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Rubrics to fetch.
     */
    orderBy?: RubricOrderByWithRelationInput | RubricOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Rubrics.
     */
    cursor?: RubricWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Rubrics from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Rubrics.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Rubrics.
     */
    distinct?: RubricScalarFieldEnum | RubricScalarFieldEnum[]
  }

  /**
   * Rubric findFirstOrThrow
   */
  export type RubricFindFirstOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Rubric
     */
    select?: RubricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Rubric
     */
    omit?: RubricOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RubricInclude<ExtArgs> | null
    /**
     * Filter, which Rubric to fetch.
     */
    where?: RubricWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Rubrics to fetch.
     */
    orderBy?: RubricOrderByWithRelationInput | RubricOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Rubrics.
     */
    cursor?: RubricWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Rubrics from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Rubrics.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Rubrics.
     */
    distinct?: RubricScalarFieldEnum | RubricScalarFieldEnum[]
  }

  /**
   * Rubric findMany
   */
  export type RubricFindManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Rubric
     */
    select?: RubricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Rubric
     */
    omit?: RubricOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RubricInclude<ExtArgs> | null
    /**
     * Filter, which Rubrics to fetch.
     */
    where?: RubricWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Rubrics to fetch.
     */
    orderBy?: RubricOrderByWithRelationInput | RubricOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Rubrics.
     */
    cursor?: RubricWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Rubrics from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Rubrics.
     */
    skip?: number
    distinct?: RubricScalarFieldEnum | RubricScalarFieldEnum[]
  }

  /**
   * Rubric create
   */
  export type RubricCreateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Rubric
     */
    select?: RubricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Rubric
     */
    omit?: RubricOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RubricInclude<ExtArgs> | null
    /**
     * The data needed to create a Rubric.
     */
    data: XOR<RubricCreateInput, RubricUncheckedCreateInput>
  }

  /**
   * Rubric createMany
   */
  export type RubricCreateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to create many Rubrics.
     */
    data: RubricCreateManyInput | RubricCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Rubric createManyAndReturn
   */
  export type RubricCreateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Rubric
     */
    select?: RubricSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Rubric
     */
    omit?: RubricOmit<ExtArgs> | null
    /**
     * The data used to create many Rubrics.
     */
    data: RubricCreateManyInput | RubricCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Rubric update
   */
  export type RubricUpdateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Rubric
     */
    select?: RubricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Rubric
     */
    omit?: RubricOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RubricInclude<ExtArgs> | null
    /**
     * The data needed to update a Rubric.
     */
    data: XOR<RubricUpdateInput, RubricUncheckedUpdateInput>
    /**
     * Choose, which Rubric to update.
     */
    where: RubricWhereUniqueInput
  }

  /**
   * Rubric updateMany
   */
  export type RubricUpdateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to update Rubrics.
     */
    data: XOR<RubricUpdateManyMutationInput, RubricUncheckedUpdateManyInput>
    /**
     * Filter which Rubrics to update
     */
    where?: RubricWhereInput
    /**
     * Limit how many Rubrics to update.
     */
    limit?: number
  }

  /**
   * Rubric updateManyAndReturn
   */
  export type RubricUpdateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Rubric
     */
    select?: RubricSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Rubric
     */
    omit?: RubricOmit<ExtArgs> | null
    /**
     * The data used to update Rubrics.
     */
    data: XOR<RubricUpdateManyMutationInput, RubricUncheckedUpdateManyInput>
    /**
     * Filter which Rubrics to update
     */
    where?: RubricWhereInput
    /**
     * Limit how many Rubrics to update.
     */
    limit?: number
  }

  /**
   * Rubric upsert
   */
  export type RubricUpsertArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Rubric
     */
    select?: RubricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Rubric
     */
    omit?: RubricOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RubricInclude<ExtArgs> | null
    /**
     * The filter to search for the Rubric to update in case it exists.
     */
    where: RubricWhereUniqueInput
    /**
     * In case the Rubric found by the `where` argument doesn't exist, create a new Rubric with this data.
     */
    create: XOR<RubricCreateInput, RubricUncheckedCreateInput>
    /**
     * In case the Rubric was found with the provided `where` argument, update it with this data.
     */
    update: XOR<RubricUpdateInput, RubricUncheckedUpdateInput>
  }

  /**
   * Rubric delete
   */
  export type RubricDeleteArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Rubric
     */
    select?: RubricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Rubric
     */
    omit?: RubricOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RubricInclude<ExtArgs> | null
    /**
     * Filter which Rubric to delete.
     */
    where: RubricWhereUniqueInput
  }

  /**
   * Rubric deleteMany
   */
  export type RubricDeleteManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which Rubrics to delete
     */
    where?: RubricWhereInput
    /**
     * Limit how many Rubrics to delete.
     */
    limit?: number
  }

  /**
   * Rubric.criteria
   */
  export type Rubric$criteriaArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RubricCriteria
     */
    select?: RubricCriteriaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RubricCriteria
     */
    omit?: RubricCriteriaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RubricCriteriaInclude<ExtArgs> | null
    where?: RubricCriteriaWhereInput
    orderBy?: RubricCriteriaOrderByWithRelationInput | RubricCriteriaOrderByWithRelationInput[]
    cursor?: RubricCriteriaWhereUniqueInput
    take?: number
    skip?: number
    distinct?: RubricCriteriaScalarFieldEnum | RubricCriteriaScalarFieldEnum[]
  }

  /**
   * Rubric without action
   */
  export type RubricDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Rubric
     */
    select?: RubricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Rubric
     */
    omit?: RubricOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RubricInclude<ExtArgs> | null
  }


  /**
   * Model RubricCriteria
   */

  export type AggregateRubricCriteria = {
    _count: RubricCriteriaCountAggregateOutputType | null
    _min: RubricCriteriaMinAggregateOutputType | null
    _max: RubricCriteriaMaxAggregateOutputType | null
  }

  export type RubricCriteriaMinAggregateOutputType = {
    id: string | null
    name: string | null
    description: string | null
    rubricId: string | null
  }

  export type RubricCriteriaMaxAggregateOutputType = {
    id: string | null
    name: string | null
    description: string | null
    rubricId: string | null
  }

  export type RubricCriteriaCountAggregateOutputType = {
    id: number
    name: number
    description: number
    levels: number
    rubricId: number
    _all: number
  }


  export type RubricCriteriaMinAggregateInputType = {
    id?: true
    name?: true
    description?: true
    rubricId?: true
  }

  export type RubricCriteriaMaxAggregateInputType = {
    id?: true
    name?: true
    description?: true
    rubricId?: true
  }

  export type RubricCriteriaCountAggregateInputType = {
    id?: true
    name?: true
    description?: true
    levels?: true
    rubricId?: true
    _all?: true
  }

  export type RubricCriteriaAggregateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which RubricCriteria to aggregate.
     */
    where?: RubricCriteriaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RubricCriteria to fetch.
     */
    orderBy?: RubricCriteriaOrderByWithRelationInput | RubricCriteriaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: RubricCriteriaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RubricCriteria from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RubricCriteria.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned RubricCriteria
    **/
    _count?: true | RubricCriteriaCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: RubricCriteriaMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: RubricCriteriaMaxAggregateInputType
  }

  export type GetRubricCriteriaAggregateType<T extends RubricCriteriaAggregateArgs> = {
        [P in keyof T & keyof AggregateRubricCriteria]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateRubricCriteria[P]>
      : GetScalarType<T[P], AggregateRubricCriteria[P]>
  }




  export type RubricCriteriaGroupByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: RubricCriteriaWhereInput
    orderBy?: RubricCriteriaOrderByWithAggregationInput | RubricCriteriaOrderByWithAggregationInput[]
    by: RubricCriteriaScalarFieldEnum[] | RubricCriteriaScalarFieldEnum
    having?: RubricCriteriaScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: RubricCriteriaCountAggregateInputType | true
    _min?: RubricCriteriaMinAggregateInputType
    _max?: RubricCriteriaMaxAggregateInputType
  }

  export type RubricCriteriaGroupByOutputType = {
    id: string
    name: string
    description: string
    levels: JsonValue
    rubricId: string
    _count: RubricCriteriaCountAggregateOutputType | null
    _min: RubricCriteriaMinAggregateOutputType | null
    _max: RubricCriteriaMaxAggregateOutputType | null
  }

  type GetRubricCriteriaGroupByPayload<T extends RubricCriteriaGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<RubricCriteriaGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof RubricCriteriaGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], RubricCriteriaGroupByOutputType[P]>
            : GetScalarType<T[P], RubricCriteriaGroupByOutputType[P]>
        }
      >
    >


  export type RubricCriteriaSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    description?: boolean
    levels?: boolean
    rubricId?: boolean
    rubric?: boolean | RubricDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["rubricCriteria"]>

  export type RubricCriteriaSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    description?: boolean
    levels?: boolean
    rubricId?: boolean
    rubric?: boolean | RubricDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["rubricCriteria"]>

  export type RubricCriteriaSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    description?: boolean
    levels?: boolean
    rubricId?: boolean
    rubric?: boolean | RubricDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["rubricCriteria"]>

  export type RubricCriteriaSelectScalar = {
    id?: boolean
    name?: boolean
    description?: boolean
    levels?: boolean
    rubricId?: boolean
  }

  export type RubricCriteriaOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "name" | "description" | "levels" | "rubricId", ExtArgs["result"]["rubricCriteria"]>
  export type RubricCriteriaInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    rubric?: boolean | RubricDefaultArgs<ExtArgs>
  }
  export type RubricCriteriaIncludeCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    rubric?: boolean | RubricDefaultArgs<ExtArgs>
  }
  export type RubricCriteriaIncludeUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    rubric?: boolean | RubricDefaultArgs<ExtArgs>
  }

  export type $RubricCriteriaPayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "RubricCriteria"
    objects: {
      rubric: Prisma.$RubricPayload<ExtArgs>
    }
    scalars: runtime.Types.Extensions.GetPayloadResult<{
      id: string
      name: string
      description: string
      levels: Prisma.JsonValue
      rubricId: string
    }, ExtArgs["result"]["rubricCriteria"]>
    composites: {}
  }

  export type RubricCriteriaGetPayload<S extends boolean | null | undefined | RubricCriteriaDefaultArgs> = runtime.Types.Result.GetResult<Prisma.$RubricCriteriaPayload, S>

  export type RubricCriteriaCountArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> =
    Omit<RubricCriteriaFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: RubricCriteriaCountAggregateInputType | true
    }

  export interface RubricCriteriaDelegate<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['RubricCriteria'], meta: { name: 'RubricCriteria' } }
    /**
     * Find zero or one RubricCriteria that matches the filter.
     * @param {RubricCriteriaFindUniqueArgs} args - Arguments to find a RubricCriteria
     * @example
     * // Get one RubricCriteria
     * const rubricCriteria = await prisma.rubricCriteria.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends RubricCriteriaFindUniqueArgs>(args: SelectSubset<T, RubricCriteriaFindUniqueArgs<ExtArgs>>): Prisma__RubricCriteriaClient<runtime.Types.Result.GetResult<Prisma.$RubricCriteriaPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one RubricCriteria that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {RubricCriteriaFindUniqueOrThrowArgs} args - Arguments to find a RubricCriteria
     * @example
     * // Get one RubricCriteria
     * const rubricCriteria = await prisma.rubricCriteria.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends RubricCriteriaFindUniqueOrThrowArgs>(args: SelectSubset<T, RubricCriteriaFindUniqueOrThrowArgs<ExtArgs>>): Prisma__RubricCriteriaClient<runtime.Types.Result.GetResult<Prisma.$RubricCriteriaPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first RubricCriteria that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RubricCriteriaFindFirstArgs} args - Arguments to find a RubricCriteria
     * @example
     * // Get one RubricCriteria
     * const rubricCriteria = await prisma.rubricCriteria.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends RubricCriteriaFindFirstArgs>(args?: SelectSubset<T, RubricCriteriaFindFirstArgs<ExtArgs>>): Prisma__RubricCriteriaClient<runtime.Types.Result.GetResult<Prisma.$RubricCriteriaPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first RubricCriteria that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RubricCriteriaFindFirstOrThrowArgs} args - Arguments to find a RubricCriteria
     * @example
     * // Get one RubricCriteria
     * const rubricCriteria = await prisma.rubricCriteria.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends RubricCriteriaFindFirstOrThrowArgs>(args?: SelectSubset<T, RubricCriteriaFindFirstOrThrowArgs<ExtArgs>>): Prisma__RubricCriteriaClient<runtime.Types.Result.GetResult<Prisma.$RubricCriteriaPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more RubricCriteria that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RubricCriteriaFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all RubricCriteria
     * const rubricCriteria = await prisma.rubricCriteria.findMany()
     * 
     * // Get first 10 RubricCriteria
     * const rubricCriteria = await prisma.rubricCriteria.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const rubricCriteriaWithIdOnly = await prisma.rubricCriteria.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends RubricCriteriaFindManyArgs>(args?: SelectSubset<T, RubricCriteriaFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$RubricCriteriaPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a RubricCriteria.
     * @param {RubricCriteriaCreateArgs} args - Arguments to create a RubricCriteria.
     * @example
     * // Create one RubricCriteria
     * const RubricCriteria = await prisma.rubricCriteria.create({
     *   data: {
     *     // ... data to create a RubricCriteria
     *   }
     * })
     * 
     */
    create<T extends RubricCriteriaCreateArgs>(args: SelectSubset<T, RubricCriteriaCreateArgs<ExtArgs>>): Prisma__RubricCriteriaClient<runtime.Types.Result.GetResult<Prisma.$RubricCriteriaPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many RubricCriteria.
     * @param {RubricCriteriaCreateManyArgs} args - Arguments to create many RubricCriteria.
     * @example
     * // Create many RubricCriteria
     * const rubricCriteria = await prisma.rubricCriteria.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends RubricCriteriaCreateManyArgs>(args?: SelectSubset<T, RubricCriteriaCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many RubricCriteria and returns the data saved in the database.
     * @param {RubricCriteriaCreateManyAndReturnArgs} args - Arguments to create many RubricCriteria.
     * @example
     * // Create many RubricCriteria
     * const rubricCriteria = await prisma.rubricCriteria.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many RubricCriteria and only return the `id`
     * const rubricCriteriaWithIdOnly = await prisma.rubricCriteria.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends RubricCriteriaCreateManyAndReturnArgs>(args?: SelectSubset<T, RubricCriteriaCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$RubricCriteriaPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a RubricCriteria.
     * @param {RubricCriteriaDeleteArgs} args - Arguments to delete one RubricCriteria.
     * @example
     * // Delete one RubricCriteria
     * const RubricCriteria = await prisma.rubricCriteria.delete({
     *   where: {
     *     // ... filter to delete one RubricCriteria
     *   }
     * })
     * 
     */
    delete<T extends RubricCriteriaDeleteArgs>(args: SelectSubset<T, RubricCriteriaDeleteArgs<ExtArgs>>): Prisma__RubricCriteriaClient<runtime.Types.Result.GetResult<Prisma.$RubricCriteriaPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one RubricCriteria.
     * @param {RubricCriteriaUpdateArgs} args - Arguments to update one RubricCriteria.
     * @example
     * // Update one RubricCriteria
     * const rubricCriteria = await prisma.rubricCriteria.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends RubricCriteriaUpdateArgs>(args: SelectSubset<T, RubricCriteriaUpdateArgs<ExtArgs>>): Prisma__RubricCriteriaClient<runtime.Types.Result.GetResult<Prisma.$RubricCriteriaPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more RubricCriteria.
     * @param {RubricCriteriaDeleteManyArgs} args - Arguments to filter RubricCriteria to delete.
     * @example
     * // Delete a few RubricCriteria
     * const { count } = await prisma.rubricCriteria.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends RubricCriteriaDeleteManyArgs>(args?: SelectSubset<T, RubricCriteriaDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more RubricCriteria.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RubricCriteriaUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many RubricCriteria
     * const rubricCriteria = await prisma.rubricCriteria.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends RubricCriteriaUpdateManyArgs>(args: SelectSubset<T, RubricCriteriaUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more RubricCriteria and returns the data updated in the database.
     * @param {RubricCriteriaUpdateManyAndReturnArgs} args - Arguments to update many RubricCriteria.
     * @example
     * // Update many RubricCriteria
     * const rubricCriteria = await prisma.rubricCriteria.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more RubricCriteria and only return the `id`
     * const rubricCriteriaWithIdOnly = await prisma.rubricCriteria.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends RubricCriteriaUpdateManyAndReturnArgs>(args: SelectSubset<T, RubricCriteriaUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$RubricCriteriaPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one RubricCriteria.
     * @param {RubricCriteriaUpsertArgs} args - Arguments to update or create a RubricCriteria.
     * @example
     * // Update or create a RubricCriteria
     * const rubricCriteria = await prisma.rubricCriteria.upsert({
     *   create: {
     *     // ... data to create a RubricCriteria
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the RubricCriteria we want to update
     *   }
     * })
     */
    upsert<T extends RubricCriteriaUpsertArgs>(args: SelectSubset<T, RubricCriteriaUpsertArgs<ExtArgs>>): Prisma__RubricCriteriaClient<runtime.Types.Result.GetResult<Prisma.$RubricCriteriaPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of RubricCriteria.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RubricCriteriaCountArgs} args - Arguments to filter RubricCriteria to count.
     * @example
     * // Count the number of RubricCriteria
     * const count = await prisma.rubricCriteria.count({
     *   where: {
     *     // ... the filter for the RubricCriteria we want to count
     *   }
     * })
    **/
    count<T extends RubricCriteriaCountArgs>(
      args?: Subset<T, RubricCriteriaCountArgs>,
    ): Prisma.PrismaPromise<
      T extends runtime.Types.Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], RubricCriteriaCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a RubricCriteria.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RubricCriteriaAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends RubricCriteriaAggregateArgs>(args: Subset<T, RubricCriteriaAggregateArgs>): Prisma.PrismaPromise<GetRubricCriteriaAggregateType<T>>

    /**
     * Group by RubricCriteria.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RubricCriteriaGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends RubricCriteriaGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: RubricCriteriaGroupByArgs['orderBy'] }
        : { orderBy?: RubricCriteriaGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, RubricCriteriaGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetRubricCriteriaGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the RubricCriteria model
   */
  readonly fields: RubricCriteriaFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for RubricCriteria.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__RubricCriteriaClient<T, Null = never, ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    rubric<T extends RubricDefaultArgs<ExtArgs> = {}>(args?: Subset<T, RubricDefaultArgs<ExtArgs>>): Prisma__RubricClient<runtime.Types.Result.GetResult<Prisma.$RubricPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): runtime.Types.Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): runtime.Types.Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): runtime.Types.Utils.JsPromise<T>
  }




  /**
   * Fields of the RubricCriteria model
   */
  export interface RubricCriteriaFieldRefs {
    readonly id: FieldRef<"RubricCriteria", 'String'>
    readonly name: FieldRef<"RubricCriteria", 'String'>
    readonly description: FieldRef<"RubricCriteria", 'String'>
    readonly levels: FieldRef<"RubricCriteria", 'Json'>
    readonly rubricId: FieldRef<"RubricCriteria", 'String'>
  }
    

  // Custom InputTypes
  /**
   * RubricCriteria findUnique
   */
  export type RubricCriteriaFindUniqueArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RubricCriteria
     */
    select?: RubricCriteriaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RubricCriteria
     */
    omit?: RubricCriteriaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RubricCriteriaInclude<ExtArgs> | null
    /**
     * Filter, which RubricCriteria to fetch.
     */
    where: RubricCriteriaWhereUniqueInput
  }

  /**
   * RubricCriteria findUniqueOrThrow
   */
  export type RubricCriteriaFindUniqueOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RubricCriteria
     */
    select?: RubricCriteriaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RubricCriteria
     */
    omit?: RubricCriteriaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RubricCriteriaInclude<ExtArgs> | null
    /**
     * Filter, which RubricCriteria to fetch.
     */
    where: RubricCriteriaWhereUniqueInput
  }

  /**
   * RubricCriteria findFirst
   */
  export type RubricCriteriaFindFirstArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RubricCriteria
     */
    select?: RubricCriteriaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RubricCriteria
     */
    omit?: RubricCriteriaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RubricCriteriaInclude<ExtArgs> | null
    /**
     * Filter, which RubricCriteria to fetch.
     */
    where?: RubricCriteriaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RubricCriteria to fetch.
     */
    orderBy?: RubricCriteriaOrderByWithRelationInput | RubricCriteriaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RubricCriteria.
     */
    cursor?: RubricCriteriaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RubricCriteria from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RubricCriteria.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RubricCriteria.
     */
    distinct?: RubricCriteriaScalarFieldEnum | RubricCriteriaScalarFieldEnum[]
  }

  /**
   * RubricCriteria findFirstOrThrow
   */
  export type RubricCriteriaFindFirstOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RubricCriteria
     */
    select?: RubricCriteriaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RubricCriteria
     */
    omit?: RubricCriteriaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RubricCriteriaInclude<ExtArgs> | null
    /**
     * Filter, which RubricCriteria to fetch.
     */
    where?: RubricCriteriaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RubricCriteria to fetch.
     */
    orderBy?: RubricCriteriaOrderByWithRelationInput | RubricCriteriaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RubricCriteria.
     */
    cursor?: RubricCriteriaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RubricCriteria from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RubricCriteria.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RubricCriteria.
     */
    distinct?: RubricCriteriaScalarFieldEnum | RubricCriteriaScalarFieldEnum[]
  }

  /**
   * RubricCriteria findMany
   */
  export type RubricCriteriaFindManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RubricCriteria
     */
    select?: RubricCriteriaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RubricCriteria
     */
    omit?: RubricCriteriaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RubricCriteriaInclude<ExtArgs> | null
    /**
     * Filter, which RubricCriteria to fetch.
     */
    where?: RubricCriteriaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RubricCriteria to fetch.
     */
    orderBy?: RubricCriteriaOrderByWithRelationInput | RubricCriteriaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing RubricCriteria.
     */
    cursor?: RubricCriteriaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RubricCriteria from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RubricCriteria.
     */
    skip?: number
    distinct?: RubricCriteriaScalarFieldEnum | RubricCriteriaScalarFieldEnum[]
  }

  /**
   * RubricCriteria create
   */
  export type RubricCriteriaCreateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RubricCriteria
     */
    select?: RubricCriteriaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RubricCriteria
     */
    omit?: RubricCriteriaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RubricCriteriaInclude<ExtArgs> | null
    /**
     * The data needed to create a RubricCriteria.
     */
    data: XOR<RubricCriteriaCreateInput, RubricCriteriaUncheckedCreateInput>
  }

  /**
   * RubricCriteria createMany
   */
  export type RubricCriteriaCreateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to create many RubricCriteria.
     */
    data: RubricCriteriaCreateManyInput | RubricCriteriaCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * RubricCriteria createManyAndReturn
   */
  export type RubricCriteriaCreateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RubricCriteria
     */
    select?: RubricCriteriaSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the RubricCriteria
     */
    omit?: RubricCriteriaOmit<ExtArgs> | null
    /**
     * The data used to create many RubricCriteria.
     */
    data: RubricCriteriaCreateManyInput | RubricCriteriaCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RubricCriteriaIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * RubricCriteria update
   */
  export type RubricCriteriaUpdateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RubricCriteria
     */
    select?: RubricCriteriaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RubricCriteria
     */
    omit?: RubricCriteriaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RubricCriteriaInclude<ExtArgs> | null
    /**
     * The data needed to update a RubricCriteria.
     */
    data: XOR<RubricCriteriaUpdateInput, RubricCriteriaUncheckedUpdateInput>
    /**
     * Choose, which RubricCriteria to update.
     */
    where: RubricCriteriaWhereUniqueInput
  }

  /**
   * RubricCriteria updateMany
   */
  export type RubricCriteriaUpdateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to update RubricCriteria.
     */
    data: XOR<RubricCriteriaUpdateManyMutationInput, RubricCriteriaUncheckedUpdateManyInput>
    /**
     * Filter which RubricCriteria to update
     */
    where?: RubricCriteriaWhereInput
    /**
     * Limit how many RubricCriteria to update.
     */
    limit?: number
  }

  /**
   * RubricCriteria updateManyAndReturn
   */
  export type RubricCriteriaUpdateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RubricCriteria
     */
    select?: RubricCriteriaSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the RubricCriteria
     */
    omit?: RubricCriteriaOmit<ExtArgs> | null
    /**
     * The data used to update RubricCriteria.
     */
    data: XOR<RubricCriteriaUpdateManyMutationInput, RubricCriteriaUncheckedUpdateManyInput>
    /**
     * Filter which RubricCriteria to update
     */
    where?: RubricCriteriaWhereInput
    /**
     * Limit how many RubricCriteria to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RubricCriteriaIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * RubricCriteria upsert
   */
  export type RubricCriteriaUpsertArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RubricCriteria
     */
    select?: RubricCriteriaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RubricCriteria
     */
    omit?: RubricCriteriaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RubricCriteriaInclude<ExtArgs> | null
    /**
     * The filter to search for the RubricCriteria to update in case it exists.
     */
    where: RubricCriteriaWhereUniqueInput
    /**
     * In case the RubricCriteria found by the `where` argument doesn't exist, create a new RubricCriteria with this data.
     */
    create: XOR<RubricCriteriaCreateInput, RubricCriteriaUncheckedCreateInput>
    /**
     * In case the RubricCriteria was found with the provided `where` argument, update it with this data.
     */
    update: XOR<RubricCriteriaUpdateInput, RubricCriteriaUncheckedUpdateInput>
  }

  /**
   * RubricCriteria delete
   */
  export type RubricCriteriaDeleteArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RubricCriteria
     */
    select?: RubricCriteriaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RubricCriteria
     */
    omit?: RubricCriteriaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RubricCriteriaInclude<ExtArgs> | null
    /**
     * Filter which RubricCriteria to delete.
     */
    where: RubricCriteriaWhereUniqueInput
  }

  /**
   * RubricCriteria deleteMany
   */
  export type RubricCriteriaDeleteManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which RubricCriteria to delete
     */
    where?: RubricCriteriaWhereInput
    /**
     * Limit how many RubricCriteria to delete.
     */
    limit?: number
  }

  /**
   * RubricCriteria without action
   */
  export type RubricCriteriaDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RubricCriteria
     */
    select?: RubricCriteriaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RubricCriteria
     */
    omit?: RubricCriteriaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RubricCriteriaInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel = runtime.makeStrictEnum({
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  } as const)

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const UserScalarFieldEnum = {
    id: 'id',
    email: 'email',
    password: 'password',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  } as const

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const GradingTaskScalarFieldEnum = {
    id: 'id',
    authorId: 'authorId',
    courseId: 'courseId',
    status: 'status',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    completedAt: 'completedAt',
    score: 'score',
    feedback: 'feedback',
    metadata: 'metadata'
  } as const

  export type GradingTaskScalarFieldEnum = (typeof GradingTaskScalarFieldEnum)[keyof typeof GradingTaskScalarFieldEnum]


  export const RubricScalarFieldEnum = {
    id: 'id',
    name: 'name',
    description: 'description',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  } as const

  export type RubricScalarFieldEnum = (typeof RubricScalarFieldEnum)[keyof typeof RubricScalarFieldEnum]


  export const RubricCriteriaScalarFieldEnum = {
    id: 'id',
    name: 'name',
    description: 'description',
    levels: 'levels',
    rubricId: 'rubricId'
  } as const

  export type RubricCriteriaScalarFieldEnum = (typeof RubricCriteriaScalarFieldEnum)[keyof typeof RubricCriteriaScalarFieldEnum]


  export const SortOrder = {
    asc: 'asc',
    desc: 'desc'
  } as const

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const NullableJsonNullValueInput = {
    DbNull: DbNull,
    JsonNull: JsonNull
  } as const

  export type NullableJsonNullValueInput = (typeof NullableJsonNullValueInput)[keyof typeof NullableJsonNullValueInput]


  export const JsonNullValueInput = {
    JsonNull: JsonNull
  } as const

  export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput]


  export const QueryMode = {
    default: 'default',
    insensitive: 'insensitive'
  } as const

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const JsonNullValueFilter = {
    DbNull: DbNull,
    JsonNull: JsonNull,
    AnyNull: AnyNull
  } as const

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  export const NullsOrder = {
    first: 'first',
    last: 'last'
  } as const

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'QueryMode'
   */
  export type EnumQueryModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QueryMode'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type UserWhereInput = {
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    id?: StringFilter<"User"> | string
    email?: StringFilter<"User"> | string
    password?: StringFilter<"User"> | string
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    gradingTasks?: GradingTaskListRelationFilter
  }

  export type UserOrderByWithRelationInput = {
    id?: SortOrder
    email?: SortOrder
    password?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    gradingTasks?: GradingTaskOrderByRelationAggregateInput
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    email?: string
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    password?: StringFilter<"User"> | string
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    gradingTasks?: GradingTaskListRelationFilter
  }, "id" | "email">

  export type UserOrderByWithAggregationInput = {
    id?: SortOrder
    email?: SortOrder
    password?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: UserCountOrderByAggregateInput
    _max?: UserMaxOrderByAggregateInput
    _min?: UserMinOrderByAggregateInput
  }

  export type UserScalarWhereWithAggregatesInput = {
    AND?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    OR?: UserScalarWhereWithAggregatesInput[]
    NOT?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"User"> | string
    email?: StringWithAggregatesFilter<"User"> | string
    password?: StringWithAggregatesFilter<"User"> | string
    createdAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
  }

  export type GradingTaskWhereInput = {
    AND?: GradingTaskWhereInput | GradingTaskWhereInput[]
    OR?: GradingTaskWhereInput[]
    NOT?: GradingTaskWhereInput | GradingTaskWhereInput[]
    id?: StringFilter<"GradingTask"> | string
    authorId?: StringFilter<"GradingTask"> | string
    courseId?: StringNullableFilter<"GradingTask"> | string | null
    status?: StringFilter<"GradingTask"> | string
    createdAt?: DateTimeFilter<"GradingTask"> | Date | string
    updatedAt?: DateTimeFilter<"GradingTask"> | Date | string
    completedAt?: DateTimeNullableFilter<"GradingTask"> | Date | string | null
    score?: IntNullableFilter<"GradingTask"> | number | null
    feedback?: JsonNullableFilter<"GradingTask">
    metadata?: JsonNullableFilter<"GradingTask">
    author?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type GradingTaskOrderByWithRelationInput = {
    id?: SortOrder
    authorId?: SortOrder
    courseId?: SortOrderInput | SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    completedAt?: SortOrderInput | SortOrder
    score?: SortOrderInput | SortOrder
    feedback?: SortOrderInput | SortOrder
    metadata?: SortOrderInput | SortOrder
    author?: UserOrderByWithRelationInput
  }

  export type GradingTaskWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: GradingTaskWhereInput | GradingTaskWhereInput[]
    OR?: GradingTaskWhereInput[]
    NOT?: GradingTaskWhereInput | GradingTaskWhereInput[]
    authorId?: StringFilter<"GradingTask"> | string
    courseId?: StringNullableFilter<"GradingTask"> | string | null
    status?: StringFilter<"GradingTask"> | string
    createdAt?: DateTimeFilter<"GradingTask"> | Date | string
    updatedAt?: DateTimeFilter<"GradingTask"> | Date | string
    completedAt?: DateTimeNullableFilter<"GradingTask"> | Date | string | null
    score?: IntNullableFilter<"GradingTask"> | number | null
    feedback?: JsonNullableFilter<"GradingTask">
    metadata?: JsonNullableFilter<"GradingTask">
    author?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "id">

  export type GradingTaskOrderByWithAggregationInput = {
    id?: SortOrder
    authorId?: SortOrder
    courseId?: SortOrderInput | SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    completedAt?: SortOrderInput | SortOrder
    score?: SortOrderInput | SortOrder
    feedback?: SortOrderInput | SortOrder
    metadata?: SortOrderInput | SortOrder
    _count?: GradingTaskCountOrderByAggregateInput
    _avg?: GradingTaskAvgOrderByAggregateInput
    _max?: GradingTaskMaxOrderByAggregateInput
    _min?: GradingTaskMinOrderByAggregateInput
    _sum?: GradingTaskSumOrderByAggregateInput
  }

  export type GradingTaskScalarWhereWithAggregatesInput = {
    AND?: GradingTaskScalarWhereWithAggregatesInput | GradingTaskScalarWhereWithAggregatesInput[]
    OR?: GradingTaskScalarWhereWithAggregatesInput[]
    NOT?: GradingTaskScalarWhereWithAggregatesInput | GradingTaskScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"GradingTask"> | string
    authorId?: StringWithAggregatesFilter<"GradingTask"> | string
    courseId?: StringNullableWithAggregatesFilter<"GradingTask"> | string | null
    status?: StringWithAggregatesFilter<"GradingTask"> | string
    createdAt?: DateTimeWithAggregatesFilter<"GradingTask"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"GradingTask"> | Date | string
    completedAt?: DateTimeNullableWithAggregatesFilter<"GradingTask"> | Date | string | null
    score?: IntNullableWithAggregatesFilter<"GradingTask"> | number | null
    feedback?: JsonNullableWithAggregatesFilter<"GradingTask">
    metadata?: JsonNullableWithAggregatesFilter<"GradingTask">
  }

  export type RubricWhereInput = {
    AND?: RubricWhereInput | RubricWhereInput[]
    OR?: RubricWhereInput[]
    NOT?: RubricWhereInput | RubricWhereInput[]
    id?: StringFilter<"Rubric"> | string
    name?: StringFilter<"Rubric"> | string
    description?: StringFilter<"Rubric"> | string
    createdAt?: DateTimeFilter<"Rubric"> | Date | string
    updatedAt?: DateTimeFilter<"Rubric"> | Date | string
    criteria?: RubricCriteriaListRelationFilter
  }

  export type RubricOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    criteria?: RubricCriteriaOrderByRelationAggregateInput
  }

  export type RubricWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: RubricWhereInput | RubricWhereInput[]
    OR?: RubricWhereInput[]
    NOT?: RubricWhereInput | RubricWhereInput[]
    name?: StringFilter<"Rubric"> | string
    description?: StringFilter<"Rubric"> | string
    createdAt?: DateTimeFilter<"Rubric"> | Date | string
    updatedAt?: DateTimeFilter<"Rubric"> | Date | string
    criteria?: RubricCriteriaListRelationFilter
  }, "id">

  export type RubricOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: RubricCountOrderByAggregateInput
    _max?: RubricMaxOrderByAggregateInput
    _min?: RubricMinOrderByAggregateInput
  }

  export type RubricScalarWhereWithAggregatesInput = {
    AND?: RubricScalarWhereWithAggregatesInput | RubricScalarWhereWithAggregatesInput[]
    OR?: RubricScalarWhereWithAggregatesInput[]
    NOT?: RubricScalarWhereWithAggregatesInput | RubricScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Rubric"> | string
    name?: StringWithAggregatesFilter<"Rubric"> | string
    description?: StringWithAggregatesFilter<"Rubric"> | string
    createdAt?: DateTimeWithAggregatesFilter<"Rubric"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Rubric"> | Date | string
  }

  export type RubricCriteriaWhereInput = {
    AND?: RubricCriteriaWhereInput | RubricCriteriaWhereInput[]
    OR?: RubricCriteriaWhereInput[]
    NOT?: RubricCriteriaWhereInput | RubricCriteriaWhereInput[]
    id?: StringFilter<"RubricCriteria"> | string
    name?: StringFilter<"RubricCriteria"> | string
    description?: StringFilter<"RubricCriteria"> | string
    levels?: JsonFilter<"RubricCriteria">
    rubricId?: StringFilter<"RubricCriteria"> | string
    rubric?: XOR<RubricScalarRelationFilter, RubricWhereInput>
  }

  export type RubricCriteriaOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    levels?: SortOrder
    rubricId?: SortOrder
    rubric?: RubricOrderByWithRelationInput
  }

  export type RubricCriteriaWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: RubricCriteriaWhereInput | RubricCriteriaWhereInput[]
    OR?: RubricCriteriaWhereInput[]
    NOT?: RubricCriteriaWhereInput | RubricCriteriaWhereInput[]
    name?: StringFilter<"RubricCriteria"> | string
    description?: StringFilter<"RubricCriteria"> | string
    levels?: JsonFilter<"RubricCriteria">
    rubricId?: StringFilter<"RubricCriteria"> | string
    rubric?: XOR<RubricScalarRelationFilter, RubricWhereInput>
  }, "id">

  export type RubricCriteriaOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    levels?: SortOrder
    rubricId?: SortOrder
    _count?: RubricCriteriaCountOrderByAggregateInput
    _max?: RubricCriteriaMaxOrderByAggregateInput
    _min?: RubricCriteriaMinOrderByAggregateInput
  }

  export type RubricCriteriaScalarWhereWithAggregatesInput = {
    AND?: RubricCriteriaScalarWhereWithAggregatesInput | RubricCriteriaScalarWhereWithAggregatesInput[]
    OR?: RubricCriteriaScalarWhereWithAggregatesInput[]
    NOT?: RubricCriteriaScalarWhereWithAggregatesInput | RubricCriteriaScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"RubricCriteria"> | string
    name?: StringWithAggregatesFilter<"RubricCriteria"> | string
    description?: StringWithAggregatesFilter<"RubricCriteria"> | string
    levels?: JsonWithAggregatesFilter<"RubricCriteria">
    rubricId?: StringWithAggregatesFilter<"RubricCriteria"> | string
  }

  export type UserCreateInput = {
    id?: string
    email: string
    password: string
    createdAt?: Date | string
    updatedAt?: Date | string
    gradingTasks?: GradingTaskCreateNestedManyWithoutAuthorInput
  }

  export type UserUncheckedCreateInput = {
    id?: string
    email: string
    password: string
    createdAt?: Date | string
    updatedAt?: Date | string
    gradingTasks?: GradingTaskUncheckedCreateNestedManyWithoutAuthorInput
  }

  export type UserUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    gradingTasks?: GradingTaskUpdateManyWithoutAuthorNestedInput
  }

  export type UserUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    gradingTasks?: GradingTaskUncheckedUpdateManyWithoutAuthorNestedInput
  }

  export type UserCreateManyInput = {
    id?: string
    email: string
    password: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GradingTaskCreateInput = {
    id?: string
    courseId?: string | null
    status?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    completedAt?: Date | string | null
    score?: number | null
    feedback?: NullableJsonNullValueInput | InputJsonValue
    metadata?: NullableJsonNullValueInput | InputJsonValue
    author: UserCreateNestedOneWithoutGradingTasksInput
  }

  export type GradingTaskUncheckedCreateInput = {
    id?: string
    authorId: string
    courseId?: string | null
    status?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    completedAt?: Date | string | null
    score?: number | null
    feedback?: NullableJsonNullValueInput | InputJsonValue
    metadata?: NullableJsonNullValueInput | InputJsonValue
  }

  export type GradingTaskUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    courseId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    score?: NullableIntFieldUpdateOperationsInput | number | null
    feedback?: NullableJsonNullValueInput | InputJsonValue
    metadata?: NullableJsonNullValueInput | InputJsonValue
    author?: UserUpdateOneRequiredWithoutGradingTasksNestedInput
  }

  export type GradingTaskUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    authorId?: StringFieldUpdateOperationsInput | string
    courseId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    score?: NullableIntFieldUpdateOperationsInput | number | null
    feedback?: NullableJsonNullValueInput | InputJsonValue
    metadata?: NullableJsonNullValueInput | InputJsonValue
  }

  export type GradingTaskCreateManyInput = {
    id?: string
    authorId: string
    courseId?: string | null
    status?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    completedAt?: Date | string | null
    score?: number | null
    feedback?: NullableJsonNullValueInput | InputJsonValue
    metadata?: NullableJsonNullValueInput | InputJsonValue
  }

  export type GradingTaskUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    courseId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    score?: NullableIntFieldUpdateOperationsInput | number | null
    feedback?: NullableJsonNullValueInput | InputJsonValue
    metadata?: NullableJsonNullValueInput | InputJsonValue
  }

  export type GradingTaskUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    authorId?: StringFieldUpdateOperationsInput | string
    courseId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    score?: NullableIntFieldUpdateOperationsInput | number | null
    feedback?: NullableJsonNullValueInput | InputJsonValue
    metadata?: NullableJsonNullValueInput | InputJsonValue
  }

  export type RubricCreateInput = {
    id?: string
    name: string
    description: string
    createdAt?: Date | string
    updatedAt?: Date | string
    criteria?: RubricCriteriaCreateNestedManyWithoutRubricInput
  }

  export type RubricUncheckedCreateInput = {
    id?: string
    name: string
    description: string
    createdAt?: Date | string
    updatedAt?: Date | string
    criteria?: RubricCriteriaUncheckedCreateNestedManyWithoutRubricInput
  }

  export type RubricUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    criteria?: RubricCriteriaUpdateManyWithoutRubricNestedInput
  }

  export type RubricUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    criteria?: RubricCriteriaUncheckedUpdateManyWithoutRubricNestedInput
  }

  export type RubricCreateManyInput = {
    id?: string
    name: string
    description: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RubricUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RubricUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RubricCriteriaCreateInput = {
    id?: string
    name: string
    description: string
    levels: JsonNullValueInput | InputJsonValue
    rubric: RubricCreateNestedOneWithoutCriteriaInput
  }

  export type RubricCriteriaUncheckedCreateInput = {
    id?: string
    name: string
    description: string
    levels: JsonNullValueInput | InputJsonValue
    rubricId: string
  }

  export type RubricCriteriaUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    levels?: JsonNullValueInput | InputJsonValue
    rubric?: RubricUpdateOneRequiredWithoutCriteriaNestedInput
  }

  export type RubricCriteriaUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    levels?: JsonNullValueInput | InputJsonValue
    rubricId?: StringFieldUpdateOperationsInput | string
  }

  export type RubricCriteriaCreateManyInput = {
    id?: string
    name: string
    description: string
    levels: JsonNullValueInput | InputJsonValue
    rubricId: string
  }

  export type RubricCriteriaUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    levels?: JsonNullValueInput | InputJsonValue
  }

  export type RubricCriteriaUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    levels?: JsonNullValueInput | InputJsonValue
    rubricId?: StringFieldUpdateOperationsInput | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type GradingTaskListRelationFilter = {
    every?: GradingTaskWhereInput
    some?: GradingTaskWhereInput
    none?: GradingTaskWhereInput
  }

  export type GradingTaskOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UserCountOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    password?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    password?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    password?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }
  export type JsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type UserScalarRelationFilter = {
    is?: UserWhereInput
    isNot?: UserWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type GradingTaskCountOrderByAggregateInput = {
    id?: SortOrder
    authorId?: SortOrder
    courseId?: SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    completedAt?: SortOrder
    score?: SortOrder
    feedback?: SortOrder
    metadata?: SortOrder
  }

  export type GradingTaskAvgOrderByAggregateInput = {
    score?: SortOrder
  }

  export type GradingTaskMaxOrderByAggregateInput = {
    id?: SortOrder
    authorId?: SortOrder
    courseId?: SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    completedAt?: SortOrder
    score?: SortOrder
  }

  export type GradingTaskMinOrderByAggregateInput = {
    id?: SortOrder
    authorId?: SortOrder
    courseId?: SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    completedAt?: SortOrder
    score?: SortOrder
  }

  export type GradingTaskSumOrderByAggregateInput = {
    score?: SortOrder
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }
  export type JsonNullableWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedJsonNullableFilter<$PrismaModel>
    _max?: NestedJsonNullableFilter<$PrismaModel>
  }

  export type RubricCriteriaListRelationFilter = {
    every?: RubricCriteriaWhereInput
    some?: RubricCriteriaWhereInput
    none?: RubricCriteriaWhereInput
  }

  export type RubricCriteriaOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type RubricCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RubricMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RubricMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }
  export type JsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonFilterBase<$PrismaModel>>, 'path'>>

  export type JsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type RubricScalarRelationFilter = {
    is?: RubricWhereInput
    isNot?: RubricWhereInput
  }

  export type RubricCriteriaCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    levels?: SortOrder
    rubricId?: SortOrder
  }

  export type RubricCriteriaMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    rubricId?: SortOrder
  }

  export type RubricCriteriaMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    rubricId?: SortOrder
  }
  export type JsonWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedJsonFilter<$PrismaModel>
    _max?: NestedJsonFilter<$PrismaModel>
  }

  export type GradingTaskCreateNestedManyWithoutAuthorInput = {
    create?: XOR<GradingTaskCreateWithoutAuthorInput, GradingTaskUncheckedCreateWithoutAuthorInput> | GradingTaskCreateWithoutAuthorInput[] | GradingTaskUncheckedCreateWithoutAuthorInput[]
    connectOrCreate?: GradingTaskCreateOrConnectWithoutAuthorInput | GradingTaskCreateOrConnectWithoutAuthorInput[]
    createMany?: GradingTaskCreateManyAuthorInputEnvelope
    connect?: GradingTaskWhereUniqueInput | GradingTaskWhereUniqueInput[]
  }

  export type GradingTaskUncheckedCreateNestedManyWithoutAuthorInput = {
    create?: XOR<GradingTaskCreateWithoutAuthorInput, GradingTaskUncheckedCreateWithoutAuthorInput> | GradingTaskCreateWithoutAuthorInput[] | GradingTaskUncheckedCreateWithoutAuthorInput[]
    connectOrCreate?: GradingTaskCreateOrConnectWithoutAuthorInput | GradingTaskCreateOrConnectWithoutAuthorInput[]
    createMany?: GradingTaskCreateManyAuthorInputEnvelope
    connect?: GradingTaskWhereUniqueInput | GradingTaskWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type GradingTaskUpdateManyWithoutAuthorNestedInput = {
    create?: XOR<GradingTaskCreateWithoutAuthorInput, GradingTaskUncheckedCreateWithoutAuthorInput> | GradingTaskCreateWithoutAuthorInput[] | GradingTaskUncheckedCreateWithoutAuthorInput[]
    connectOrCreate?: GradingTaskCreateOrConnectWithoutAuthorInput | GradingTaskCreateOrConnectWithoutAuthorInput[]
    upsert?: GradingTaskUpsertWithWhereUniqueWithoutAuthorInput | GradingTaskUpsertWithWhereUniqueWithoutAuthorInput[]
    createMany?: GradingTaskCreateManyAuthorInputEnvelope
    set?: GradingTaskWhereUniqueInput | GradingTaskWhereUniqueInput[]
    disconnect?: GradingTaskWhereUniqueInput | GradingTaskWhereUniqueInput[]
    delete?: GradingTaskWhereUniqueInput | GradingTaskWhereUniqueInput[]
    connect?: GradingTaskWhereUniqueInput | GradingTaskWhereUniqueInput[]
    update?: GradingTaskUpdateWithWhereUniqueWithoutAuthorInput | GradingTaskUpdateWithWhereUniqueWithoutAuthorInput[]
    updateMany?: GradingTaskUpdateManyWithWhereWithoutAuthorInput | GradingTaskUpdateManyWithWhereWithoutAuthorInput[]
    deleteMany?: GradingTaskScalarWhereInput | GradingTaskScalarWhereInput[]
  }

  export type GradingTaskUncheckedUpdateManyWithoutAuthorNestedInput = {
    create?: XOR<GradingTaskCreateWithoutAuthorInput, GradingTaskUncheckedCreateWithoutAuthorInput> | GradingTaskCreateWithoutAuthorInput[] | GradingTaskUncheckedCreateWithoutAuthorInput[]
    connectOrCreate?: GradingTaskCreateOrConnectWithoutAuthorInput | GradingTaskCreateOrConnectWithoutAuthorInput[]
    upsert?: GradingTaskUpsertWithWhereUniqueWithoutAuthorInput | GradingTaskUpsertWithWhereUniqueWithoutAuthorInput[]
    createMany?: GradingTaskCreateManyAuthorInputEnvelope
    set?: GradingTaskWhereUniqueInput | GradingTaskWhereUniqueInput[]
    disconnect?: GradingTaskWhereUniqueInput | GradingTaskWhereUniqueInput[]
    delete?: GradingTaskWhereUniqueInput | GradingTaskWhereUniqueInput[]
    connect?: GradingTaskWhereUniqueInput | GradingTaskWhereUniqueInput[]
    update?: GradingTaskUpdateWithWhereUniqueWithoutAuthorInput | GradingTaskUpdateWithWhereUniqueWithoutAuthorInput[]
    updateMany?: GradingTaskUpdateManyWithWhereWithoutAuthorInput | GradingTaskUpdateManyWithWhereWithoutAuthorInput[]
    deleteMany?: GradingTaskScalarWhereInput | GradingTaskScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutGradingTasksInput = {
    create?: XOR<UserCreateWithoutGradingTasksInput, UserUncheckedCreateWithoutGradingTasksInput>
    connectOrCreate?: UserCreateOrConnectWithoutGradingTasksInput
    connect?: UserWhereUniqueInput
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type UserUpdateOneRequiredWithoutGradingTasksNestedInput = {
    create?: XOR<UserCreateWithoutGradingTasksInput, UserUncheckedCreateWithoutGradingTasksInput>
    connectOrCreate?: UserCreateOrConnectWithoutGradingTasksInput
    upsert?: UserUpsertWithoutGradingTasksInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutGradingTasksInput, UserUpdateWithoutGradingTasksInput>, UserUncheckedUpdateWithoutGradingTasksInput>
  }

  export type RubricCriteriaCreateNestedManyWithoutRubricInput = {
    create?: XOR<RubricCriteriaCreateWithoutRubricInput, RubricCriteriaUncheckedCreateWithoutRubricInput> | RubricCriteriaCreateWithoutRubricInput[] | RubricCriteriaUncheckedCreateWithoutRubricInput[]
    connectOrCreate?: RubricCriteriaCreateOrConnectWithoutRubricInput | RubricCriteriaCreateOrConnectWithoutRubricInput[]
    createMany?: RubricCriteriaCreateManyRubricInputEnvelope
    connect?: RubricCriteriaWhereUniqueInput | RubricCriteriaWhereUniqueInput[]
  }

  export type RubricCriteriaUncheckedCreateNestedManyWithoutRubricInput = {
    create?: XOR<RubricCriteriaCreateWithoutRubricInput, RubricCriteriaUncheckedCreateWithoutRubricInput> | RubricCriteriaCreateWithoutRubricInput[] | RubricCriteriaUncheckedCreateWithoutRubricInput[]
    connectOrCreate?: RubricCriteriaCreateOrConnectWithoutRubricInput | RubricCriteriaCreateOrConnectWithoutRubricInput[]
    createMany?: RubricCriteriaCreateManyRubricInputEnvelope
    connect?: RubricCriteriaWhereUniqueInput | RubricCriteriaWhereUniqueInput[]
  }

  export type RubricCriteriaUpdateManyWithoutRubricNestedInput = {
    create?: XOR<RubricCriteriaCreateWithoutRubricInput, RubricCriteriaUncheckedCreateWithoutRubricInput> | RubricCriteriaCreateWithoutRubricInput[] | RubricCriteriaUncheckedCreateWithoutRubricInput[]
    connectOrCreate?: RubricCriteriaCreateOrConnectWithoutRubricInput | RubricCriteriaCreateOrConnectWithoutRubricInput[]
    upsert?: RubricCriteriaUpsertWithWhereUniqueWithoutRubricInput | RubricCriteriaUpsertWithWhereUniqueWithoutRubricInput[]
    createMany?: RubricCriteriaCreateManyRubricInputEnvelope
    set?: RubricCriteriaWhereUniqueInput | RubricCriteriaWhereUniqueInput[]
    disconnect?: RubricCriteriaWhereUniqueInput | RubricCriteriaWhereUniqueInput[]
    delete?: RubricCriteriaWhereUniqueInput | RubricCriteriaWhereUniqueInput[]
    connect?: RubricCriteriaWhereUniqueInput | RubricCriteriaWhereUniqueInput[]
    update?: RubricCriteriaUpdateWithWhereUniqueWithoutRubricInput | RubricCriteriaUpdateWithWhereUniqueWithoutRubricInput[]
    updateMany?: RubricCriteriaUpdateManyWithWhereWithoutRubricInput | RubricCriteriaUpdateManyWithWhereWithoutRubricInput[]
    deleteMany?: RubricCriteriaScalarWhereInput | RubricCriteriaScalarWhereInput[]
  }

  export type RubricCriteriaUncheckedUpdateManyWithoutRubricNestedInput = {
    create?: XOR<RubricCriteriaCreateWithoutRubricInput, RubricCriteriaUncheckedCreateWithoutRubricInput> | RubricCriteriaCreateWithoutRubricInput[] | RubricCriteriaUncheckedCreateWithoutRubricInput[]
    connectOrCreate?: RubricCriteriaCreateOrConnectWithoutRubricInput | RubricCriteriaCreateOrConnectWithoutRubricInput[]
    upsert?: RubricCriteriaUpsertWithWhereUniqueWithoutRubricInput | RubricCriteriaUpsertWithWhereUniqueWithoutRubricInput[]
    createMany?: RubricCriteriaCreateManyRubricInputEnvelope
    set?: RubricCriteriaWhereUniqueInput | RubricCriteriaWhereUniqueInput[]
    disconnect?: RubricCriteriaWhereUniqueInput | RubricCriteriaWhereUniqueInput[]
    delete?: RubricCriteriaWhereUniqueInput | RubricCriteriaWhereUniqueInput[]
    connect?: RubricCriteriaWhereUniqueInput | RubricCriteriaWhereUniqueInput[]
    update?: RubricCriteriaUpdateWithWhereUniqueWithoutRubricInput | RubricCriteriaUpdateWithWhereUniqueWithoutRubricInput[]
    updateMany?: RubricCriteriaUpdateManyWithWhereWithoutRubricInput | RubricCriteriaUpdateManyWithWhereWithoutRubricInput[]
    deleteMany?: RubricCriteriaScalarWhereInput | RubricCriteriaScalarWhereInput[]
  }

  export type RubricCreateNestedOneWithoutCriteriaInput = {
    create?: XOR<RubricCreateWithoutCriteriaInput, RubricUncheckedCreateWithoutCriteriaInput>
    connectOrCreate?: RubricCreateOrConnectWithoutCriteriaInput
    connect?: RubricWhereUniqueInput
  }

  export type RubricUpdateOneRequiredWithoutCriteriaNestedInput = {
    create?: XOR<RubricCreateWithoutCriteriaInput, RubricUncheckedCreateWithoutCriteriaInput>
    connectOrCreate?: RubricCreateOrConnectWithoutCriteriaInput
    upsert?: RubricUpsertWithoutCriteriaInput
    connect?: RubricWhereUniqueInput
    update?: XOR<XOR<RubricUpdateToOneWithWhereWithoutCriteriaInput, RubricUpdateWithoutCriteriaInput>, RubricUncheckedUpdateWithoutCriteriaInput>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }
  export type NestedJsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }
  export type NestedJsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type GradingTaskCreateWithoutAuthorInput = {
    id?: string
    courseId?: string | null
    status?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    completedAt?: Date | string | null
    score?: number | null
    feedback?: NullableJsonNullValueInput | InputJsonValue
    metadata?: NullableJsonNullValueInput | InputJsonValue
  }

  export type GradingTaskUncheckedCreateWithoutAuthorInput = {
    id?: string
    courseId?: string | null
    status?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    completedAt?: Date | string | null
    score?: number | null
    feedback?: NullableJsonNullValueInput | InputJsonValue
    metadata?: NullableJsonNullValueInput | InputJsonValue
  }

  export type GradingTaskCreateOrConnectWithoutAuthorInput = {
    where: GradingTaskWhereUniqueInput
    create: XOR<GradingTaskCreateWithoutAuthorInput, GradingTaskUncheckedCreateWithoutAuthorInput>
  }

  export type GradingTaskCreateManyAuthorInputEnvelope = {
    data: GradingTaskCreateManyAuthorInput | GradingTaskCreateManyAuthorInput[]
    skipDuplicates?: boolean
  }

  export type GradingTaskUpsertWithWhereUniqueWithoutAuthorInput = {
    where: GradingTaskWhereUniqueInput
    update: XOR<GradingTaskUpdateWithoutAuthorInput, GradingTaskUncheckedUpdateWithoutAuthorInput>
    create: XOR<GradingTaskCreateWithoutAuthorInput, GradingTaskUncheckedCreateWithoutAuthorInput>
  }

  export type GradingTaskUpdateWithWhereUniqueWithoutAuthorInput = {
    where: GradingTaskWhereUniqueInput
    data: XOR<GradingTaskUpdateWithoutAuthorInput, GradingTaskUncheckedUpdateWithoutAuthorInput>
  }

  export type GradingTaskUpdateManyWithWhereWithoutAuthorInput = {
    where: GradingTaskScalarWhereInput
    data: XOR<GradingTaskUpdateManyMutationInput, GradingTaskUncheckedUpdateManyWithoutAuthorInput>
  }

  export type GradingTaskScalarWhereInput = {
    AND?: GradingTaskScalarWhereInput | GradingTaskScalarWhereInput[]
    OR?: GradingTaskScalarWhereInput[]
    NOT?: GradingTaskScalarWhereInput | GradingTaskScalarWhereInput[]
    id?: StringFilter<"GradingTask"> | string
    authorId?: StringFilter<"GradingTask"> | string
    courseId?: StringNullableFilter<"GradingTask"> | string | null
    status?: StringFilter<"GradingTask"> | string
    createdAt?: DateTimeFilter<"GradingTask"> | Date | string
    updatedAt?: DateTimeFilter<"GradingTask"> | Date | string
    completedAt?: DateTimeNullableFilter<"GradingTask"> | Date | string | null
    score?: IntNullableFilter<"GradingTask"> | number | null
    feedback?: JsonNullableFilter<"GradingTask">
    metadata?: JsonNullableFilter<"GradingTask">
  }

  export type UserCreateWithoutGradingTasksInput = {
    id?: string
    email: string
    password: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserUncheckedCreateWithoutGradingTasksInput = {
    id?: string
    email: string
    password: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserCreateOrConnectWithoutGradingTasksInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutGradingTasksInput, UserUncheckedCreateWithoutGradingTasksInput>
  }

  export type UserUpsertWithoutGradingTasksInput = {
    update: XOR<UserUpdateWithoutGradingTasksInput, UserUncheckedUpdateWithoutGradingTasksInput>
    create: XOR<UserCreateWithoutGradingTasksInput, UserUncheckedCreateWithoutGradingTasksInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutGradingTasksInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutGradingTasksInput, UserUncheckedUpdateWithoutGradingTasksInput>
  }

  export type UserUpdateWithoutGradingTasksInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateWithoutGradingTasksInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RubricCriteriaCreateWithoutRubricInput = {
    id?: string
    name: string
    description: string
    levels: JsonNullValueInput | InputJsonValue
  }

  export type RubricCriteriaUncheckedCreateWithoutRubricInput = {
    id?: string
    name: string
    description: string
    levels: JsonNullValueInput | InputJsonValue
  }

  export type RubricCriteriaCreateOrConnectWithoutRubricInput = {
    where: RubricCriteriaWhereUniqueInput
    create: XOR<RubricCriteriaCreateWithoutRubricInput, RubricCriteriaUncheckedCreateWithoutRubricInput>
  }

  export type RubricCriteriaCreateManyRubricInputEnvelope = {
    data: RubricCriteriaCreateManyRubricInput | RubricCriteriaCreateManyRubricInput[]
    skipDuplicates?: boolean
  }

  export type RubricCriteriaUpsertWithWhereUniqueWithoutRubricInput = {
    where: RubricCriteriaWhereUniqueInput
    update: XOR<RubricCriteriaUpdateWithoutRubricInput, RubricCriteriaUncheckedUpdateWithoutRubricInput>
    create: XOR<RubricCriteriaCreateWithoutRubricInput, RubricCriteriaUncheckedCreateWithoutRubricInput>
  }

  export type RubricCriteriaUpdateWithWhereUniqueWithoutRubricInput = {
    where: RubricCriteriaWhereUniqueInput
    data: XOR<RubricCriteriaUpdateWithoutRubricInput, RubricCriteriaUncheckedUpdateWithoutRubricInput>
  }

  export type RubricCriteriaUpdateManyWithWhereWithoutRubricInput = {
    where: RubricCriteriaScalarWhereInput
    data: XOR<RubricCriteriaUpdateManyMutationInput, RubricCriteriaUncheckedUpdateManyWithoutRubricInput>
  }

  export type RubricCriteriaScalarWhereInput = {
    AND?: RubricCriteriaScalarWhereInput | RubricCriteriaScalarWhereInput[]
    OR?: RubricCriteriaScalarWhereInput[]
    NOT?: RubricCriteriaScalarWhereInput | RubricCriteriaScalarWhereInput[]
    id?: StringFilter<"RubricCriteria"> | string
    name?: StringFilter<"RubricCriteria"> | string
    description?: StringFilter<"RubricCriteria"> | string
    levels?: JsonFilter<"RubricCriteria">
    rubricId?: StringFilter<"RubricCriteria"> | string
  }

  export type RubricCreateWithoutCriteriaInput = {
    id?: string
    name: string
    description: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RubricUncheckedCreateWithoutCriteriaInput = {
    id?: string
    name: string
    description: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RubricCreateOrConnectWithoutCriteriaInput = {
    where: RubricWhereUniqueInput
    create: XOR<RubricCreateWithoutCriteriaInput, RubricUncheckedCreateWithoutCriteriaInput>
  }

  export type RubricUpsertWithoutCriteriaInput = {
    update: XOR<RubricUpdateWithoutCriteriaInput, RubricUncheckedUpdateWithoutCriteriaInput>
    create: XOR<RubricCreateWithoutCriteriaInput, RubricUncheckedCreateWithoutCriteriaInput>
    where?: RubricWhereInput
  }

  export type RubricUpdateToOneWithWhereWithoutCriteriaInput = {
    where?: RubricWhereInput
    data: XOR<RubricUpdateWithoutCriteriaInput, RubricUncheckedUpdateWithoutCriteriaInput>
  }

  export type RubricUpdateWithoutCriteriaInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RubricUncheckedUpdateWithoutCriteriaInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GradingTaskCreateManyAuthorInput = {
    id?: string
    courseId?: string | null
    status?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    completedAt?: Date | string | null
    score?: number | null
    feedback?: NullableJsonNullValueInput | InputJsonValue
    metadata?: NullableJsonNullValueInput | InputJsonValue
  }

  export type GradingTaskUpdateWithoutAuthorInput = {
    id?: StringFieldUpdateOperationsInput | string
    courseId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    score?: NullableIntFieldUpdateOperationsInput | number | null
    feedback?: NullableJsonNullValueInput | InputJsonValue
    metadata?: NullableJsonNullValueInput | InputJsonValue
  }

  export type GradingTaskUncheckedUpdateWithoutAuthorInput = {
    id?: StringFieldUpdateOperationsInput | string
    courseId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    score?: NullableIntFieldUpdateOperationsInput | number | null
    feedback?: NullableJsonNullValueInput | InputJsonValue
    metadata?: NullableJsonNullValueInput | InputJsonValue
  }

  export type GradingTaskUncheckedUpdateManyWithoutAuthorInput = {
    id?: StringFieldUpdateOperationsInput | string
    courseId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    score?: NullableIntFieldUpdateOperationsInput | number | null
    feedback?: NullableJsonNullValueInput | InputJsonValue
    metadata?: NullableJsonNullValueInput | InputJsonValue
  }

  export type RubricCriteriaCreateManyRubricInput = {
    id?: string
    name: string
    description: string
    levels: JsonNullValueInput | InputJsonValue
  }

  export type RubricCriteriaUpdateWithoutRubricInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    levels?: JsonNullValueInput | InputJsonValue
  }

  export type RubricCriteriaUncheckedUpdateWithoutRubricInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    levels?: JsonNullValueInput | InputJsonValue
  }

  export type RubricCriteriaUncheckedUpdateManyWithoutRubricInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    levels?: JsonNullValueInput | InputJsonValue
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }
}