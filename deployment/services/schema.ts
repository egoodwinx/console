import * as pulumi from '@pulumi/pulumi';
import { ServiceDeployment } from '../utils/service-deployment';
import { DeploymentEnvironment } from '../types';
import { Redis } from './redis';
import type { Broker } from './cf-broker';
import * as k8s from '@pulumi/kubernetes';
import { isProduction } from '../utils/helpers';

const commonConfig = new pulumi.Config('common');
const commonEnv = commonConfig.requireObject<Record<string, string>>('env');

export type Schema = ReturnType<typeof deploySchema>;

export function deploySchema({
  deploymentEnv,
  redis,
  broker,
  release,
  image,
  imagePullSecret,
}: {
  image: string;
  release: string;
  deploymentEnv: DeploymentEnvironment;
  redis: Redis;
  broker: Broker;
  imagePullSecret: k8s.core.v1.Secret;
}) {
  return new ServiceDeployment(
    'schema-service',
    {
      image,
      imagePullSecret,
      env: {
        ...deploymentEnv,
        ...commonEnv,
        SENTRY: commonEnv.SENTRY_ENABLED,
        RELEASE: release,
        REDIS_HOST: redis.config.host,
        REDIS_PORT: String(redis.config.port),
        REDIS_PASSWORD: redis.config.password,
        ENCRYPTION_SECRET: commonConfig.requireSecret('encryptionSecret'),
        REQUEST_BROKER: '1',
        REQUEST_BROKER_ENDPOINT: broker.workerBaseUrl,
        REQUEST_BROKER_SIGNATURE: broker.secretSignature,
      },
      readinessProbe: '/_readiness',
      livenessProbe: '/_health',
      exposesMetrics: true,
      replicas: isProduction(deploymentEnv) ? 2 : 1,
      pdb: true,
    },
    [redis.deployment, redis.service],
  ).deploy();
}
