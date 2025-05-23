import zod from 'zod';
import { OpenTelemetryConfigurationModel } from '@hive/service-common';

const isNumberString = (input: unknown) => zod.string().regex(/^\d+$/).safeParse(input).success;

const numberFromNumberOrNumberString = (input: unknown): number | undefined => {
  if (typeof input == 'number') return input;
  if (isNumberString(input)) return Number(input);
};

const NumberFromString = zod.preprocess(numberFromNumberOrNumberString, zod.number().min(1));

// treat an empty string (`''`) as undefined
const emptyString = <T extends zod.ZodType>(input: T) => {
  return zod.preprocess((value: unknown) => {
    if (value === '') return undefined;
    return value;
  }, input);
};

const EnvironmentModel = zod.object({
  PORT: emptyString(NumberFromString.optional()),
  ENVIRONMENT: emptyString(zod.string().optional()),
  RELEASE: emptyString(zod.string().optional()),
  ENCRYPTION_SECRET: emptyString(zod.string()),
  WEB_APP_URL: zod.string().url(),
  GRAPHQL_PUBLIC_ORIGIN: zod
    .string({
      required_error:
        'GRAPHQL_PUBLIC_ORIGIN is required (see: https://github.com/graphql-hive/platform/pull/4288#issue-2195509699)',
    })
    .url(),
  SCHEMA_POLICY_ENDPOINT: emptyString(zod.string().url().optional()),
  TOKENS_ENDPOINT: zod.string().url(),
  EMAILS_ENDPOINT: emptyString(zod.string().url().optional()),
  WEBHOOKS_ENDPOINT: zod.string().url(),
  SCHEMA_ENDPOINT: zod.string().url(),
  AUTH_ORGANIZATION_OIDC: emptyString(zod.union([zod.literal('1'), zod.literal('0')]).optional()),
  AUTH_REQUIRE_EMAIL_VERIFICATION: emptyString(
    zod.union([zod.literal('1'), zod.literal('0')]).optional(),
  ),
  FEATURE_FLAGS_APP_DEPLOYMENTS_ENABLED: emptyString(
    zod.union([zod.literal('1'), zod.literal('0')]).optional(),
  ),
});

const CommerceModel = zod.object({
  COMMERCE_ENDPOINT: emptyString(zod.string().url().optional()),
});

const SentryModel = zod.union([
  zod.object({
    SENTRY: emptyString(zod.literal('0').optional()),
  }),
  zod.object({
    SENTRY: zod.literal('1'),
    SENTRY_DSN: zod.string(),
  }),
]);

const ZendeskSupportModel = zod.union([
  zod.object({
    ZENDESK_SUPPORT: emptyString(zod.literal('0').optional()),
  }),
  zod.object({
    ZENDESK_SUPPORT: zod.literal('1'),
    ZENDESK_USERNAME: zod.string(),
    ZENDESK_PASSWORD: zod.string(),
    ZENDESK_SUBDOMAIN: zod.string(),
  }),
]);

const PostgresModel = zod.object({
  POSTGRES_SSL: emptyString(zod.union([zod.literal('1'), zod.literal('0')]).optional()),
  POSTGRES_HOST: zod.string(),
  POSTGRES_PORT: NumberFromString,
  POSTGRES_DB: zod.string(),
  POSTGRES_USER: zod.string(),
  POSTGRES_PASSWORD: emptyString(zod.string().optional()),
});

const ClickHouseModel = zod.object({
  CLICKHOUSE_PROTOCOL: zod.union([zod.literal('http'), zod.literal('https')]),
  CLICKHOUSE_HOST: zod.string(),
  CLICKHOUSE_PORT: NumberFromString,
  CLICKHOUSE_USERNAME: zod.string(),
  CLICKHOUSE_PASSWORD: zod.string(),
  CLICKHOUSE_REQUEST_TIMEOUT: emptyString(NumberFromString.optional()),
});

const RedisModel = zod.object({
  REDIS_HOST: zod.string(),
  REDIS_PORT: NumberFromString,
  REDIS_PASSWORD: emptyString(zod.string().optional()),
  REDIS_TLS_ENABLED: emptyString(zod.union([zod.literal('1'), zod.literal('0')]).optional()),
});

const SuperTokensModel = zod.object({
  SUPERTOKENS_CONNECTION_URI: zod.string().url(),
  SUPERTOKENS_API_KEY: zod.string(),
});

const GitHubModel = zod.union([
  zod.object({
    INTEGRATION_GITHUB: emptyString(zod.literal('0').optional()),
  }),
  zod.object({
    INTEGRATION_GITHUB: zod.literal('1'),
    INTEGRATION_GITHUB_APP_ID: NumberFromString,
    INTEGRATION_GITHUB_APP_PRIVATE_KEY: zod.string(),
  }),
]);

const CdnCFModel = zod.union([
  zod.object({
    CDN_CF: emptyString(zod.literal('0').optional()),
  }),
  zod.object({
    CDN_CF: zod.literal('1'),
    CDN_CF_BASE_URL: zod.string(),
  }),
]);

const CdnApiModel = zod.union([
  zod.object({
    CDN_API: emptyString(zod.literal('0').optional()),
  }),
  zod.object({
    CDN_API: zod.literal('1'),
    CDN_API_BASE_URL: zod.string(),
  }),
]);

const HiveModel = zod.union([
  zod.object({ HIVE_USAGE: emptyString(zod.literal('0').optional()) }),
  zod.object({
    HIVE_USAGE: zod.literal('1'),
    HIVE_USAGE_ENDPOINT: zod.string().url().optional(),
    HIVE_USAGE_TARGET: zod.string(),
    HIVE_USAGE_ACCESS_TOKEN: zod.string(),
  }),
]);

const PrometheusModel = zod.object({
  PROMETHEUS_METRICS: emptyString(zod.union([zod.literal('0'), zod.literal('1')]).optional()),
  PROMETHEUS_METRICS_LABEL_INSTANCE: emptyString(zod.string().optional()),
  PROMETHEUS_METRICS_PORT: emptyString(NumberFromString.optional()),
});

const S3Model = zod.object({
  S3_ENDPOINT: zod.string().url(),
  S3_ACCESS_KEY_ID: zod.string(),
  S3_SECRET_ACCESS_KEY: zod.string(),
  S3_SESSION_TOKEN: emptyString(zod.string().optional()),
  S3_BUCKET_NAME: zod.string(),
});

const S3MirrorModel = zod.union([
  zod.object({
    S3_MIRROR: zod.union([zod.void(), zod.literal('0'), zod.literal('')]),
  }),
  zod.object({
    S3_MIRROR: zod.literal('1'),
    S3_MIRROR_ENDPOINT: zod.string().url(),
    S3_MIRROR_ACCESS_KEY_ID: zod.string(),
    S3_MIRROR_SECRET_ACCESS_KEY: zod.string(),
    S3_MIRROR_SESSION_TOKEN: emptyString(zod.string().optional()),
    S3_MIRROR_BUCKET_NAME: zod.string(),
    S3_MIRROR_PUBLIC_URL: emptyString(zod.string().url().optional()),
  }),
]);

const S3AuditLogModel = zod.union([
  zod.object({
    S3_AUDIT_LOG: zod.union([zod.void(), zod.literal('0'), zod.literal('')]),
  }),
  zod.object({
    S3_AUDIT_LOG: zod.literal('1'),
    S3_AUDIT_LOG_ENDPOINT: zod.string().url(),
    S3_AUDIT_LOG_ACCESS_KEY_ID: zod.string(),
    S3_AUDIT_LOG_SECRET_ACCESS_KEY: zod.string(),
    S3_AUDIT_LOG_SESSION_TOKEN: emptyString(zod.string().optional()),
    S3_AUDIT_LOG_BUCKET_NAME: zod.string(),
    S3_AUDIT_LOG_PUBLIC_URL: emptyString(zod.string().url().optional()),
  }),
]);

const AuthGitHubConfigSchema = zod.union([
  zod.object({
    AUTH_GITHUB: zod.union([zod.void(), zod.literal('0'), zod.literal('')]),
  }),
  zod.object({
    AUTH_GITHUB: zod.literal('1'),
    AUTH_GITHUB_CLIENT_ID: zod.string(),
    AUTH_GITHUB_CLIENT_SECRET: zod.string(),
  }),
]);

const AuthGoogleConfigSchema = zod.union([
  zod.object({
    AUTH_GOOGLE: zod.union([zod.void(), zod.literal('0'), zod.literal('')]),
  }),
  zod.object({
    AUTH_GOOGLE: zod.literal('1'),
    AUTH_GOOGLE_CLIENT_ID: zod.string(),
    AUTH_GOOGLE_CLIENT_SECRET: zod.string(),
  }),
]);

const AuthOktaConfigSchema = zod.union([
  zod.object({
    AUTH_OKTA: zod.union([zod.void(), zod.literal('0')]),
  }),
  zod.object({
    AUTH_OKTA: zod.literal('1'),
    AUTH_OKTA_HIDDEN: emptyString(zod.union([zod.literal('1'), zod.literal('0')]).optional()),
    AUTH_OKTA_ENDPOINT: zod.string().url(),
    AUTH_OKTA_CLIENT_ID: zod.string(),
    AUTH_OKTA_CLIENT_SECRET: zod.string(),
  }),
]);

const AuthOktaMultiTenantSchema = zod.object({
  AUTH_ORGANIZATION_OIDC: emptyString(zod.union([zod.literal('1'), zod.literal('0')]).optional()),
});

const HivePersistedDocumentsSchema = zod.union([
  zod.object({
    HIVE_PERSISTED_DOCUMENTS: zod.union([zod.void(), zod.literal('0')]),
  }),
  zod.object({
    HIVE_PERSISTED_DOCUMENTS: zod.literal('1'),
    HIVE_PERSISTED_DOCUMENTS_CDN_ENDPOINT: zod.string().url(),
    HIVE_PERSISTED_DOCUMENTS_CDN_ACCESS_KEY_ID: zod.string(),
  }),
]);

const LogModel = zod.object({
  LOG_LEVEL: emptyString(
    zod
      .union([
        zod.literal('trace'),
        zod.literal('debug'),
        zod.literal('info'),
        zod.literal('warn'),
        zod.literal('error'),
        zod.literal('fatal'),
        zod.literal('silent'),
      ])
      .optional(),
  ),
  REQUEST_LOGGING: emptyString(zod.union([zod.literal('0'), zod.literal('1')]).optional()).default(
    '1',
  ),
});

const processEnv = process.env;

const configs = {
  base: EnvironmentModel.safeParse(processEnv),
  commerce: CommerceModel.safeParse(processEnv),
  sentry: SentryModel.safeParse(processEnv),
  postgres: PostgresModel.safeParse(processEnv),
  clickhouse: ClickHouseModel.safeParse(processEnv),
  redis: RedisModel.safeParse(processEnv),
  supertokens: SuperTokensModel.safeParse(processEnv),
  authGithub: AuthGitHubConfigSchema.safeParse(processEnv),
  authGoogle: AuthGoogleConfigSchema.safeParse(processEnv),
  authOkta: AuthOktaConfigSchema.safeParse(processEnv),
  authOktaMultiTenant: AuthOktaMultiTenantSchema.safeParse(processEnv),
  github: GitHubModel.safeParse(processEnv),
  cdnCf: CdnCFModel.safeParse(processEnv),
  cdnApi: CdnApiModel.safeParse(processEnv),
  prometheus: PrometheusModel.safeParse(processEnv),
  hive: HiveModel.safeParse(processEnv),
  s3: S3Model.safeParse(processEnv),
  s3Mirror: S3MirrorModel.safeParse(processEnv),
  s3AuditLog: S3AuditLogModel.safeParse(processEnv),
  log: LogModel.safeParse(processEnv),
  zendeskSupport: ZendeskSupportModel.safeParse(processEnv),
  tracing: OpenTelemetryConfigurationModel.safeParse(processEnv),
  hivePersistedDocuments: HivePersistedDocumentsSchema.safeParse(processEnv),
};

const environmentErrors: Array<string> = [];

for (const config of Object.values(configs)) {
  if (config.success === false) {
    environmentErrors.push(JSON.stringify(config.error.format(), null, 4));
  }
}

if (environmentErrors.length) {
  const fullError = environmentErrors.join(`\n`);
  console.error('❌ Invalid environment variables:', fullError);
  process.exit(1);
}

function extractConfig<Input, Output>(config: zod.SafeParseReturnType<Input, Output>): Output {
  if (!config.success) {
    throw new Error('Something went wrong.');
  }
  return config.data;
}

const base = extractConfig(configs.base);
const commerce = extractConfig(configs.commerce);
const postgres = extractConfig(configs.postgres);
const sentry = extractConfig(configs.sentry);
const clickhouse = extractConfig(configs.clickhouse);
const redis = extractConfig(configs.redis);
const supertokens = extractConfig(configs.supertokens);
const authGithub = extractConfig(configs.authGithub);
const authGoogle = extractConfig(configs.authGoogle);
const authOkta = extractConfig(configs.authOkta);
const authOktaMultiTenant = extractConfig(configs.authOktaMultiTenant);
const github = extractConfig(configs.github);
const prometheus = extractConfig(configs.prometheus);
const log = extractConfig(configs.log);
const cdnCf = extractConfig(configs.cdnCf);
const cdnApi = extractConfig(configs.cdnApi);
const hive = extractConfig(configs.hive);
const s3 = extractConfig(configs.s3);
const s3Mirror = extractConfig(configs.s3Mirror);
const s3AuditLog = extractConfig(configs.s3AuditLog);
const zendeskSupport = extractConfig(configs.zendeskSupport);
const tracing = extractConfig(configs.tracing);
const hivePersistedDocuments = extractConfig(configs.hivePersistedDocuments);

const hiveUsageConfig =
  hive.HIVE_USAGE === '1'
    ? {
        target: hive.HIVE_USAGE_TARGET,
        token: hive.HIVE_USAGE_ACCESS_TOKEN,
        endpoint: hive.HIVE_USAGE_ENDPOINT ?? null,
      }
    : null;

const hivePersistedDocumentsConfig =
  hivePersistedDocuments.HIVE_PERSISTED_DOCUMENTS === '1'
    ? {
        cdnEndpoint: hivePersistedDocuments.HIVE_PERSISTED_DOCUMENTS_CDN_ENDPOINT,
        cdnAccessKeyId: hivePersistedDocuments.HIVE_PERSISTED_DOCUMENTS_CDN_ACCESS_KEY_ID,
      }
    : null;

export type HiveUsageConfig = typeof hiveUsageConfig;
export type HivePersistedDocumentsConfig = typeof hivePersistedDocumentsConfig;

export const env = {
  environment: base.ENVIRONMENT,
  release: base.RELEASE ?? 'local',
  encryptionSecret: base.ENCRYPTION_SECRET,
  tracing: {
    enabled: !!tracing.OPENTELEMETRY_COLLECTOR_ENDPOINT,
    collectorEndpoint: tracing.OPENTELEMETRY_COLLECTOR_ENDPOINT,
    enableConsoleExporter: tracing.OPENTELEMETRY_CONSOLE_EXPORTER === '1',
  },
  hiveServices: {
    webApp: {
      url: base.WEB_APP_URL,
    },
    tokens: {
      endpoint: base.TOKENS_ENDPOINT,
    },
    commerce: commerce.COMMERCE_ENDPOINT
      ? {
          endpoint: commerce.COMMERCE_ENDPOINT,
          dateRetentionPurgeIntervalMinutes: 5,
        }
      : null,
    schemaPolicy: base.SCHEMA_POLICY_ENDPOINT
      ? {
          endpoint: base.SCHEMA_POLICY_ENDPOINT,
        }
      : null,
    emails: base.EMAILS_ENDPOINT ? { endpoint: base.EMAILS_ENDPOINT } : null,
    webhooks: { endpoint: base.WEBHOOKS_ENDPOINT },
    schema: { endpoint: base.SCHEMA_ENDPOINT },
  },
  http: {
    port: base.PORT ?? 3001,
  },
  postgres: {
    host: postgres.POSTGRES_HOST,
    port: postgres.POSTGRES_PORT,
    db: postgres.POSTGRES_DB,
    user: postgres.POSTGRES_USER,
    password: postgres.POSTGRES_PASSWORD,
    ssl: postgres.POSTGRES_SSL === '1',
  },
  clickhouse: {
    protocol: clickhouse.CLICKHOUSE_PROTOCOL,
    host: clickhouse.CLICKHOUSE_HOST,
    port: clickhouse.CLICKHOUSE_PORT,
    username: clickhouse.CLICKHOUSE_USERNAME,
    password: clickhouse.CLICKHOUSE_PASSWORD,
    requestTimeout: clickhouse.CLICKHOUSE_REQUEST_TIMEOUT,
  },
  redis: {
    host: redis.REDIS_HOST,
    port: redis.REDIS_PORT,
    password: redis.REDIS_PASSWORD ?? '',
    tlsEnabled: redis.REDIS_TLS_ENABLED === '1',
  },
  supertokens: {
    connectionURI: supertokens.SUPERTOKENS_CONNECTION_URI,
    apiKey: supertokens.SUPERTOKENS_API_KEY,
  },
  auth: {
    github:
      authGithub.AUTH_GITHUB === '1'
        ? {
            clientId: authGithub.AUTH_GITHUB_CLIENT_ID,
            clientSecret: authGithub.AUTH_GITHUB_CLIENT_SECRET,
          }
        : null,
    google:
      authGoogle.AUTH_GOOGLE === '1'
        ? {
            clientId: authGoogle.AUTH_GOOGLE_CLIENT_ID,
            clientSecret: authGoogle.AUTH_GOOGLE_CLIENT_SECRET,
          }
        : null,
    okta:
      authOkta.AUTH_OKTA === '1'
        ? {
            endpoint: authOkta.AUTH_OKTA_ENDPOINT,
            hidden: authOkta.AUTH_OKTA_HIDDEN === '1',
            clientId: authOkta.AUTH_OKTA_CLIENT_ID,
            clientSecret: authOkta.AUTH_OKTA_CLIENT_SECRET,
          }
        : null,
    organizationOIDC: authOktaMultiTenant.AUTH_ORGANIZATION_OIDC === '1',
    requireEmailVerification: base.AUTH_REQUIRE_EMAIL_VERIFICATION === '1',
  },
  github:
    github.INTEGRATION_GITHUB === '1'
      ? {
          appId: github.INTEGRATION_GITHUB_APP_ID,
          privateKey: github.INTEGRATION_GITHUB_APP_PRIVATE_KEY,
        }
      : null,
  cdn: {
    providers: {
      cloudflare:
        cdnCf.CDN_CF === '1'
          ? {
              baseUrl: cdnCf.CDN_CF_BASE_URL,
            }
          : null,
      api: cdnApi.CDN_API === '1' ? { baseUrl: cdnApi.CDN_API_BASE_URL } : null,
    },
  },
  s3: {
    bucketName: s3.S3_BUCKET_NAME,
    endpoint: s3.S3_ENDPOINT,
    credentials: {
      accessKeyId: s3.S3_ACCESS_KEY_ID,
      secretAccessKey: s3.S3_SECRET_ACCESS_KEY,
      sessionToken: s3.S3_SESSION_TOKEN,
    },
  },
  s3Mirror:
    s3Mirror.S3_MIRROR === '1'
      ? {
          bucketName: s3Mirror.S3_MIRROR_BUCKET_NAME,
          endpoint: s3Mirror.S3_MIRROR_ENDPOINT,
          publicUrl: s3Mirror.S3_MIRROR_PUBLIC_URL ?? null,
          credentials: {
            accessKeyId: s3Mirror.S3_MIRROR_ACCESS_KEY_ID,
            secretAccessKey: s3Mirror.S3_MIRROR_SECRET_ACCESS_KEY,
            sessionToken: s3Mirror.S3_MIRROR_SESSION_TOKEN,
          },
        }
      : null,
  s3AuditLogs:
    s3AuditLog.S3_AUDIT_LOG === '1'
      ? {
          bucketName: s3AuditLog.S3_AUDIT_LOG_BUCKET_NAME,
          endpoint: s3AuditLog.S3_AUDIT_LOG_ENDPOINT,
          publicUrl: s3AuditLog.S3_AUDIT_LOG_PUBLIC_URL ?? null,
          credentials: {
            accessKeyId: s3AuditLog.S3_AUDIT_LOG_ACCESS_KEY_ID,
            secretAccessKey: s3AuditLog.S3_AUDIT_LOG_SECRET_ACCESS_KEY,
            sessionToken: s3AuditLog.S3_AUDIT_LOG_SESSION_TOKEN,
          },
        }
      : null,
  organizationOIDC: base.AUTH_ORGANIZATION_OIDC === '1',
  sentry: sentry.SENTRY === '1' ? { dsn: sentry.SENTRY_DSN } : null,
  log: {
    level: log.LOG_LEVEL ?? 'info',
    requests: log.REQUEST_LOGGING === '1',
  },
  prometheus:
    prometheus.PROMETHEUS_METRICS === '1'
      ? {
          labels: {
            instance: prometheus.PROMETHEUS_METRICS_LABEL_INSTANCE ?? 'server',
          },
          port: prometheus.PROMETHEUS_METRICS_PORT ?? 10_254,
        }
      : null,
  hive: hiveUsageConfig,
  hivePersistedDocuments: hivePersistedDocumentsConfig,
  graphql: {
    origin: base.GRAPHQL_PUBLIC_ORIGIN,
  },
  zendeskSupport:
    zendeskSupport.ZENDESK_SUPPORT === '1'
      ? {
          username: zendeskSupport.ZENDESK_USERNAME,
          password: zendeskSupport.ZENDESK_PASSWORD,
          subdomain: zendeskSupport.ZENDESK_SUBDOMAIN,
        }
      : null,
  featureFlags: {
    /** Whether app deployments should be enabled by default for everyone. */
    appDeploymentsEnabled: base.FEATURE_FLAGS_APP_DEPLOYMENTS_ENABLED === '1',
  },
} as const;
