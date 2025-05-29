
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
 * Model Rubric
 * 
 */
export type Rubric = runtime.Types.Result.DefaultSelection<Prisma.$RubricPayload>
/**
 * Model Upload
 * 
 */
export type Upload = runtime.Types.Result.DefaultSelection<Prisma.$UploadPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const UploadStatus = {
  not_started: 'not_started',
  processing: 'processing',
  completed: 'completed',
  failed: 'failed'
} as const

export type UploadStatus = (typeof UploadStatus)[keyof typeof UploadStatus]

}

export type UploadStatus = $Enums.UploadStatus

export const UploadStatus = $Enums.UploadStatus



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
  "inlineDatasources": {
    "db": {
      "url": {
        "fromEnvVar": "DATABASE_URL",
        "value": "postgresql://test_user:test_password@localhost:5433/grading_test_template"
      }
    }
  },
  "inlineSchema": "generator client {\n  provider      = \"prisma-client\"\n  output        = \"../app/generated/prisma/client\"\n  binaryTargets = [\"native\", \"linux-musl-openssl-3.0.x\"]\n}\n\ndatasource db {\n  provider = \"postgresql\"\n  url      = env(\"DATABASE_URL\")\n}\n\nmodel User {\n  id        String   @id @default(uuid())\n  email     String   @unique\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  rubrics Rubric[]\n  uploads Upload[]\n\n  @@map(\"users\")\n}\n\nmodel Rubric {\n  id     String @id @default(uuid())\n  userId String\n  user   User   @relation(fields: [userId], references: [id])\n\n  name        String   @db.VarChar(255)\n  description String   @db.Text\n  criteria    Json // [{ name, description, levels: [{ level, description, score }] }]\n  createdAt   DateTime @default(now())\n  updatedAt   DateTime @updatedAt\n\n  uploads Upload[]\n\n  @@map(\"rubrics\")\n}\n\nmodel Upload {\n  id     String @id @default(uuid())\n  userId String\n  user   User   @relation(fields: [userId], references: [id])\n\n  rubricId String\n  rubric   Rubric @relation(fields: [rubricId], references: [id])\n\n  originalFileName String\n  storedFileKey    String @unique\n  storageLocation  String // e.g. \"s3://bucket/file.pdf\" or \"/uploads/uuid.pdf\"\n  fileSize         Int\n  mimeType         String\n\n  status UploadStatus @default(not_started)\n  result Json?\n\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  @@index([userId])\n  @@index([rubricId])\n  @@map(\"uploads\")\n}\n\nenum UploadStatus {\n  not_started\n  processing\n  completed\n  failed\n}\n",
  "inlineSchemaHash": "71ff1472d92d2baa5e8dbd75e3dfc79b6dcf4714e82c06a60673b9afe516f551",
  "copyEngine": true,
  "runtimeDataModel": {
    "models": {},
    "enums": {},
    "types": {}
  },
  "dirname": ""
}
config.dirname = __dirname

config.runtimeDataModel = JSON.parse("{\"models\":{\"User\":{\"dbName\":\"users\",\"schema\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"nativeType\":null,\"default\":{\"name\":\"uuid\",\"args\":[4]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"email\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"nativeType\":null,\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"rubrics\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Rubric\",\"nativeType\":null,\"relationName\":\"RubricToUser\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"uploads\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Upload\",\"nativeType\":null,\"relationName\":\"UploadToUser\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"Rubric\":{\"dbName\":\"rubrics\",\"schema\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"nativeType\":null,\"default\":{\"name\":\"uuid\",\"args\":[4]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"userId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"user\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"User\",\"nativeType\":null,\"relationName\":\"RubricToUser\",\"relationFromFields\":[\"userId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"255\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"description\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"Text\",[]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"criteria\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Json\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"nativeType\":null,\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"uploads\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Upload\",\"nativeType\":null,\"relationName\":\"RubricToUpload\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"Upload\":{\"dbName\":\"uploads\",\"schema\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"nativeType\":null,\"default\":{\"name\":\"uuid\",\"args\":[4]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"userId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"user\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"User\",\"nativeType\":null,\"relationName\":\"UploadToUser\",\"relationFromFields\":[\"userId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"rubricId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"rubric\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Rubric\",\"nativeType\":null,\"relationName\":\"RubricToUpload\",\"relationFromFields\":[\"rubricId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"originalFileName\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"storedFileKey\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"storageLocation\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"fileSize\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"mimeType\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"status\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"UploadStatus\",\"nativeType\":null,\"default\":\"not_started\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"result\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Json\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"nativeType\":null,\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":true}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false}},\"enums\":{\"UploadStatus\":{\"values\":[{\"name\":\"not_started\",\"dbName\":null},{\"name\":\"processing\",\"dbName\":null},{\"name\":\"completed\",\"dbName\":null},{\"name\":\"failed\",\"dbName\":null}],\"dbName\":null}},\"types\":{}}")
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
   * `prisma.rubric`: Exposes CRUD operations for the **Rubric** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Rubrics
    * const rubrics = await prisma.rubric.findMany()
    * ```
    */
  get rubric(): Prisma.RubricDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.upload`: Exposes CRUD operations for the **Upload** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Uploads
    * const uploads = await prisma.upload.findMany()
    * ```
    */
  get upload(): Prisma.UploadDelegate<ExtArgs, ClientOptions>;
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
    Rubric: 'Rubric',
    Upload: 'Upload'
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
      modelProps: "user" | "rubric" | "upload"
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
      Upload: {
        payload: Prisma.$UploadPayload<ExtArgs>
        fields: Prisma.UploadFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UploadFindUniqueArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UploadPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UploadFindUniqueOrThrowArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UploadPayload>
          }
          findFirst: {
            args: Prisma.UploadFindFirstArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UploadPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UploadFindFirstOrThrowArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UploadPayload>
          }
          findMany: {
            args: Prisma.UploadFindManyArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UploadPayload>[]
          }
          create: {
            args: Prisma.UploadCreateArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UploadPayload>
          }
          createMany: {
            args: Prisma.UploadCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UploadCreateManyAndReturnArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UploadPayload>[]
          }
          delete: {
            args: Prisma.UploadDeleteArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UploadPayload>
          }
          update: {
            args: Prisma.UploadUpdateArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UploadPayload>
          }
          deleteMany: {
            args: Prisma.UploadDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UploadUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UploadUpdateManyAndReturnArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UploadPayload>[]
          }
          upsert: {
            args: Prisma.UploadUpsertArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UploadPayload>
          }
          aggregate: {
            args: Prisma.UploadAggregateArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<AggregateUpload>
          }
          groupBy: {
            args: Prisma.UploadGroupByArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<UploadGroupByOutputType>[]
          }
          count: {
            args: Prisma.UploadCountArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<UploadCountAggregateOutputType> | number
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
    rubric?: RubricOmit
    upload?: UploadOmit
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
    rubrics: number
    uploads: number
  }

  export type UserCountOutputTypeSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    rubrics?: boolean | UserCountOutputTypeCountRubricsArgs
    uploads?: boolean | UserCountOutputTypeCountUploadsArgs
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
  export type UserCountOutputTypeCountRubricsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: RubricWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountUploadsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: UploadWhereInput
  }


  /**
   * Count Type RubricCountOutputType
   */

  export type RubricCountOutputType = {
    uploads: number
  }

  export type RubricCountOutputTypeSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    uploads?: boolean | RubricCountOutputTypeCountUploadsArgs
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
  export type RubricCountOutputTypeCountUploadsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: UploadWhereInput
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
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserMaxAggregateOutputType = {
    id: string | null
    email: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserCountAggregateOutputType = {
    id: number
    email: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type UserMinAggregateInputType = {
    id?: true
    email?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserMaxAggregateInputType = {
    id?: true
    email?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserCountAggregateInputType = {
    id?: true
    email?: true
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
    createdAt?: boolean
    updatedAt?: boolean
    rubrics?: boolean | User$rubricsArgs<ExtArgs>
    uploads?: boolean | User$uploadsArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>

  export type UserSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectScalar = {
    id?: boolean
    email?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type UserOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "email" | "createdAt" | "updatedAt", ExtArgs["result"]["user"]>
  export type UserInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    rubrics?: boolean | User$rubricsArgs<ExtArgs>
    uploads?: boolean | User$uploadsArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type UserIncludeCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {}
  export type UserIncludeUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {}

  export type $UserPayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "User"
    objects: {
      rubrics: Prisma.$RubricPayload<ExtArgs>[]
      uploads: Prisma.$UploadPayload<ExtArgs>[]
    }
    scalars: runtime.Types.Extensions.GetPayloadResult<{
      id: string
      email: string
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
    rubrics<T extends User$rubricsArgs<ExtArgs> = {}>(args?: Subset<T, User$rubricsArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$RubricPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    uploads<T extends User$uploadsArgs<ExtArgs> = {}>(args?: Subset<T, User$uploadsArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$UploadPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
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
   * User.rubrics
   */
  export type User$rubricsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
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
    where?: RubricWhereInput
    orderBy?: RubricOrderByWithRelationInput | RubricOrderByWithRelationInput[]
    cursor?: RubricWhereUniqueInput
    take?: number
    skip?: number
    distinct?: RubricScalarFieldEnum | RubricScalarFieldEnum[]
  }

  /**
   * User.uploads
   */
  export type User$uploadsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Upload
     */
    select?: UploadSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Upload
     */
    omit?: UploadOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadInclude<ExtArgs> | null
    where?: UploadWhereInput
    orderBy?: UploadOrderByWithRelationInput | UploadOrderByWithRelationInput[]
    cursor?: UploadWhereUniqueInput
    take?: number
    skip?: number
    distinct?: UploadScalarFieldEnum | UploadScalarFieldEnum[]
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
   * Model Rubric
   */

  export type AggregateRubric = {
    _count: RubricCountAggregateOutputType | null
    _min: RubricMinAggregateOutputType | null
    _max: RubricMaxAggregateOutputType | null
  }

  export type RubricMinAggregateOutputType = {
    id: string | null
    userId: string | null
    name: string | null
    description: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type RubricMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    name: string | null
    description: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type RubricCountAggregateOutputType = {
    id: number
    userId: number
    name: number
    description: number
    criteria: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type RubricMinAggregateInputType = {
    id?: true
    userId?: true
    name?: true
    description?: true
    createdAt?: true
    updatedAt?: true
  }

  export type RubricMaxAggregateInputType = {
    id?: true
    userId?: true
    name?: true
    description?: true
    createdAt?: true
    updatedAt?: true
  }

  export type RubricCountAggregateInputType = {
    id?: true
    userId?: true
    name?: true
    description?: true
    criteria?: true
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
    userId: string
    name: string
    description: string
    criteria: JsonValue
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
    userId?: boolean
    name?: boolean
    description?: boolean
    criteria?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    uploads?: boolean | Rubric$uploadsArgs<ExtArgs>
    _count?: boolean | RubricCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["rubric"]>

  export type RubricSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    name?: boolean
    description?: boolean
    criteria?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["rubric"]>

  export type RubricSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    name?: boolean
    description?: boolean
    criteria?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["rubric"]>

  export type RubricSelectScalar = {
    id?: boolean
    userId?: boolean
    name?: boolean
    description?: boolean
    criteria?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type RubricOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "userId" | "name" | "description" | "criteria" | "createdAt" | "updatedAt", ExtArgs["result"]["rubric"]>
  export type RubricInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    uploads?: boolean | Rubric$uploadsArgs<ExtArgs>
    _count?: boolean | RubricCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type RubricIncludeCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type RubricIncludeUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $RubricPayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "Rubric"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
      uploads: Prisma.$UploadPayload<ExtArgs>[]
    }
    scalars: runtime.Types.Extensions.GetPayloadResult<{
      id: string
      userId: string
      name: string
      description: string
      criteria: Prisma.JsonValue
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
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    uploads<T extends Rubric$uploadsArgs<ExtArgs> = {}>(args?: Subset<T, Rubric$uploadsArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$UploadPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
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
    readonly userId: FieldRef<"Rubric", 'String'>
    readonly name: FieldRef<"Rubric", 'String'>
    readonly description: FieldRef<"Rubric", 'String'>
    readonly criteria: FieldRef<"Rubric", 'Json'>
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
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RubricIncludeCreateManyAndReturn<ExtArgs> | null
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
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RubricIncludeUpdateManyAndReturn<ExtArgs> | null
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
   * Rubric.uploads
   */
  export type Rubric$uploadsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Upload
     */
    select?: UploadSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Upload
     */
    omit?: UploadOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadInclude<ExtArgs> | null
    where?: UploadWhereInput
    orderBy?: UploadOrderByWithRelationInput | UploadOrderByWithRelationInput[]
    cursor?: UploadWhereUniqueInput
    take?: number
    skip?: number
    distinct?: UploadScalarFieldEnum | UploadScalarFieldEnum[]
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
   * Model Upload
   */

  export type AggregateUpload = {
    _count: UploadCountAggregateOutputType | null
    _avg: UploadAvgAggregateOutputType | null
    _sum: UploadSumAggregateOutputType | null
    _min: UploadMinAggregateOutputType | null
    _max: UploadMaxAggregateOutputType | null
  }

  export type UploadAvgAggregateOutputType = {
    fileSize: number | null
  }

  export type UploadSumAggregateOutputType = {
    fileSize: number | null
  }

  export type UploadMinAggregateOutputType = {
    id: string | null
    userId: string | null
    rubricId: string | null
    originalFileName: string | null
    storedFileKey: string | null
    storageLocation: string | null
    fileSize: number | null
    mimeType: string | null
    status: $Enums.UploadStatus | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UploadMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    rubricId: string | null
    originalFileName: string | null
    storedFileKey: string | null
    storageLocation: string | null
    fileSize: number | null
    mimeType: string | null
    status: $Enums.UploadStatus | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UploadCountAggregateOutputType = {
    id: number
    userId: number
    rubricId: number
    originalFileName: number
    storedFileKey: number
    storageLocation: number
    fileSize: number
    mimeType: number
    status: number
    result: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type UploadAvgAggregateInputType = {
    fileSize?: true
  }

  export type UploadSumAggregateInputType = {
    fileSize?: true
  }

  export type UploadMinAggregateInputType = {
    id?: true
    userId?: true
    rubricId?: true
    originalFileName?: true
    storedFileKey?: true
    storageLocation?: true
    fileSize?: true
    mimeType?: true
    status?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UploadMaxAggregateInputType = {
    id?: true
    userId?: true
    rubricId?: true
    originalFileName?: true
    storedFileKey?: true
    storageLocation?: true
    fileSize?: true
    mimeType?: true
    status?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UploadCountAggregateInputType = {
    id?: true
    userId?: true
    rubricId?: true
    originalFileName?: true
    storedFileKey?: true
    storageLocation?: true
    fileSize?: true
    mimeType?: true
    status?: true
    result?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type UploadAggregateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which Upload to aggregate.
     */
    where?: UploadWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Uploads to fetch.
     */
    orderBy?: UploadOrderByWithRelationInput | UploadOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UploadWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Uploads from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Uploads.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Uploads
    **/
    _count?: true | UploadCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: UploadAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: UploadSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UploadMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UploadMaxAggregateInputType
  }

  export type GetUploadAggregateType<T extends UploadAggregateArgs> = {
        [P in keyof T & keyof AggregateUpload]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUpload[P]>
      : GetScalarType<T[P], AggregateUpload[P]>
  }




  export type UploadGroupByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: UploadWhereInput
    orderBy?: UploadOrderByWithAggregationInput | UploadOrderByWithAggregationInput[]
    by: UploadScalarFieldEnum[] | UploadScalarFieldEnum
    having?: UploadScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UploadCountAggregateInputType | true
    _avg?: UploadAvgAggregateInputType
    _sum?: UploadSumAggregateInputType
    _min?: UploadMinAggregateInputType
    _max?: UploadMaxAggregateInputType
  }

  export type UploadGroupByOutputType = {
    id: string
    userId: string
    rubricId: string
    originalFileName: string
    storedFileKey: string
    storageLocation: string
    fileSize: number
    mimeType: string
    status: $Enums.UploadStatus
    result: JsonValue | null
    createdAt: Date
    updatedAt: Date
    _count: UploadCountAggregateOutputType | null
    _avg: UploadAvgAggregateOutputType | null
    _sum: UploadSumAggregateOutputType | null
    _min: UploadMinAggregateOutputType | null
    _max: UploadMaxAggregateOutputType | null
  }

  type GetUploadGroupByPayload<T extends UploadGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UploadGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UploadGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UploadGroupByOutputType[P]>
            : GetScalarType<T[P], UploadGroupByOutputType[P]>
        }
      >
    >


  export type UploadSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    rubricId?: boolean
    originalFileName?: boolean
    storedFileKey?: boolean
    storageLocation?: boolean
    fileSize?: boolean
    mimeType?: boolean
    status?: boolean
    result?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    rubric?: boolean | RubricDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["upload"]>

  export type UploadSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    rubricId?: boolean
    originalFileName?: boolean
    storedFileKey?: boolean
    storageLocation?: boolean
    fileSize?: boolean
    mimeType?: boolean
    status?: boolean
    result?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    rubric?: boolean | RubricDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["upload"]>

  export type UploadSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    rubricId?: boolean
    originalFileName?: boolean
    storedFileKey?: boolean
    storageLocation?: boolean
    fileSize?: boolean
    mimeType?: boolean
    status?: boolean
    result?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    rubric?: boolean | RubricDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["upload"]>

  export type UploadSelectScalar = {
    id?: boolean
    userId?: boolean
    rubricId?: boolean
    originalFileName?: boolean
    storedFileKey?: boolean
    storageLocation?: boolean
    fileSize?: boolean
    mimeType?: boolean
    status?: boolean
    result?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type UploadOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "userId" | "rubricId" | "originalFileName" | "storedFileKey" | "storageLocation" | "fileSize" | "mimeType" | "status" | "result" | "createdAt" | "updatedAt", ExtArgs["result"]["upload"]>
  export type UploadInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    rubric?: boolean | RubricDefaultArgs<ExtArgs>
  }
  export type UploadIncludeCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    rubric?: boolean | RubricDefaultArgs<ExtArgs>
  }
  export type UploadIncludeUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    rubric?: boolean | RubricDefaultArgs<ExtArgs>
  }

  export type $UploadPayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "Upload"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
      rubric: Prisma.$RubricPayload<ExtArgs>
    }
    scalars: runtime.Types.Extensions.GetPayloadResult<{
      id: string
      userId: string
      rubricId: string
      originalFileName: string
      storedFileKey: string
      storageLocation: string
      fileSize: number
      mimeType: string
      status: $Enums.UploadStatus
      result: Prisma.JsonValue | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["upload"]>
    composites: {}
  }

  export type UploadGetPayload<S extends boolean | null | undefined | UploadDefaultArgs> = runtime.Types.Result.GetResult<Prisma.$UploadPayload, S>

  export type UploadCountArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> =
    Omit<UploadFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UploadCountAggregateInputType | true
    }

  export interface UploadDelegate<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Upload'], meta: { name: 'Upload' } }
    /**
     * Find zero or one Upload that matches the filter.
     * @param {UploadFindUniqueArgs} args - Arguments to find a Upload
     * @example
     * // Get one Upload
     * const upload = await prisma.upload.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UploadFindUniqueArgs>(args: SelectSubset<T, UploadFindUniqueArgs<ExtArgs>>): Prisma__UploadClient<runtime.Types.Result.GetResult<Prisma.$UploadPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Upload that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UploadFindUniqueOrThrowArgs} args - Arguments to find a Upload
     * @example
     * // Get one Upload
     * const upload = await prisma.upload.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UploadFindUniqueOrThrowArgs>(args: SelectSubset<T, UploadFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UploadClient<runtime.Types.Result.GetResult<Prisma.$UploadPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Upload that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UploadFindFirstArgs} args - Arguments to find a Upload
     * @example
     * // Get one Upload
     * const upload = await prisma.upload.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UploadFindFirstArgs>(args?: SelectSubset<T, UploadFindFirstArgs<ExtArgs>>): Prisma__UploadClient<runtime.Types.Result.GetResult<Prisma.$UploadPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Upload that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UploadFindFirstOrThrowArgs} args - Arguments to find a Upload
     * @example
     * // Get one Upload
     * const upload = await prisma.upload.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UploadFindFirstOrThrowArgs>(args?: SelectSubset<T, UploadFindFirstOrThrowArgs<ExtArgs>>): Prisma__UploadClient<runtime.Types.Result.GetResult<Prisma.$UploadPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Uploads that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UploadFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Uploads
     * const uploads = await prisma.upload.findMany()
     * 
     * // Get first 10 Uploads
     * const uploads = await prisma.upload.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const uploadWithIdOnly = await prisma.upload.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UploadFindManyArgs>(args?: SelectSubset<T, UploadFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$UploadPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Upload.
     * @param {UploadCreateArgs} args - Arguments to create a Upload.
     * @example
     * // Create one Upload
     * const Upload = await prisma.upload.create({
     *   data: {
     *     // ... data to create a Upload
     *   }
     * })
     * 
     */
    create<T extends UploadCreateArgs>(args: SelectSubset<T, UploadCreateArgs<ExtArgs>>): Prisma__UploadClient<runtime.Types.Result.GetResult<Prisma.$UploadPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Uploads.
     * @param {UploadCreateManyArgs} args - Arguments to create many Uploads.
     * @example
     * // Create many Uploads
     * const upload = await prisma.upload.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UploadCreateManyArgs>(args?: SelectSubset<T, UploadCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Uploads and returns the data saved in the database.
     * @param {UploadCreateManyAndReturnArgs} args - Arguments to create many Uploads.
     * @example
     * // Create many Uploads
     * const upload = await prisma.upload.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Uploads and only return the `id`
     * const uploadWithIdOnly = await prisma.upload.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UploadCreateManyAndReturnArgs>(args?: SelectSubset<T, UploadCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$UploadPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Upload.
     * @param {UploadDeleteArgs} args - Arguments to delete one Upload.
     * @example
     * // Delete one Upload
     * const Upload = await prisma.upload.delete({
     *   where: {
     *     // ... filter to delete one Upload
     *   }
     * })
     * 
     */
    delete<T extends UploadDeleteArgs>(args: SelectSubset<T, UploadDeleteArgs<ExtArgs>>): Prisma__UploadClient<runtime.Types.Result.GetResult<Prisma.$UploadPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Upload.
     * @param {UploadUpdateArgs} args - Arguments to update one Upload.
     * @example
     * // Update one Upload
     * const upload = await prisma.upload.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UploadUpdateArgs>(args: SelectSubset<T, UploadUpdateArgs<ExtArgs>>): Prisma__UploadClient<runtime.Types.Result.GetResult<Prisma.$UploadPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Uploads.
     * @param {UploadDeleteManyArgs} args - Arguments to filter Uploads to delete.
     * @example
     * // Delete a few Uploads
     * const { count } = await prisma.upload.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UploadDeleteManyArgs>(args?: SelectSubset<T, UploadDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Uploads.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UploadUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Uploads
     * const upload = await prisma.upload.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UploadUpdateManyArgs>(args: SelectSubset<T, UploadUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Uploads and returns the data updated in the database.
     * @param {UploadUpdateManyAndReturnArgs} args - Arguments to update many Uploads.
     * @example
     * // Update many Uploads
     * const upload = await prisma.upload.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Uploads and only return the `id`
     * const uploadWithIdOnly = await prisma.upload.updateManyAndReturn({
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
    updateManyAndReturn<T extends UploadUpdateManyAndReturnArgs>(args: SelectSubset<T, UploadUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$UploadPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Upload.
     * @param {UploadUpsertArgs} args - Arguments to update or create a Upload.
     * @example
     * // Update or create a Upload
     * const upload = await prisma.upload.upsert({
     *   create: {
     *     // ... data to create a Upload
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Upload we want to update
     *   }
     * })
     */
    upsert<T extends UploadUpsertArgs>(args: SelectSubset<T, UploadUpsertArgs<ExtArgs>>): Prisma__UploadClient<runtime.Types.Result.GetResult<Prisma.$UploadPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Uploads.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UploadCountArgs} args - Arguments to filter Uploads to count.
     * @example
     * // Count the number of Uploads
     * const count = await prisma.upload.count({
     *   where: {
     *     // ... the filter for the Uploads we want to count
     *   }
     * })
    **/
    count<T extends UploadCountArgs>(
      args?: Subset<T, UploadCountArgs>,
    ): Prisma.PrismaPromise<
      T extends runtime.Types.Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UploadCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Upload.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UploadAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends UploadAggregateArgs>(args: Subset<T, UploadAggregateArgs>): Prisma.PrismaPromise<GetUploadAggregateType<T>>

    /**
     * Group by Upload.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UploadGroupByArgs} args - Group by arguments.
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
      T extends UploadGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UploadGroupByArgs['orderBy'] }
        : { orderBy?: UploadGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, UploadGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUploadGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Upload model
   */
  readonly fields: UploadFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Upload.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UploadClient<T, Null = never, ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
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
   * Fields of the Upload model
   */
  export interface UploadFieldRefs {
    readonly id: FieldRef<"Upload", 'String'>
    readonly userId: FieldRef<"Upload", 'String'>
    readonly rubricId: FieldRef<"Upload", 'String'>
    readonly originalFileName: FieldRef<"Upload", 'String'>
    readonly storedFileKey: FieldRef<"Upload", 'String'>
    readonly storageLocation: FieldRef<"Upload", 'String'>
    readonly fileSize: FieldRef<"Upload", 'Int'>
    readonly mimeType: FieldRef<"Upload", 'String'>
    readonly status: FieldRef<"Upload", 'UploadStatus'>
    readonly result: FieldRef<"Upload", 'Json'>
    readonly createdAt: FieldRef<"Upload", 'DateTime'>
    readonly updatedAt: FieldRef<"Upload", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Upload findUnique
   */
  export type UploadFindUniqueArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Upload
     */
    select?: UploadSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Upload
     */
    omit?: UploadOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadInclude<ExtArgs> | null
    /**
     * Filter, which Upload to fetch.
     */
    where: UploadWhereUniqueInput
  }

  /**
   * Upload findUniqueOrThrow
   */
  export type UploadFindUniqueOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Upload
     */
    select?: UploadSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Upload
     */
    omit?: UploadOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadInclude<ExtArgs> | null
    /**
     * Filter, which Upload to fetch.
     */
    where: UploadWhereUniqueInput
  }

  /**
   * Upload findFirst
   */
  export type UploadFindFirstArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Upload
     */
    select?: UploadSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Upload
     */
    omit?: UploadOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadInclude<ExtArgs> | null
    /**
     * Filter, which Upload to fetch.
     */
    where?: UploadWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Uploads to fetch.
     */
    orderBy?: UploadOrderByWithRelationInput | UploadOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Uploads.
     */
    cursor?: UploadWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Uploads from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Uploads.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Uploads.
     */
    distinct?: UploadScalarFieldEnum | UploadScalarFieldEnum[]
  }

  /**
   * Upload findFirstOrThrow
   */
  export type UploadFindFirstOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Upload
     */
    select?: UploadSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Upload
     */
    omit?: UploadOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadInclude<ExtArgs> | null
    /**
     * Filter, which Upload to fetch.
     */
    where?: UploadWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Uploads to fetch.
     */
    orderBy?: UploadOrderByWithRelationInput | UploadOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Uploads.
     */
    cursor?: UploadWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Uploads from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Uploads.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Uploads.
     */
    distinct?: UploadScalarFieldEnum | UploadScalarFieldEnum[]
  }

  /**
   * Upload findMany
   */
  export type UploadFindManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Upload
     */
    select?: UploadSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Upload
     */
    omit?: UploadOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadInclude<ExtArgs> | null
    /**
     * Filter, which Uploads to fetch.
     */
    where?: UploadWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Uploads to fetch.
     */
    orderBy?: UploadOrderByWithRelationInput | UploadOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Uploads.
     */
    cursor?: UploadWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Uploads from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Uploads.
     */
    skip?: number
    distinct?: UploadScalarFieldEnum | UploadScalarFieldEnum[]
  }

  /**
   * Upload create
   */
  export type UploadCreateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Upload
     */
    select?: UploadSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Upload
     */
    omit?: UploadOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadInclude<ExtArgs> | null
    /**
     * The data needed to create a Upload.
     */
    data: XOR<UploadCreateInput, UploadUncheckedCreateInput>
  }

  /**
   * Upload createMany
   */
  export type UploadCreateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to create many Uploads.
     */
    data: UploadCreateManyInput | UploadCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Upload createManyAndReturn
   */
  export type UploadCreateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Upload
     */
    select?: UploadSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Upload
     */
    omit?: UploadOmit<ExtArgs> | null
    /**
     * The data used to create many Uploads.
     */
    data: UploadCreateManyInput | UploadCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Upload update
   */
  export type UploadUpdateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Upload
     */
    select?: UploadSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Upload
     */
    omit?: UploadOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadInclude<ExtArgs> | null
    /**
     * The data needed to update a Upload.
     */
    data: XOR<UploadUpdateInput, UploadUncheckedUpdateInput>
    /**
     * Choose, which Upload to update.
     */
    where: UploadWhereUniqueInput
  }

  /**
   * Upload updateMany
   */
  export type UploadUpdateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to update Uploads.
     */
    data: XOR<UploadUpdateManyMutationInput, UploadUncheckedUpdateManyInput>
    /**
     * Filter which Uploads to update
     */
    where?: UploadWhereInput
    /**
     * Limit how many Uploads to update.
     */
    limit?: number
  }

  /**
   * Upload updateManyAndReturn
   */
  export type UploadUpdateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Upload
     */
    select?: UploadSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Upload
     */
    omit?: UploadOmit<ExtArgs> | null
    /**
     * The data used to update Uploads.
     */
    data: XOR<UploadUpdateManyMutationInput, UploadUncheckedUpdateManyInput>
    /**
     * Filter which Uploads to update
     */
    where?: UploadWhereInput
    /**
     * Limit how many Uploads to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Upload upsert
   */
  export type UploadUpsertArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Upload
     */
    select?: UploadSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Upload
     */
    omit?: UploadOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadInclude<ExtArgs> | null
    /**
     * The filter to search for the Upload to update in case it exists.
     */
    where: UploadWhereUniqueInput
    /**
     * In case the Upload found by the `where` argument doesn't exist, create a new Upload with this data.
     */
    create: XOR<UploadCreateInput, UploadUncheckedCreateInput>
    /**
     * In case the Upload was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UploadUpdateInput, UploadUncheckedUpdateInput>
  }

  /**
   * Upload delete
   */
  export type UploadDeleteArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Upload
     */
    select?: UploadSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Upload
     */
    omit?: UploadOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadInclude<ExtArgs> | null
    /**
     * Filter which Upload to delete.
     */
    where: UploadWhereUniqueInput
  }

  /**
   * Upload deleteMany
   */
  export type UploadDeleteManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which Uploads to delete
     */
    where?: UploadWhereInput
    /**
     * Limit how many Uploads to delete.
     */
    limit?: number
  }

  /**
   * Upload without action
   */
  export type UploadDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Upload
     */
    select?: UploadSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Upload
     */
    omit?: UploadOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadInclude<ExtArgs> | null
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
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  } as const

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const RubricScalarFieldEnum = {
    id: 'id',
    userId: 'userId',
    name: 'name',
    description: 'description',
    criteria: 'criteria',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  } as const

  export type RubricScalarFieldEnum = (typeof RubricScalarFieldEnum)[keyof typeof RubricScalarFieldEnum]


  export const UploadScalarFieldEnum = {
    id: 'id',
    userId: 'userId',
    rubricId: 'rubricId',
    originalFileName: 'originalFileName',
    storedFileKey: 'storedFileKey',
    storageLocation: 'storageLocation',
    fileSize: 'fileSize',
    mimeType: 'mimeType',
    status: 'status',
    result: 'result',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  } as const

  export type UploadScalarFieldEnum = (typeof UploadScalarFieldEnum)[keyof typeof UploadScalarFieldEnum]


  export const SortOrder = {
    asc: 'asc',
    desc: 'desc'
  } as const

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const JsonNullValueInput = {
    JsonNull: JsonNull
  } as const

  export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput]


  export const NullableJsonNullValueInput = {
    DbNull: DbNull,
    JsonNull: JsonNull
  } as const

  export type NullableJsonNullValueInput = (typeof NullableJsonNullValueInput)[keyof typeof NullableJsonNullValueInput]


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
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'QueryMode'
   */
  export type EnumQueryModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QueryMode'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'UploadStatus'
   */
  export type EnumUploadStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'UploadStatus'>
    


  /**
   * Reference to a field of type 'UploadStatus[]'
   */
  export type ListEnumUploadStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'UploadStatus[]'>
    


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
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    rubrics?: RubricListRelationFilter
    uploads?: UploadListRelationFilter
  }

  export type UserOrderByWithRelationInput = {
    id?: SortOrder
    email?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    rubrics?: RubricOrderByRelationAggregateInput
    uploads?: UploadOrderByRelationAggregateInput
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    email?: string
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    rubrics?: RubricListRelationFilter
    uploads?: UploadListRelationFilter
  }, "id" | "email">

  export type UserOrderByWithAggregationInput = {
    id?: SortOrder
    email?: SortOrder
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
    createdAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
  }

  export type RubricWhereInput = {
    AND?: RubricWhereInput | RubricWhereInput[]
    OR?: RubricWhereInput[]
    NOT?: RubricWhereInput | RubricWhereInput[]
    id?: StringFilter<"Rubric"> | string
    userId?: StringFilter<"Rubric"> | string
    name?: StringFilter<"Rubric"> | string
    description?: StringFilter<"Rubric"> | string
    criteria?: JsonFilter<"Rubric">
    createdAt?: DateTimeFilter<"Rubric"> | Date | string
    updatedAt?: DateTimeFilter<"Rubric"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    uploads?: UploadListRelationFilter
  }

  export type RubricOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    description?: SortOrder
    criteria?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    user?: UserOrderByWithRelationInput
    uploads?: UploadOrderByRelationAggregateInput
  }

  export type RubricWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: RubricWhereInput | RubricWhereInput[]
    OR?: RubricWhereInput[]
    NOT?: RubricWhereInput | RubricWhereInput[]
    userId?: StringFilter<"Rubric"> | string
    name?: StringFilter<"Rubric"> | string
    description?: StringFilter<"Rubric"> | string
    criteria?: JsonFilter<"Rubric">
    createdAt?: DateTimeFilter<"Rubric"> | Date | string
    updatedAt?: DateTimeFilter<"Rubric"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    uploads?: UploadListRelationFilter
  }, "id">

  export type RubricOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    description?: SortOrder
    criteria?: SortOrder
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
    userId?: StringWithAggregatesFilter<"Rubric"> | string
    name?: StringWithAggregatesFilter<"Rubric"> | string
    description?: StringWithAggregatesFilter<"Rubric"> | string
    criteria?: JsonWithAggregatesFilter<"Rubric">
    createdAt?: DateTimeWithAggregatesFilter<"Rubric"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Rubric"> | Date | string
  }

  export type UploadWhereInput = {
    AND?: UploadWhereInput | UploadWhereInput[]
    OR?: UploadWhereInput[]
    NOT?: UploadWhereInput | UploadWhereInput[]
    id?: StringFilter<"Upload"> | string
    userId?: StringFilter<"Upload"> | string
    rubricId?: StringFilter<"Upload"> | string
    originalFileName?: StringFilter<"Upload"> | string
    storedFileKey?: StringFilter<"Upload"> | string
    storageLocation?: StringFilter<"Upload"> | string
    fileSize?: IntFilter<"Upload"> | number
    mimeType?: StringFilter<"Upload"> | string
    status?: EnumUploadStatusFilter<"Upload"> | $Enums.UploadStatus
    result?: JsonNullableFilter<"Upload">
    createdAt?: DateTimeFilter<"Upload"> | Date | string
    updatedAt?: DateTimeFilter<"Upload"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    rubric?: XOR<RubricScalarRelationFilter, RubricWhereInput>
  }

  export type UploadOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    rubricId?: SortOrder
    originalFileName?: SortOrder
    storedFileKey?: SortOrder
    storageLocation?: SortOrder
    fileSize?: SortOrder
    mimeType?: SortOrder
    status?: SortOrder
    result?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    user?: UserOrderByWithRelationInput
    rubric?: RubricOrderByWithRelationInput
  }

  export type UploadWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    storedFileKey?: string
    AND?: UploadWhereInput | UploadWhereInput[]
    OR?: UploadWhereInput[]
    NOT?: UploadWhereInput | UploadWhereInput[]
    userId?: StringFilter<"Upload"> | string
    rubricId?: StringFilter<"Upload"> | string
    originalFileName?: StringFilter<"Upload"> | string
    storageLocation?: StringFilter<"Upload"> | string
    fileSize?: IntFilter<"Upload"> | number
    mimeType?: StringFilter<"Upload"> | string
    status?: EnumUploadStatusFilter<"Upload"> | $Enums.UploadStatus
    result?: JsonNullableFilter<"Upload">
    createdAt?: DateTimeFilter<"Upload"> | Date | string
    updatedAt?: DateTimeFilter<"Upload"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    rubric?: XOR<RubricScalarRelationFilter, RubricWhereInput>
  }, "id" | "storedFileKey">

  export type UploadOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    rubricId?: SortOrder
    originalFileName?: SortOrder
    storedFileKey?: SortOrder
    storageLocation?: SortOrder
    fileSize?: SortOrder
    mimeType?: SortOrder
    status?: SortOrder
    result?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: UploadCountOrderByAggregateInput
    _avg?: UploadAvgOrderByAggregateInput
    _max?: UploadMaxOrderByAggregateInput
    _min?: UploadMinOrderByAggregateInput
    _sum?: UploadSumOrderByAggregateInput
  }

  export type UploadScalarWhereWithAggregatesInput = {
    AND?: UploadScalarWhereWithAggregatesInput | UploadScalarWhereWithAggregatesInput[]
    OR?: UploadScalarWhereWithAggregatesInput[]
    NOT?: UploadScalarWhereWithAggregatesInput | UploadScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Upload"> | string
    userId?: StringWithAggregatesFilter<"Upload"> | string
    rubricId?: StringWithAggregatesFilter<"Upload"> | string
    originalFileName?: StringWithAggregatesFilter<"Upload"> | string
    storedFileKey?: StringWithAggregatesFilter<"Upload"> | string
    storageLocation?: StringWithAggregatesFilter<"Upload"> | string
    fileSize?: IntWithAggregatesFilter<"Upload"> | number
    mimeType?: StringWithAggregatesFilter<"Upload"> | string
    status?: EnumUploadStatusWithAggregatesFilter<"Upload"> | $Enums.UploadStatus
    result?: JsonNullableWithAggregatesFilter<"Upload">
    createdAt?: DateTimeWithAggregatesFilter<"Upload"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Upload"> | Date | string
  }

  export type UserCreateInput = {
    id?: string
    email: string
    createdAt?: Date | string
    updatedAt?: Date | string
    rubrics?: RubricCreateNestedManyWithoutUserInput
    uploads?: UploadCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateInput = {
    id?: string
    email: string
    createdAt?: Date | string
    updatedAt?: Date | string
    rubrics?: RubricUncheckedCreateNestedManyWithoutUserInput
    uploads?: UploadUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rubrics?: RubricUpdateManyWithoutUserNestedInput
    uploads?: UploadUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rubrics?: RubricUncheckedUpdateManyWithoutUserNestedInput
    uploads?: UploadUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserCreateManyInput = {
    id?: string
    email: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RubricCreateInput = {
    id?: string
    name: string
    description: string
    criteria: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutRubricsInput
    uploads?: UploadCreateNestedManyWithoutRubricInput
  }

  export type RubricUncheckedCreateInput = {
    id?: string
    userId: string
    name: string
    description: string
    criteria: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    uploads?: UploadUncheckedCreateNestedManyWithoutRubricInput
  }

  export type RubricUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    criteria?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutRubricsNestedInput
    uploads?: UploadUpdateManyWithoutRubricNestedInput
  }

  export type RubricUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    criteria?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    uploads?: UploadUncheckedUpdateManyWithoutRubricNestedInput
  }

  export type RubricCreateManyInput = {
    id?: string
    userId: string
    name: string
    description: string
    criteria: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RubricUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    criteria?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RubricUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    criteria?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UploadCreateInput = {
    id?: string
    originalFileName: string
    storedFileKey: string
    storageLocation: string
    fileSize: number
    mimeType: string
    status?: $Enums.UploadStatus
    result?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutUploadsInput
    rubric: RubricCreateNestedOneWithoutUploadsInput
  }

  export type UploadUncheckedCreateInput = {
    id?: string
    userId: string
    rubricId: string
    originalFileName: string
    storedFileKey: string
    storageLocation: string
    fileSize: number
    mimeType: string
    status?: $Enums.UploadStatus
    result?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UploadUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    originalFileName?: StringFieldUpdateOperationsInput | string
    storedFileKey?: StringFieldUpdateOperationsInput | string
    storageLocation?: StringFieldUpdateOperationsInput | string
    fileSize?: IntFieldUpdateOperationsInput | number
    mimeType?: StringFieldUpdateOperationsInput | string
    status?: EnumUploadStatusFieldUpdateOperationsInput | $Enums.UploadStatus
    result?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutUploadsNestedInput
    rubric?: RubricUpdateOneRequiredWithoutUploadsNestedInput
  }

  export type UploadUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    rubricId?: StringFieldUpdateOperationsInput | string
    originalFileName?: StringFieldUpdateOperationsInput | string
    storedFileKey?: StringFieldUpdateOperationsInput | string
    storageLocation?: StringFieldUpdateOperationsInput | string
    fileSize?: IntFieldUpdateOperationsInput | number
    mimeType?: StringFieldUpdateOperationsInput | string
    status?: EnumUploadStatusFieldUpdateOperationsInput | $Enums.UploadStatus
    result?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UploadCreateManyInput = {
    id?: string
    userId: string
    rubricId: string
    originalFileName: string
    storedFileKey: string
    storageLocation: string
    fileSize: number
    mimeType: string
    status?: $Enums.UploadStatus
    result?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UploadUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    originalFileName?: StringFieldUpdateOperationsInput | string
    storedFileKey?: StringFieldUpdateOperationsInput | string
    storageLocation?: StringFieldUpdateOperationsInput | string
    fileSize?: IntFieldUpdateOperationsInput | number
    mimeType?: StringFieldUpdateOperationsInput | string
    status?: EnumUploadStatusFieldUpdateOperationsInput | $Enums.UploadStatus
    result?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UploadUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    rubricId?: StringFieldUpdateOperationsInput | string
    originalFileName?: StringFieldUpdateOperationsInput | string
    storedFileKey?: StringFieldUpdateOperationsInput | string
    storageLocation?: StringFieldUpdateOperationsInput | string
    fileSize?: IntFieldUpdateOperationsInput | number
    mimeType?: StringFieldUpdateOperationsInput | string
    status?: EnumUploadStatusFieldUpdateOperationsInput | $Enums.UploadStatus
    result?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
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

  export type RubricListRelationFilter = {
    every?: RubricWhereInput
    some?: RubricWhereInput
    none?: RubricWhereInput
  }

  export type UploadListRelationFilter = {
    every?: UploadWhereInput
    some?: UploadWhereInput
    none?: UploadWhereInput
  }

  export type RubricOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UploadOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UserCountOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
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

  export type UserScalarRelationFilter = {
    is?: UserWhereInput
    isNot?: UserWhereInput
  }

  export type RubricCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    description?: SortOrder
    criteria?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RubricMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    description?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RubricMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    description?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
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

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type EnumUploadStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.UploadStatus | EnumUploadStatusFieldRefInput<$PrismaModel>
    in?: $Enums.UploadStatus[] | ListEnumUploadStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.UploadStatus[] | ListEnumUploadStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumUploadStatusFilter<$PrismaModel> | $Enums.UploadStatus
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

  export type RubricScalarRelationFilter = {
    is?: RubricWhereInput
    isNot?: RubricWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type UploadCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    rubricId?: SortOrder
    originalFileName?: SortOrder
    storedFileKey?: SortOrder
    storageLocation?: SortOrder
    fileSize?: SortOrder
    mimeType?: SortOrder
    status?: SortOrder
    result?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UploadAvgOrderByAggregateInput = {
    fileSize?: SortOrder
  }

  export type UploadMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    rubricId?: SortOrder
    originalFileName?: SortOrder
    storedFileKey?: SortOrder
    storageLocation?: SortOrder
    fileSize?: SortOrder
    mimeType?: SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UploadMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    rubricId?: SortOrder
    originalFileName?: SortOrder
    storedFileKey?: SortOrder
    storageLocation?: SortOrder
    fileSize?: SortOrder
    mimeType?: SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UploadSumOrderByAggregateInput = {
    fileSize?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type EnumUploadStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.UploadStatus | EnumUploadStatusFieldRefInput<$PrismaModel>
    in?: $Enums.UploadStatus[] | ListEnumUploadStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.UploadStatus[] | ListEnumUploadStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumUploadStatusWithAggregatesFilter<$PrismaModel> | $Enums.UploadStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumUploadStatusFilter<$PrismaModel>
    _max?: NestedEnumUploadStatusFilter<$PrismaModel>
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

  export type RubricCreateNestedManyWithoutUserInput = {
    create?: XOR<RubricCreateWithoutUserInput, RubricUncheckedCreateWithoutUserInput> | RubricCreateWithoutUserInput[] | RubricUncheckedCreateWithoutUserInput[]
    connectOrCreate?: RubricCreateOrConnectWithoutUserInput | RubricCreateOrConnectWithoutUserInput[]
    createMany?: RubricCreateManyUserInputEnvelope
    connect?: RubricWhereUniqueInput | RubricWhereUniqueInput[]
  }

  export type UploadCreateNestedManyWithoutUserInput = {
    create?: XOR<UploadCreateWithoutUserInput, UploadUncheckedCreateWithoutUserInput> | UploadCreateWithoutUserInput[] | UploadUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UploadCreateOrConnectWithoutUserInput | UploadCreateOrConnectWithoutUserInput[]
    createMany?: UploadCreateManyUserInputEnvelope
    connect?: UploadWhereUniqueInput | UploadWhereUniqueInput[]
  }

  export type RubricUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<RubricCreateWithoutUserInput, RubricUncheckedCreateWithoutUserInput> | RubricCreateWithoutUserInput[] | RubricUncheckedCreateWithoutUserInput[]
    connectOrCreate?: RubricCreateOrConnectWithoutUserInput | RubricCreateOrConnectWithoutUserInput[]
    createMany?: RubricCreateManyUserInputEnvelope
    connect?: RubricWhereUniqueInput | RubricWhereUniqueInput[]
  }

  export type UploadUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<UploadCreateWithoutUserInput, UploadUncheckedCreateWithoutUserInput> | UploadCreateWithoutUserInput[] | UploadUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UploadCreateOrConnectWithoutUserInput | UploadCreateOrConnectWithoutUserInput[]
    createMany?: UploadCreateManyUserInputEnvelope
    connect?: UploadWhereUniqueInput | UploadWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type RubricUpdateManyWithoutUserNestedInput = {
    create?: XOR<RubricCreateWithoutUserInput, RubricUncheckedCreateWithoutUserInput> | RubricCreateWithoutUserInput[] | RubricUncheckedCreateWithoutUserInput[]
    connectOrCreate?: RubricCreateOrConnectWithoutUserInput | RubricCreateOrConnectWithoutUserInput[]
    upsert?: RubricUpsertWithWhereUniqueWithoutUserInput | RubricUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: RubricCreateManyUserInputEnvelope
    set?: RubricWhereUniqueInput | RubricWhereUniqueInput[]
    disconnect?: RubricWhereUniqueInput | RubricWhereUniqueInput[]
    delete?: RubricWhereUniqueInput | RubricWhereUniqueInput[]
    connect?: RubricWhereUniqueInput | RubricWhereUniqueInput[]
    update?: RubricUpdateWithWhereUniqueWithoutUserInput | RubricUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: RubricUpdateManyWithWhereWithoutUserInput | RubricUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: RubricScalarWhereInput | RubricScalarWhereInput[]
  }

  export type UploadUpdateManyWithoutUserNestedInput = {
    create?: XOR<UploadCreateWithoutUserInput, UploadUncheckedCreateWithoutUserInput> | UploadCreateWithoutUserInput[] | UploadUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UploadCreateOrConnectWithoutUserInput | UploadCreateOrConnectWithoutUserInput[]
    upsert?: UploadUpsertWithWhereUniqueWithoutUserInput | UploadUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: UploadCreateManyUserInputEnvelope
    set?: UploadWhereUniqueInput | UploadWhereUniqueInput[]
    disconnect?: UploadWhereUniqueInput | UploadWhereUniqueInput[]
    delete?: UploadWhereUniqueInput | UploadWhereUniqueInput[]
    connect?: UploadWhereUniqueInput | UploadWhereUniqueInput[]
    update?: UploadUpdateWithWhereUniqueWithoutUserInput | UploadUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: UploadUpdateManyWithWhereWithoutUserInput | UploadUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: UploadScalarWhereInput | UploadScalarWhereInput[]
  }

  export type RubricUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<RubricCreateWithoutUserInput, RubricUncheckedCreateWithoutUserInput> | RubricCreateWithoutUserInput[] | RubricUncheckedCreateWithoutUserInput[]
    connectOrCreate?: RubricCreateOrConnectWithoutUserInput | RubricCreateOrConnectWithoutUserInput[]
    upsert?: RubricUpsertWithWhereUniqueWithoutUserInput | RubricUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: RubricCreateManyUserInputEnvelope
    set?: RubricWhereUniqueInput | RubricWhereUniqueInput[]
    disconnect?: RubricWhereUniqueInput | RubricWhereUniqueInput[]
    delete?: RubricWhereUniqueInput | RubricWhereUniqueInput[]
    connect?: RubricWhereUniqueInput | RubricWhereUniqueInput[]
    update?: RubricUpdateWithWhereUniqueWithoutUserInput | RubricUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: RubricUpdateManyWithWhereWithoutUserInput | RubricUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: RubricScalarWhereInput | RubricScalarWhereInput[]
  }

  export type UploadUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<UploadCreateWithoutUserInput, UploadUncheckedCreateWithoutUserInput> | UploadCreateWithoutUserInput[] | UploadUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UploadCreateOrConnectWithoutUserInput | UploadCreateOrConnectWithoutUserInput[]
    upsert?: UploadUpsertWithWhereUniqueWithoutUserInput | UploadUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: UploadCreateManyUserInputEnvelope
    set?: UploadWhereUniqueInput | UploadWhereUniqueInput[]
    disconnect?: UploadWhereUniqueInput | UploadWhereUniqueInput[]
    delete?: UploadWhereUniqueInput | UploadWhereUniqueInput[]
    connect?: UploadWhereUniqueInput | UploadWhereUniqueInput[]
    update?: UploadUpdateWithWhereUniqueWithoutUserInput | UploadUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: UploadUpdateManyWithWhereWithoutUserInput | UploadUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: UploadScalarWhereInput | UploadScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutRubricsInput = {
    create?: XOR<UserCreateWithoutRubricsInput, UserUncheckedCreateWithoutRubricsInput>
    connectOrCreate?: UserCreateOrConnectWithoutRubricsInput
    connect?: UserWhereUniqueInput
  }

  export type UploadCreateNestedManyWithoutRubricInput = {
    create?: XOR<UploadCreateWithoutRubricInput, UploadUncheckedCreateWithoutRubricInput> | UploadCreateWithoutRubricInput[] | UploadUncheckedCreateWithoutRubricInput[]
    connectOrCreate?: UploadCreateOrConnectWithoutRubricInput | UploadCreateOrConnectWithoutRubricInput[]
    createMany?: UploadCreateManyRubricInputEnvelope
    connect?: UploadWhereUniqueInput | UploadWhereUniqueInput[]
  }

  export type UploadUncheckedCreateNestedManyWithoutRubricInput = {
    create?: XOR<UploadCreateWithoutRubricInput, UploadUncheckedCreateWithoutRubricInput> | UploadCreateWithoutRubricInput[] | UploadUncheckedCreateWithoutRubricInput[]
    connectOrCreate?: UploadCreateOrConnectWithoutRubricInput | UploadCreateOrConnectWithoutRubricInput[]
    createMany?: UploadCreateManyRubricInputEnvelope
    connect?: UploadWhereUniqueInput | UploadWhereUniqueInput[]
  }

  export type UserUpdateOneRequiredWithoutRubricsNestedInput = {
    create?: XOR<UserCreateWithoutRubricsInput, UserUncheckedCreateWithoutRubricsInput>
    connectOrCreate?: UserCreateOrConnectWithoutRubricsInput
    upsert?: UserUpsertWithoutRubricsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutRubricsInput, UserUpdateWithoutRubricsInput>, UserUncheckedUpdateWithoutRubricsInput>
  }

  export type UploadUpdateManyWithoutRubricNestedInput = {
    create?: XOR<UploadCreateWithoutRubricInput, UploadUncheckedCreateWithoutRubricInput> | UploadCreateWithoutRubricInput[] | UploadUncheckedCreateWithoutRubricInput[]
    connectOrCreate?: UploadCreateOrConnectWithoutRubricInput | UploadCreateOrConnectWithoutRubricInput[]
    upsert?: UploadUpsertWithWhereUniqueWithoutRubricInput | UploadUpsertWithWhereUniqueWithoutRubricInput[]
    createMany?: UploadCreateManyRubricInputEnvelope
    set?: UploadWhereUniqueInput | UploadWhereUniqueInput[]
    disconnect?: UploadWhereUniqueInput | UploadWhereUniqueInput[]
    delete?: UploadWhereUniqueInput | UploadWhereUniqueInput[]
    connect?: UploadWhereUniqueInput | UploadWhereUniqueInput[]
    update?: UploadUpdateWithWhereUniqueWithoutRubricInput | UploadUpdateWithWhereUniqueWithoutRubricInput[]
    updateMany?: UploadUpdateManyWithWhereWithoutRubricInput | UploadUpdateManyWithWhereWithoutRubricInput[]
    deleteMany?: UploadScalarWhereInput | UploadScalarWhereInput[]
  }

  export type UploadUncheckedUpdateManyWithoutRubricNestedInput = {
    create?: XOR<UploadCreateWithoutRubricInput, UploadUncheckedCreateWithoutRubricInput> | UploadCreateWithoutRubricInput[] | UploadUncheckedCreateWithoutRubricInput[]
    connectOrCreate?: UploadCreateOrConnectWithoutRubricInput | UploadCreateOrConnectWithoutRubricInput[]
    upsert?: UploadUpsertWithWhereUniqueWithoutRubricInput | UploadUpsertWithWhereUniqueWithoutRubricInput[]
    createMany?: UploadCreateManyRubricInputEnvelope
    set?: UploadWhereUniqueInput | UploadWhereUniqueInput[]
    disconnect?: UploadWhereUniqueInput | UploadWhereUniqueInput[]
    delete?: UploadWhereUniqueInput | UploadWhereUniqueInput[]
    connect?: UploadWhereUniqueInput | UploadWhereUniqueInput[]
    update?: UploadUpdateWithWhereUniqueWithoutRubricInput | UploadUpdateWithWhereUniqueWithoutRubricInput[]
    updateMany?: UploadUpdateManyWithWhereWithoutRubricInput | UploadUpdateManyWithWhereWithoutRubricInput[]
    deleteMany?: UploadScalarWhereInput | UploadScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutUploadsInput = {
    create?: XOR<UserCreateWithoutUploadsInput, UserUncheckedCreateWithoutUploadsInput>
    connectOrCreate?: UserCreateOrConnectWithoutUploadsInput
    connect?: UserWhereUniqueInput
  }

  export type RubricCreateNestedOneWithoutUploadsInput = {
    create?: XOR<RubricCreateWithoutUploadsInput, RubricUncheckedCreateWithoutUploadsInput>
    connectOrCreate?: RubricCreateOrConnectWithoutUploadsInput
    connect?: RubricWhereUniqueInput
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type EnumUploadStatusFieldUpdateOperationsInput = {
    set?: $Enums.UploadStatus
  }

  export type UserUpdateOneRequiredWithoutUploadsNestedInput = {
    create?: XOR<UserCreateWithoutUploadsInput, UserUncheckedCreateWithoutUploadsInput>
    connectOrCreate?: UserCreateOrConnectWithoutUploadsInput
    upsert?: UserUpsertWithoutUploadsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutUploadsInput, UserUpdateWithoutUploadsInput>, UserUncheckedUpdateWithoutUploadsInput>
  }

  export type RubricUpdateOneRequiredWithoutUploadsNestedInput = {
    create?: XOR<RubricCreateWithoutUploadsInput, RubricUncheckedCreateWithoutUploadsInput>
    connectOrCreate?: RubricCreateOrConnectWithoutUploadsInput
    upsert?: RubricUpsertWithoutUploadsInput
    connect?: RubricWhereUniqueInput
    update?: XOR<XOR<RubricUpdateToOneWithWhereWithoutUploadsInput, RubricUpdateWithoutUploadsInput>, RubricUncheckedUpdateWithoutUploadsInput>
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

  export type NestedEnumUploadStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.UploadStatus | EnumUploadStatusFieldRefInput<$PrismaModel>
    in?: $Enums.UploadStatus[] | ListEnumUploadStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.UploadStatus[] | ListEnumUploadStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumUploadStatusFilter<$PrismaModel> | $Enums.UploadStatus
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedEnumUploadStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.UploadStatus | EnumUploadStatusFieldRefInput<$PrismaModel>
    in?: $Enums.UploadStatus[] | ListEnumUploadStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.UploadStatus[] | ListEnumUploadStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumUploadStatusWithAggregatesFilter<$PrismaModel> | $Enums.UploadStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumUploadStatusFilter<$PrismaModel>
    _max?: NestedEnumUploadStatusFilter<$PrismaModel>
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

  export type RubricCreateWithoutUserInput = {
    id?: string
    name: string
    description: string
    criteria: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    uploads?: UploadCreateNestedManyWithoutRubricInput
  }

  export type RubricUncheckedCreateWithoutUserInput = {
    id?: string
    name: string
    description: string
    criteria: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    uploads?: UploadUncheckedCreateNestedManyWithoutRubricInput
  }

  export type RubricCreateOrConnectWithoutUserInput = {
    where: RubricWhereUniqueInput
    create: XOR<RubricCreateWithoutUserInput, RubricUncheckedCreateWithoutUserInput>
  }

  export type RubricCreateManyUserInputEnvelope = {
    data: RubricCreateManyUserInput | RubricCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type UploadCreateWithoutUserInput = {
    id?: string
    originalFileName: string
    storedFileKey: string
    storageLocation: string
    fileSize: number
    mimeType: string
    status?: $Enums.UploadStatus
    result?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    rubric: RubricCreateNestedOneWithoutUploadsInput
  }

  export type UploadUncheckedCreateWithoutUserInput = {
    id?: string
    rubricId: string
    originalFileName: string
    storedFileKey: string
    storageLocation: string
    fileSize: number
    mimeType: string
    status?: $Enums.UploadStatus
    result?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UploadCreateOrConnectWithoutUserInput = {
    where: UploadWhereUniqueInput
    create: XOR<UploadCreateWithoutUserInput, UploadUncheckedCreateWithoutUserInput>
  }

  export type UploadCreateManyUserInputEnvelope = {
    data: UploadCreateManyUserInput | UploadCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type RubricUpsertWithWhereUniqueWithoutUserInput = {
    where: RubricWhereUniqueInput
    update: XOR<RubricUpdateWithoutUserInput, RubricUncheckedUpdateWithoutUserInput>
    create: XOR<RubricCreateWithoutUserInput, RubricUncheckedCreateWithoutUserInput>
  }

  export type RubricUpdateWithWhereUniqueWithoutUserInput = {
    where: RubricWhereUniqueInput
    data: XOR<RubricUpdateWithoutUserInput, RubricUncheckedUpdateWithoutUserInput>
  }

  export type RubricUpdateManyWithWhereWithoutUserInput = {
    where: RubricScalarWhereInput
    data: XOR<RubricUpdateManyMutationInput, RubricUncheckedUpdateManyWithoutUserInput>
  }

  export type RubricScalarWhereInput = {
    AND?: RubricScalarWhereInput | RubricScalarWhereInput[]
    OR?: RubricScalarWhereInput[]
    NOT?: RubricScalarWhereInput | RubricScalarWhereInput[]
    id?: StringFilter<"Rubric"> | string
    userId?: StringFilter<"Rubric"> | string
    name?: StringFilter<"Rubric"> | string
    description?: StringFilter<"Rubric"> | string
    criteria?: JsonFilter<"Rubric">
    createdAt?: DateTimeFilter<"Rubric"> | Date | string
    updatedAt?: DateTimeFilter<"Rubric"> | Date | string
  }

  export type UploadUpsertWithWhereUniqueWithoutUserInput = {
    where: UploadWhereUniqueInput
    update: XOR<UploadUpdateWithoutUserInput, UploadUncheckedUpdateWithoutUserInput>
    create: XOR<UploadCreateWithoutUserInput, UploadUncheckedCreateWithoutUserInput>
  }

  export type UploadUpdateWithWhereUniqueWithoutUserInput = {
    where: UploadWhereUniqueInput
    data: XOR<UploadUpdateWithoutUserInput, UploadUncheckedUpdateWithoutUserInput>
  }

  export type UploadUpdateManyWithWhereWithoutUserInput = {
    where: UploadScalarWhereInput
    data: XOR<UploadUpdateManyMutationInput, UploadUncheckedUpdateManyWithoutUserInput>
  }

  export type UploadScalarWhereInput = {
    AND?: UploadScalarWhereInput | UploadScalarWhereInput[]
    OR?: UploadScalarWhereInput[]
    NOT?: UploadScalarWhereInput | UploadScalarWhereInput[]
    id?: StringFilter<"Upload"> | string
    userId?: StringFilter<"Upload"> | string
    rubricId?: StringFilter<"Upload"> | string
    originalFileName?: StringFilter<"Upload"> | string
    storedFileKey?: StringFilter<"Upload"> | string
    storageLocation?: StringFilter<"Upload"> | string
    fileSize?: IntFilter<"Upload"> | number
    mimeType?: StringFilter<"Upload"> | string
    status?: EnumUploadStatusFilter<"Upload"> | $Enums.UploadStatus
    result?: JsonNullableFilter<"Upload">
    createdAt?: DateTimeFilter<"Upload"> | Date | string
    updatedAt?: DateTimeFilter<"Upload"> | Date | string
  }

  export type UserCreateWithoutRubricsInput = {
    id?: string
    email: string
    createdAt?: Date | string
    updatedAt?: Date | string
    uploads?: UploadCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutRubricsInput = {
    id?: string
    email: string
    createdAt?: Date | string
    updatedAt?: Date | string
    uploads?: UploadUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutRubricsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutRubricsInput, UserUncheckedCreateWithoutRubricsInput>
  }

  export type UploadCreateWithoutRubricInput = {
    id?: string
    originalFileName: string
    storedFileKey: string
    storageLocation: string
    fileSize: number
    mimeType: string
    status?: $Enums.UploadStatus
    result?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutUploadsInput
  }

  export type UploadUncheckedCreateWithoutRubricInput = {
    id?: string
    userId: string
    originalFileName: string
    storedFileKey: string
    storageLocation: string
    fileSize: number
    mimeType: string
    status?: $Enums.UploadStatus
    result?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UploadCreateOrConnectWithoutRubricInput = {
    where: UploadWhereUniqueInput
    create: XOR<UploadCreateWithoutRubricInput, UploadUncheckedCreateWithoutRubricInput>
  }

  export type UploadCreateManyRubricInputEnvelope = {
    data: UploadCreateManyRubricInput | UploadCreateManyRubricInput[]
    skipDuplicates?: boolean
  }

  export type UserUpsertWithoutRubricsInput = {
    update: XOR<UserUpdateWithoutRubricsInput, UserUncheckedUpdateWithoutRubricsInput>
    create: XOR<UserCreateWithoutRubricsInput, UserUncheckedCreateWithoutRubricsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutRubricsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutRubricsInput, UserUncheckedUpdateWithoutRubricsInput>
  }

  export type UserUpdateWithoutRubricsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    uploads?: UploadUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutRubricsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    uploads?: UploadUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UploadUpsertWithWhereUniqueWithoutRubricInput = {
    where: UploadWhereUniqueInput
    update: XOR<UploadUpdateWithoutRubricInput, UploadUncheckedUpdateWithoutRubricInput>
    create: XOR<UploadCreateWithoutRubricInput, UploadUncheckedCreateWithoutRubricInput>
  }

  export type UploadUpdateWithWhereUniqueWithoutRubricInput = {
    where: UploadWhereUniqueInput
    data: XOR<UploadUpdateWithoutRubricInput, UploadUncheckedUpdateWithoutRubricInput>
  }

  export type UploadUpdateManyWithWhereWithoutRubricInput = {
    where: UploadScalarWhereInput
    data: XOR<UploadUpdateManyMutationInput, UploadUncheckedUpdateManyWithoutRubricInput>
  }

  export type UserCreateWithoutUploadsInput = {
    id?: string
    email: string
    createdAt?: Date | string
    updatedAt?: Date | string
    rubrics?: RubricCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutUploadsInput = {
    id?: string
    email: string
    createdAt?: Date | string
    updatedAt?: Date | string
    rubrics?: RubricUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutUploadsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutUploadsInput, UserUncheckedCreateWithoutUploadsInput>
  }

  export type RubricCreateWithoutUploadsInput = {
    id?: string
    name: string
    description: string
    criteria: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutRubricsInput
  }

  export type RubricUncheckedCreateWithoutUploadsInput = {
    id?: string
    userId: string
    name: string
    description: string
    criteria: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RubricCreateOrConnectWithoutUploadsInput = {
    where: RubricWhereUniqueInput
    create: XOR<RubricCreateWithoutUploadsInput, RubricUncheckedCreateWithoutUploadsInput>
  }

  export type UserUpsertWithoutUploadsInput = {
    update: XOR<UserUpdateWithoutUploadsInput, UserUncheckedUpdateWithoutUploadsInput>
    create: XOR<UserCreateWithoutUploadsInput, UserUncheckedCreateWithoutUploadsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutUploadsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutUploadsInput, UserUncheckedUpdateWithoutUploadsInput>
  }

  export type UserUpdateWithoutUploadsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rubrics?: RubricUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutUploadsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rubrics?: RubricUncheckedUpdateManyWithoutUserNestedInput
  }

  export type RubricUpsertWithoutUploadsInput = {
    update: XOR<RubricUpdateWithoutUploadsInput, RubricUncheckedUpdateWithoutUploadsInput>
    create: XOR<RubricCreateWithoutUploadsInput, RubricUncheckedCreateWithoutUploadsInput>
    where?: RubricWhereInput
  }

  export type RubricUpdateToOneWithWhereWithoutUploadsInput = {
    where?: RubricWhereInput
    data: XOR<RubricUpdateWithoutUploadsInput, RubricUncheckedUpdateWithoutUploadsInput>
  }

  export type RubricUpdateWithoutUploadsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    criteria?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutRubricsNestedInput
  }

  export type RubricUncheckedUpdateWithoutUploadsInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    criteria?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RubricCreateManyUserInput = {
    id?: string
    name: string
    description: string
    criteria: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UploadCreateManyUserInput = {
    id?: string
    rubricId: string
    originalFileName: string
    storedFileKey: string
    storageLocation: string
    fileSize: number
    mimeType: string
    status?: $Enums.UploadStatus
    result?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RubricUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    criteria?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    uploads?: UploadUpdateManyWithoutRubricNestedInput
  }

  export type RubricUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    criteria?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    uploads?: UploadUncheckedUpdateManyWithoutRubricNestedInput
  }

  export type RubricUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    criteria?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UploadUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    originalFileName?: StringFieldUpdateOperationsInput | string
    storedFileKey?: StringFieldUpdateOperationsInput | string
    storageLocation?: StringFieldUpdateOperationsInput | string
    fileSize?: IntFieldUpdateOperationsInput | number
    mimeType?: StringFieldUpdateOperationsInput | string
    status?: EnumUploadStatusFieldUpdateOperationsInput | $Enums.UploadStatus
    result?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rubric?: RubricUpdateOneRequiredWithoutUploadsNestedInput
  }

  export type UploadUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    rubricId?: StringFieldUpdateOperationsInput | string
    originalFileName?: StringFieldUpdateOperationsInput | string
    storedFileKey?: StringFieldUpdateOperationsInput | string
    storageLocation?: StringFieldUpdateOperationsInput | string
    fileSize?: IntFieldUpdateOperationsInput | number
    mimeType?: StringFieldUpdateOperationsInput | string
    status?: EnumUploadStatusFieldUpdateOperationsInput | $Enums.UploadStatus
    result?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UploadUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    rubricId?: StringFieldUpdateOperationsInput | string
    originalFileName?: StringFieldUpdateOperationsInput | string
    storedFileKey?: StringFieldUpdateOperationsInput | string
    storageLocation?: StringFieldUpdateOperationsInput | string
    fileSize?: IntFieldUpdateOperationsInput | number
    mimeType?: StringFieldUpdateOperationsInput | string
    status?: EnumUploadStatusFieldUpdateOperationsInput | $Enums.UploadStatus
    result?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UploadCreateManyRubricInput = {
    id?: string
    userId: string
    originalFileName: string
    storedFileKey: string
    storageLocation: string
    fileSize: number
    mimeType: string
    status?: $Enums.UploadStatus
    result?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UploadUpdateWithoutRubricInput = {
    id?: StringFieldUpdateOperationsInput | string
    originalFileName?: StringFieldUpdateOperationsInput | string
    storedFileKey?: StringFieldUpdateOperationsInput | string
    storageLocation?: StringFieldUpdateOperationsInput | string
    fileSize?: IntFieldUpdateOperationsInput | number
    mimeType?: StringFieldUpdateOperationsInput | string
    status?: EnumUploadStatusFieldUpdateOperationsInput | $Enums.UploadStatus
    result?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutUploadsNestedInput
  }

  export type UploadUncheckedUpdateWithoutRubricInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    originalFileName?: StringFieldUpdateOperationsInput | string
    storedFileKey?: StringFieldUpdateOperationsInput | string
    storageLocation?: StringFieldUpdateOperationsInput | string
    fileSize?: IntFieldUpdateOperationsInput | number
    mimeType?: StringFieldUpdateOperationsInput | string
    status?: EnumUploadStatusFieldUpdateOperationsInput | $Enums.UploadStatus
    result?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UploadUncheckedUpdateManyWithoutRubricInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    originalFileName?: StringFieldUpdateOperationsInput | string
    storedFileKey?: StringFieldUpdateOperationsInput | string
    storageLocation?: StringFieldUpdateOperationsInput | string
    fileSize?: IntFieldUpdateOperationsInput | number
    mimeType?: StringFieldUpdateOperationsInput | string
    status?: EnumUploadStatusFieldUpdateOperationsInput | $Enums.UploadStatus
    result?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }
}