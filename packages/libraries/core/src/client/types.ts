import type { ExecutionArgs } from 'graphql';
import type { PromiseOrValue } from 'graphql/jsutils/PromiseOrValue.js';
import type { AgentOptions } from './agent.js';
import type { autoDisposeSymbol, hiveClientSymbol } from './client.js';
import type { SchemaReporter } from './reporting.js';

type HeadersObject = {
  get(name: string): string | null;
};

export interface HiveClient {
  [hiveClientSymbol]: true;
  [autoDisposeSymbol]: boolean | NodeJS.Signals[];
  info(): void | Promise<void>;
  reportSchema: SchemaReporter['report'];
  /** Collect usage for Query and Mutation operations */
  collectUsage(): CollectUsageCallback;
  /** Collect usage for Query and Mutation operations */
  collectRequest(args: {
    args: ExecutionArgs;
    result: GraphQLErrorsResult | AbortAction;
    duration: number;
    /**
     * Persisted document if request is using a persisted document.
     * It needs to be provided in order to collect app deployment specific information.
     */
    experimental__persistedDocumentHash?: string;
  }): void;
  /** Collect usage for Subscription operations */
  collectSubscriptionUsage(args: {
    args: ExecutionArgs;
    /**
     * Persisted document if subscription is a persisted document.
     * It needs to be provided in order to collect app deployment specific information.
     */
    experimental__persistedDocumentHash?: string;
  }): void;
  createInstrumentedExecute(executeImpl: any): any;
  createInstrumentedSubscribe(executeImpl: any): any;
  dispose(): Promise<void>;
  experimental__persistedDocuments: null | {
    resolve(documentId: string): PromiseOrValue<string | null>;
    allowArbitraryDocuments(context: { headers?: HeadersObject }): PromiseOrValue<boolean>;
  };
}

export type AsyncIterableIteratorOrValue<T> = AsyncIterableIterator<T> | T;
export type AsyncIterableOrValue<T> = AsyncIterable<T> | T;
export type AbortAction = {
  action: 'abort';
  reason: string;
  logging: boolean;
};

export type CollectUsageCallback = (
  args: ExecutionArgs,
  result: GraphQLErrorsResult | AbortAction,
  /**
   * Persisted document if subscription is a persisted document.
   * It needs to be provided in order to collect app deployment specific information.
   */
  experimental__persistedDocumentHash?: string,
) => Promise<void>;

export interface ClientInfo {
  name: string;
  version: string;
}

export interface Logger {
  info(msg: string): void;
  error(error: any, ...data: any[]): void;
}

export interface HiveUsagePluginOptions {
  /**
   * The target to which the usage data should be reported to.
   * This can either be a slug following the format `$organizationSlug/$projectSlug/$targetSlug` (e.g `the-guild/graphql-hive/staging`)
   * or an UUID (e.g. `a0f4c605-6541-4350-8cfe-b31f21a4bf80`).
   */
  target?: string;
  /**
   * Custom endpoint to collect schema usage
   *
   * @deprecated use `options.selfHosting.usageEndpoint` instead
   *
   * Points to Hive by default
   */
  endpoint?: string;
  /**
   * Extract client info from GraphQL Context
   */
  clientInfo?(context: any): null | undefined | ClientInfo;
  /**
   * Hive uses LRU cache to store info about operations.
   * This option represents the maximum size of the cache.
   *
   * Default: 1000
   */
  max?: number;
  /**
   * Hive uses LRU cache to store info about operations.
   * This option represents the time-to-live of every cached operation.
   *
   * Default: no ttl
   */
  ttl?: number;
  /**
   * A list of operations (by name or regular expression) that should be excluded from reporting.
   */
  exclude?: Array<string | RegExp>;
  /**
   * Sample rate to determine sampling.
   * 0.0 = 0% chance of being sent
   * 1.0 = 100% chance of being sent.
   *
   * Default: 1.0
   */
  sampleRate?: number;
  /**
   * Compute sample rate dynamically.
   *
   * If `sampler` is defined, `sampleRate` is ignored.
   *
   * @returns A sample rate between 0 and 1.
   * 0.0 = 0% chance of being sent
   * 1.0 = 100% chance of being sent.
   * true = 100%
   * false = 0%
   */
  sampler?: (context: SamplingContext) => number | boolean;
  /**
   * (Experimental) Enables collecting Input fields usage based on the variables passed to the operation.
   *
   * Default: false
   */
  processVariables?: boolean;
}

export interface SamplingContext
  extends Pick<ExecutionArgs, 'document' | 'contextValue' | 'variableValues'> {
  operationName: string;
}

export interface HiveReportingPluginOptions {
  /**
   * Custom endpoint to collect schema reports
   *
   * @deprecated use `options.selfHosting.usageEndpoint` instead
   *
   * Points to Hive by default
   */
  endpoint?: string;
  /**
   * Author of current version of the schema
   */
  author: string;
  /**
   * Commit SHA hash (or any identifier) related to the schema version
   */
  commit: string;
  /**
   * URL to the service (use only for distributed schemas)
   */
  serviceUrl?: string;
  /**
   * Name of the service (use only for distributed schemas)
   */
  serviceName?: string;
}

export interface HiveSelfHostingOptions {
  /**
   * Point to your own instance of GraphQL Hive API
   *
   * Used by schema reporting and token info.
   */
  graphqlEndpoint: string;
  /**
   * Address of your own GraphQL Hive application
   *
   * Used by token info to generate a link to the organization, project and target.
   */
  applicationUrl: string;
  /**
   * Point to your own instance of GraphQL Hive Usage API
   *
   * Used by usage reporting
   */
  usageEndpoint?: string;
}

type OptionalWhenFalse<T, KCond extends keyof T, KExcluded extends keyof T> =
  // untouched by default or when true
  | T
  // when false, make KExcluded optional
  | (Omit<T, KExcluded> & { [P in KCond]: false } & { [P in KExcluded]?: T[KExcluded] });

export type HivePluginOptions = OptionalWhenFalse<
  {
    /**
     * Enable/Disable Hive usage reporting
     *
     * Default: true
     */
    enabled?: boolean;
    /**
     * Debugging mode
     *
     * Default: false
     */
    debug?: boolean;
    /**
     * Access Token for usage reporting
     */
    token: string;
    /**
     * Use when self-hosting GraphQL Hive
     */
    selfHosting?: HiveSelfHostingOptions;
    agent?: Omit<AgentOptions, 'endpoint' | 'token' | 'enabled' | 'debug'>;
    /**
     * Collects schema usage based on operations
     *
     * Disabled by default
     */
    usage?: HiveUsagePluginOptions | boolean;
    /**
     * Schema reporting
     *
     * Disabled by default
     */
    reporting?: HiveReportingPluginOptions | false;
    /**
     * Print info about the token.
     * Disabled by default (enabled by default only in debug mode)
     *
     * **Note:** The new access tokens do not support printing the token info. For every access token starting with `hvo1/`
     * no information will be printed.
     * @deprecated This option will be removed in the future.
     */
    printTokenInfo?: boolean;
    /**
     * Automatically dispose the client when the process is terminated
     *
     * Apollo: Enabled by default
     * Yoga / Envelop: Enabled by default for SIGINT and SIGTERM signals
     */
    autoDispose?: boolean | NodeJS.Signals[];
    /**
     * Experimental persisted documents configuration.
     *
     **/
    experimental__persistedDocuments?: PersistedDocumentsConfiguration;
  },
  'enabled',
  'token'
>;

export type Maybe<T> = null | undefined | T;

export interface GraphQLErrorsResult {
  errors?: ReadonlyArray<{
    message: string;
    path?: Maybe<ReadonlyArray<string | number>>;
  }>;
}

export interface SchemaFetcherOptions {
  endpoint: string;
  key: string;
  logger?: Logger;
}

export interface ServicesFetcherOptions {
  endpoint: string;
  key: string;
}

export type PersistedDocumentsConfiguration = {
  /**
   * CDN configuration for loading persisted documents.
   **/
  cdn: {
    /**
     * CDN endpoint
     * @example https://cdn.graphql-hive.com/artifacts/v1/5d80a1c2-2532-419c-8bb5-75bb04ea1112
     */
    endpoint: string;
    /**
     * CDN access token
     * @example hv2ZjUxNGUzN2MtNjVhNS0=
     */
    accessToken: string;
  };
  /**
   * Whether arbitrary documents should be allowed along-side persisted documents.
   * @default false
   */
  allowArbitraryDocuments?: boolean | AllowArbitraryDocumentsFunction;
  /**
   * Maximum amount of operations that shall be kept in memory after being loaded from the CDN.
   * Operations are stored in-memory to avoid loading them from the CDN multiple times.
   * @default 10_000
   */
  cache?: number;
};

export type AllowArbitraryDocumentsFunction = (context: {
  /** an object for accessing the request headers. */
  headers?: HeadersObject;
}) => PromiseOrValue<boolean>;
