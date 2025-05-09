import * as pulumi from '@pulumi/pulumi';
import { deployApp } from './services/app';
import { deployCFBroker } from './services/cf-broker';
import { deployCFCDN } from './services/cf-cdn';
import { deployClickhouse } from './services/clickhouse';
import { deployCloudFlareSecurityTransform } from './services/cloudflare-security';
import { deployCommerce } from './services/commerce';
import { deployDatabaseCleanupJob } from './services/database-cleanup';
import { deployDbMigrations } from './services/db-migrations';
import { configureDocker } from './services/docker';
import { deployEmails } from './services/emails';
import { prepareEnvironment } from './services/environment';
import { configureGithubApp } from './services/github';
import { deployGraphQL } from './services/graphql';
import { deployKafka } from './services/kafka';
import { deployObservability } from './services/observability';
import { deploySchemaPolicy } from './services/policy';
import { deployPostgres } from './services/postgres';
import { deployProxy } from './services/proxy';
import { deployPublicGraphQLAPIGateway } from './services/public-graphql-api-gateway';
import { deployRedis } from './services/redis';
import { deployS3, deployS3AuditLog, deployS3Mirror } from './services/s3';
import { deploySchema } from './services/schema';
import { configureSentry } from './services/sentry';
import { configureSlackApp } from './services/slack-app';
import { deploySuperTokens } from './services/supertokens';
import { deployTokens } from './services/tokens';
import { deployUsage } from './services/usage';
import { deployUsageIngestor } from './services/usage-ingestor';
import { deployWebhooks } from './services/webhooks';
import { configureZendesk } from './services/zendesk';
import { optimizeAzureCluster } from './utils/azure-helpers';
import { isDefined } from './utils/helpers';
import { publishAppDeployment } from './utils/publish-app-deployment';
import { publishGraphQLSchema } from './utils/publish-graphql-schema';
import { ServiceSecret } from './utils/secrets';

// eslint-disable-next-line no-process-env
const imagesTag = process.env.DOCKER_IMAGE_TAG as string;

if (!imagesTag) {
  throw new Error(`DOCKER_IMAGE_TAG env variable is not set.`);
}

// eslint-disable-next-line no-process-env
const graphqlSchemaAbsolutePath: string | undefined = process.env.GRAPHQL_SCHEMA_ABSOLUTE_PATH;

if (!graphqlSchemaAbsolutePath) {
  throw new Error(`GRAPHQL_SCHEMA_ABSOLUTE_PATH env variable is not set.`);
}

// eslint-disable-next-line no-process-env
let hiveAppPersistedDocumentsAbsolutePath: string | undefined =
  process.env.HIVE_APP_PERSISTED_DOCUMENTS_ABSOLUTE_PATH;

if (!hiveAppPersistedDocumentsAbsolutePath) {
  console.warn(
    'HIVE_APP_PERSISTED_DOCUMENTS_ABSOLUTE_PATH env variable is not set, defaulting to "0" (disabled).',
  );
  hiveAppPersistedDocumentsAbsolutePath = undefined;
}

optimizeAzureCluster();

const docker = configureDocker();
const envName = pulumi.getStack();
const heartbeatsConfig = new pulumi.Config('heartbeats');

const sentry = configureSentry();
const environment = prepareEnvironment({
  release: imagesTag,
  environment: envName,
  rootDns: new pulumi.Config('common').require('dnsZone'),
});
const observability = deployObservability({ environment });
const clickhouse = deployClickhouse();
const postgres = deployPostgres();
const redis = deployRedis({ environment });
const kafka = deployKafka();
const s3 = deployS3();
const s3Mirror = deployS3Mirror();
const s3AuditLog = deployS3AuditLog();

const cdn = deployCFCDN({
  s3,
  s3Mirror,
  sentry,
  environment,
});

const broker = deployCFBroker({
  environment,
  sentry,
});

// eslint-disable-next-line no-process-env
const shouldCleanDatabase = process.env.CLEAN_DATABASE === 'true';
const databaseCleanupJob = shouldCleanDatabase ? deployDatabaseCleanupJob({ environment }) : null;

// eslint-disable-next-line no-process-env
const forceRunDbMigrations = process.env.FORCE_DB_MIGRATIONS === 'true';
const dbMigrations = deployDbMigrations({
  clickhouse,
  docker,
  postgres,
  s3,
  cdn,
  environment,
  image: docker.factory.getImageId('storage', imagesTag),
  force: forceRunDbMigrations,
  dependencies: [databaseCleanupJob].filter(isDefined),
});

const tokens = deployTokens({
  image: docker.factory.getImageId('tokens', imagesTag),
  environment,
  dbMigrations,
  docker,
  postgres,
  redis,
  heartbeat: heartbeatsConfig.get('tokens'),
  sentry,
  observability,
});

const webhooks = deployWebhooks({
  image: docker.factory.getImageId('webhooks', imagesTag),
  environment,
  heartbeat: heartbeatsConfig.get('webhooks'),
  broker,
  docker,
  redis,
  sentry,
  observability,
});

const emails = deployEmails({
  image: docker.factory.getImageId('emails', imagesTag),
  docker,
  environment,
  redis,
  sentry,
  observability,
});

const commerce = deployCommerce({
  image: docker.factory.getImageId('commerce', imagesTag),
  docker,
  environment,
  clickhouse,
  dbMigrations,
  sentry,
  observability,
  emails,
  postgres,
});

const usage = deployUsage({
  image: docker.factory.getImageId('usage', imagesTag),
  docker,
  environment,
  tokens,
  redis,
  postgres,
  kafka,
  dbMigrations,
  commerce,
  sentry,
  observability,
});

const usageIngestor = deployUsageIngestor({
  image: docker.factory.getImageId('usage-ingestor', imagesTag),
  docker,
  clickhouse,
  kafka,
  environment,
  dbMigrations,
  heartbeat: heartbeatsConfig.get('usageIngestor'),
  sentry,
});

const schema = deploySchema({
  image: docker.factory.getImageId('schema', imagesTag),
  docker,
  environment,
  redis,
  broker,
  sentry,
  observability,
});

const schemaPolicy = deploySchemaPolicy({
  image: docker.factory.getImageId('policy', imagesTag),
  docker,
  environment,
  sentry,
  observability,
});

const supertokens = deploySuperTokens(postgres, { dependencies: [dbMigrations] }, environment);
const zendesk = configureZendesk({ environment });
const githubApp = configureGithubApp();
const slackApp = configureSlackApp();

const graphql = deployGraphQL({
  postgres,
  environment,
  clickhouse,
  image: docker.factory.getImageId('server', imagesTag),
  docker,
  tokens,
  webhooks,
  schema,
  schemaPolicy,
  dbMigrations,
  redis,
  usage,
  cdn,
  commerce,
  emails,
  supertokens,
  s3,
  s3Mirror,
  s3AuditLog,
  zendesk,
  githubApp,
  sentry,
  observability,
});

const hiveConfig = new pulumi.Config('hive');
const hiveConfigSecret = new ServiceSecret('hive-config-secret', {
  usageAccessToken: hiveConfig.requireSecret('cliAccessToken'),
});

const publishGraphQLSchemaCommand = publishGraphQLSchema({
  graphql,
  registry: {
    endpoint: `https://${environment.appDns}/registry`,
    accessToken: hiveConfigSecret.raw.usageAccessToken,
    target: hiveConfig.require('target'),
  },
  version: {
    commit: imagesTag,
  },
  schemaPath: graphqlSchemaAbsolutePath,
});

let publishAppDeploymentCommand: pulumi.Resource | undefined;

if (hiveAppPersistedDocumentsAbsolutePath) {
  publishAppDeploymentCommand = publishAppDeployment({
    appName: 'hive-app',
    registry: {
      endpoint: `https://${environment.appDns}/registry`,
      accessToken: hiveConfigSecret.raw.usageAccessToken,
      target: hiveConfig.require('target'),
    },
    version: {
      commit: imagesTag,
    },
    persistedDocumentsPath: hiveAppPersistedDocumentsAbsolutePath,
    wakeupClickhouse: environment.isProduction
      ? null
      : {
          clickhouse: clickhouse.secret,
          dockerSecret: docker.secret,
        },
    // We need to wait until the new GraphQL schema is published before we can publish the app deployment.
    dependsOn: [publishGraphQLSchemaCommand],
  });
}

const app = deployApp({
  environment,
  graphql,
  publishAppDeploymentCommand,
  dbMigrations,
  image: docker.factory.getImageId('app', imagesTag),
  docker,
  zendesk,
  commerce,
  github: githubApp,
  slackApp,
  sentry,
});

const publicGraphQLAPIGateway = deployPublicGraphQLAPIGateway({
  environment,
  graphql,
  docker,
  observability,
});

const proxy = deployProxy({
  observability,
  app,
  graphql,
  usage,
  environment,
  publicGraphQLAPIGateway,
});

deployCloudFlareSecurityTransform({
  environment,
  // Paths used by 3rd-party software.
  // The CF Page Rules should not affect them and do not apply any special security headers.
  ignoredPaths: [
    '/api/auth',
    '/api/health',
    '/usage',
    '/graphql',
    '/registry',
    '/server',
    '/api/github',
    '/api/slack',
  ],
  ignoredHosts: [
    // Ignore CSP for Production CDN
    'cdn.graphql-hive.com',
    // Staging
    'staging.graphql-hive.com',
    'app.staging.graphql-hive.com',
    'cdn.staging.graphql-hive.com',
    // Dev
    'dev.graphql-hive.com',
    'app.dev.graphql-hive.com',
    'cdn.dev.graphql-hive.com',
  ],
});

export const graphqlApiServiceId = graphql.service.id;
export const usageApiServiceId = usage.service.id;
export const usageIngestorApiServiceId = usageIngestor.service.id;
export const tokensApiServiceId = tokens.service.id;
export const schemaApiServiceId = schema.service.id;
export const webhooksApiServiceId = webhooks.service.id;

export const appId = app.deployment.id;
export const publicIp = proxy.get()!.status.loadBalancer.ingress[0].ip;
