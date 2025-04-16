import { maskToken, type FastifyReply, type FastifyRequest } from '@hive/service-common';
import { AccessError } from '../../../shared/errors';
import { Logger } from '../../shared/providers/logger';
import { TokenStorage } from '../../token/providers/token-storage';
import { TokensConfig } from '../../token/providers/tokens';
import {
  OrganizationAccessScope,
  ProjectAccessScope,
  TargetAccessScope,
} from '../providers/scopes';
import { AuthNStrategy, Session, type AuthorizationPolicyStatement } from './authz';

export class TargetAccessTokenSession extends Session {
  public readonly organizationId: string;
  public readonly projectId: string;
  public readonly targetId: string;
  public readonly token: string;

  private policies: Array<AuthorizationPolicyStatement>;

  constructor(
    args: {
      organizationId: string;
      projectId: string;
      targetId: string;
      token: string;
      policies: Array<AuthorizationPolicyStatement>;
    },
    deps: {
      logger: Logger;
    },
  ) {
    super({ logger: deps.logger });
    this.organizationId = args.organizationId;
    this.projectId = args.projectId;
    this.targetId = args.targetId;
    this.token = args.token;
    this.policies = args.policies;
  }

  protected loadPolicyStatementsForOrganization(
    _: string,
  ): Promise<Array<AuthorizationPolicyStatement>> | Array<AuthorizationPolicyStatement> {
    return this.policies;
  }

  get id(): string {
    return this.token;
  }

  public getLegacySelector() {
    return {
      token: this.token,
      organizationId: this.organizationId,
      projectId: this.projectId,
      targetId: this.targetId,
    };
  }

  public async getActor(): Promise<never> {
    throw new AccessError('Authorization token is missing', 'UNAUTHENTICATED');
  }
}

export class TargetAccessTokenStrategy extends AuthNStrategy<TargetAccessTokenSession> {
  private logger: Logger;
  private tokensConfig: TokensConfig;

  constructor(deps: { logger: Logger; tokensConfig: TokensConfig }) {
    super();
    this.logger = deps.logger.child({ module: 'TargetAccessTokenStrategy' });
    this.tokensConfig = deps.tokensConfig;
  }

  async parse(args: {
    req: FastifyRequest;
    reply: FastifyReply;
  }): Promise<TargetAccessTokenSession | null> {
    this.logger.debug('Attempt to resolve an API token from headers');
    let accessToken: string | undefined;

    for (const headerName in args.req.headers) {
      if (headerName.toLowerCase() === 'x-api-token') {
        const values = args.req.headers[headerName];
        const singleValue = Array.isArray(values) ? values[0] : values;

        if (singleValue && singleValue !== '') {
          this.logger.debug(
            'Found X-API-Token header (length=%d, token=%s)',
            singleValue.length,
            maskToken(singleValue),
          );
          accessToken = singleValue;
          break;
        }
      } else if (headerName.toLowerCase() === 'authorization') {
        const values = args.req.headers[headerName];
        const singleValue = Array.isArray(values) ? values[0] : values;

        if (singleValue && singleValue !== '') {
          const bearer = singleValue.replace(/^Bearer\s+/i, '');

          // Skip if bearer is missing or it's JWT generated by Auth0 (not API token)
          if (bearer && bearer !== '' && !bearer.includes('.')) {
            this.logger.debug(
              'Found Authorization header (length=%d, token=%s)',
              bearer.length,
              maskToken(bearer),
            );
            accessToken = bearer;
            break;
          }
        }
      }
    }

    if (!accessToken) {
      this.logger.debug('No access token found');
      return null;
    }

    const tokens = new TokenStorage(this.logger, this.tokensConfig, {
      requestId: args.req.headers['x-request-id'] as string,
    } as any);

    const result = await tokens.getToken({ token: accessToken });

    this.logger.debug('TargetAccessToken session resolved successfully');

    return new TargetAccessTokenSession(
      {
        organizationId: result.organization,
        projectId: result.project,
        targetId: result.target,
        token: accessToken,
        policies: transformAccessTokenLegacyScopes({
          organizationId: result.organization,
          targetId: result.target,
          scopes: result.scopes as Array<
            OrganizationAccessScope | ProjectAccessScope | TargetAccessScope
          >,
        }),
      },
      {
        logger: args.req.log,
      },
    );
  }
}

function transformAccessTokenLegacyScopes(args: {
  organizationId: string;
  targetId: string;
  scopes: Array<OrganizationAccessScope | ProjectAccessScope | TargetAccessScope>;
}): Array<AuthorizationPolicyStatement> {
  const policies: Array<AuthorizationPolicyStatement> = [];
  for (const policy of args.scopes) {
    switch (policy) {
      case TargetAccessScope.REGISTRY_READ: {
        policies.push(
          {
            effect: 'allow',
            action: ['schemaCheck:create'],
            resource: [`hrn:${args.organizationId}:target/${args.targetId}`],
          },
          {
            effect: 'allow',
            action: ['organization:describe', 'project:describe', 'laboratory:describe'],
            resource: [`hrn:${args.organizationId}:organization/${args.organizationId}`],
          },
        );
        break;
      }
      case TargetAccessScope.REGISTRY_WRITE: {
        policies.push(
          {
            effect: 'allow',
            action: [
              'appDeployment:create',
              'appDeployment:publish',
              'appDeployment:retire',
              'schemaVersion:publish',
              'schemaVersion:deleteService',
              'schemaVersion:publish',
            ],
            resource: [`hrn:${args.organizationId}:target/${args.targetId}`],
          },
          {
            effect: 'allow',
            action: ['organization:describe', 'project:describe'],
            resource: [`hrn:${args.organizationId}:organization/${args.organizationId}`],
          },
        );
        break;
      }
    }
  }

  return policies;
}
