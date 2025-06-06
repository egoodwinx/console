import { graphql } from './gql';
import type {
  AddAlertChannelInput,
  AddAlertInput,
  AnswerOrganizationTransferRequestInput,
  AssignMemberRoleInput,
  CreateMemberRoleInput,
  CreateOrganizationAccessTokenInput,
  CreateOrganizationInput,
  CreateProjectInput,
  CreateTargetInput,
  CreateTokenInput,
  DeleteMemberRoleInput,
  DeleteTokensInput,
  EnableExternalSchemaCompositionInput,
  Experimental__UpdateTargetSchemaCompositionInput,
  InviteToOrganizationByEmailInput,
  OrganizationSelectorInput,
  OrganizationTransferRequestSelector,
  RateLimitInput,
  RequestOrganizationTransferInput,
  SchemaCheckInput,
  SchemaDeleteInput,
  SchemaPublishInput,
  TargetSelectorInput,
  UpdateBaseSchemaInput,
  UpdateMemberRoleInput,
  UpdateOrganizationSlugInput,
  UpdateProjectSlugInput,
  UpdateTargetConditionalBreakingChangeConfigurationInput,
  UpdateTargetSlugInput,
} from './gql/graphql';
import * as GraphQLSchema from './gql/graphql';
import { execute } from './graphql';

export function waitFor(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function pollInternal(
  check: () => Promise<boolean>,

  /** In milliseconds */
  pollFrequency: number,

  /** In milliseconds */
  maxWait: number,

  /** In milliseconds. A random number between 0 and Jitter is added to the pollFrequency to add some
   * noise and prevent test cases where exact durations are required.
   * */
  jitter: number,

  resolve: (value: void | PromiseLike<void>) => void,
  reject: (reason?: any) => void,

  /** In milliseconds */
  startTime: number = Date.now(),
) {
  setTimeout(
    async () => {
      try {
        const passes = await check();
        if (passes) {
          resolve();
        } else {
          const waited = Date.now() - startTime;
          if (waited > maxWait) {
            reject(new Error(`Polling failed. Condition was not satisfied within ${maxWait}ms`));
          } else {
            pollInternal(check, pollFrequency, maxWait, jitter, resolve, reject, startTime);
          }
        }
      } catch (e) {
        reject(e);
      }
    },
    Math.round(pollFrequency + Math.random() * jitter),
  );
}

export function pollFor(
  check: () => Promise<boolean>,
  opts?: { pollFrequency?: number; maxWait?: number; jitter?: number },
): Promise<void> {
  return new Promise((resolve, reject) => {
    pollInternal(
      check,
      opts?.pollFrequency ?? 500,
      opts?.maxWait ?? 10_000,
      opts?.jitter ?? 100,
      resolve,
      reject,
    );
  });
}

export function createOrganization(input: CreateOrganizationInput, authToken: string) {
  return execute({
    document: graphql(`
      mutation createOrganization($input: CreateOrganizationInput!) {
        createOrganization(input: $input) {
          ok {
            createdOrganizationPayload {
              organization {
                id
                slug
                owner {
                  id
                  role {
                    id
                    permissions
                  }
                }
                memberRoles {
                  edges {
                    node {
                      id
                      name
                      isLocked
                    }
                  }
                }
                rateLimit {
                  retentionInDays
                }
              }
            }
          }
          error {
            message
            inputErrors {
              slug
            }
          }
        }
      }
    `),
    authToken,
    variables: {
      input,
    },
  });
}

export function getOrganization(organizationSlug: string, authToken: string) {
  return execute({
    document: graphql(`
      query getOrganization($organizationSlug: String!) {
        organization(reference: { bySelector: { organizationSlug: $organizationSlug } }) {
          id
          slug
          getStarted {
            creatingProject
            publishingSchema
            checkingSchema
            invitingMembers
            reportingOperations
            enablingUsageBasedBreakingChanges
          }
        }
      }
    `),
    authToken,
    variables: {
      organizationSlug,
    },
  });
}

export function inviteToOrganization(input: InviteToOrganizationByEmailInput, authToken: string) {
  return execute({
    document: graphql(`
      mutation inviteToOrganization($input: InviteToOrganizationByEmailInput!) {
        inviteToOrganizationByEmail(input: $input) {
          ok {
            createdOrganizationInvitation {
              id
              createdAt
              expiresAt
              email
              code
            }
          }
          error {
            message
          }
        }
      }
    `),
    variables: {
      input,
    },
    authToken,
  });
}

export function updateOrganizationSlug(input: UpdateOrganizationSlugInput, authToken: string) {
  return execute({
    document: graphql(`
      mutation updateOrganizationSlug($input: UpdateOrganizationSlugInput!) {
        updateOrganizationSlug(input: $input) {
          ok {
            updatedOrganizationPayload {
              selector {
                organizationSlug
              }
              organization {
                id
                name
                slug
              }
            }
          }
          error {
            message
          }
        }
      }
    `),
    variables: {
      input,
    },
    authToken,
  });
}

export function joinOrganization(code: string, authToken: string) {
  return execute({
    document: graphql(`
      mutation joinOrganization($code: String!) {
        joinOrganization(code: $code) {
          __typename
          ... on OrganizationPayload {
            organization {
              id
              slug
              me {
                id
                user {
                  id
                }
                role {
                  id
                  name
                  permissions
                }
              }
            }
          }
          ... on OrganizationInvitationError {
            message
          }
        }
      }
    `),
    authToken,
    variables: {
      code,
    },
  });
}

export function getOrganizationMembers(selector: OrganizationSelectorInput, authToken: string) {
  return execute({
    document: graphql(`
      query getOrganizationMembers($selector: OrganizationSelectorInput!) {
        organization(reference: { bySelector: $selector }) {
          members {
            edges {
              node {
                id
                user {
                  id
                  email
                }
                role {
                  id
                  name
                  permissions
                }
              }
            }
          }
        }
      }
    `),
    authToken,
    variables: {
      selector,
    },
  });
}

export function getOrganizationProjects(selector: OrganizationSelectorInput, authToken: string) {
  return execute({
    document: graphql(`
      query getOrganizationProjects($selector: OrganizationSelectorInput!) {
        organization(reference: { bySelector: $selector }) {
          projects {
            edges {
              node {
                id
                slug
                name
              }
            }
          }
        }
      }
    `),
    authToken,
    variables: {
      selector,
    },
  });
}

export function getOrganizationTransferRequest(
  selector: OrganizationTransferRequestSelector,
  authToken: string,
) {
  return execute({
    document: graphql(`
      query getOrganizationTransferRequest($selector: OrganizationTransferRequestSelector!) {
        organizationTransferRequest(selector: $selector) {
          organization {
            id
          }
        }
      }
    `),
    authToken,
    variables: {
      selector,
    },
  });
}

export function requestOrganizationTransfer(
  input: RequestOrganizationTransferInput,
  authToken: string,
) {
  return execute({
    document: graphql(`
      mutation requestOrganizationTransfer($input: RequestOrganizationTransferInput!) {
        requestOrganizationTransfer(input: $input) {
          ok {
            email
            code
          }
          error {
            message
          }
        }
      }
    `),
    authToken,
    variables: {
      input,
    },
  });
}

export function answerOrganizationTransferRequest(
  input: AnswerOrganizationTransferRequestInput,
  authToken: string,
) {
  return execute({
    document: graphql(`
      mutation answerOrganizationTransferRequest($input: AnswerOrganizationTransferRequestInput!) {
        answerOrganizationTransferRequest(input: $input) {
          ok {
            accepted
          }
          error {
            message
          }
        }
      }
    `),
    authToken,
    variables: {
      input,
    },
  });
}

export function createProject(input: CreateProjectInput, authToken: string) {
  return execute({
    document: graphql(`
      mutation createProject($input: CreateProjectInput!) {
        createProject(input: $input) {
          ok {
            createdProject {
              id
              slug
              name
            }
            createdTargets {
              id
              slug
              name
            }
          }
        }
      }
    `),
    authToken,
    variables: {
      input,
    },
  });
}

export function updateProjectSlug(input: UpdateProjectSlugInput, authToken: string) {
  return execute({
    document: graphql(`
      mutation updateProjectSlug($input: UpdateProjectSlugInput!) {
        updateProjectSlug(input: $input) {
          ok {
            updatedProject {
              id
              name
              slug
            }
          }
          error {
            message
          }
        }
      }
    `),
    authToken,
    variables: {
      input,
    },
  });
}

export function createTarget(input: CreateTargetInput, authToken: string) {
  return execute({
    document: graphql(`
      mutation createTarget($input: CreateTargetInput!) {
        createTarget(input: $input) {
          ok {
            createdTarget {
              id
              slug
            }
          }
          error {
            message
          }
        }
      }
    `),
    authToken,
    variables: {
      input,
    },
  });
}

export function updateTargetSlug(input: UpdateTargetSlugInput, authToken: string) {
  return execute({
    document: graphql(`
      mutation updateTargetSlug($input: UpdateTargetSlugInput!) {
        updateTargetSlug(input: $input) {
          ok {
            selector {
              organizationSlug
              projectSlug
              targetSlug
            }
            target {
              id
              slug
              name
            }
          }
          error {
            message
          }
        }
      }
    `),
    authToken,
    variables: {
      input,
    },
  });
}

export function createToken(input: CreateTokenInput, authToken: string) {
  return execute({
    document: graphql(`
      mutation createToken($input: CreateTokenInput!) {
        createToken(input: $input) {
          ok {
            secret
            createdToken {
              id
            }
          }
        }
      }
    `),
    authToken,
    variables: {
      input,
    },
  });
}

export function deleteTokens(input: DeleteTokensInput, authToken: string) {
  return execute({
    document: graphql(`
      mutation deleteTokens($input: DeleteTokensInput!) {
        deleteTokens(input: $input) {
          deletedTokens
        }
      }
    `),
    authToken,
    variables: {
      input,
    },
  });
}

export function readTokenInfo(token: string) {
  return execute({
    document: graphql(`
      query readTokenInfo {
        tokenInfo {
          __typename
          ... on TokenInfo {
            hasOrganizationRead: hasOrganizationScope(scope: READ)
            hasOrganizationDelete: hasOrganizationScope(scope: DELETE)
            hasOrganizationSettings: hasOrganizationScope(scope: SETTINGS)
            hasOrganizationIntegrations: hasOrganizationScope(scope: INTEGRATIONS)
            hasOrganizationMembers: hasOrganizationScope(scope: MEMBERS)
            hasProjectRead: hasProjectScope(scope: READ)
            hasProjectDelete: hasProjectScope(scope: DELETE)
            hasProjectSettings: hasProjectScope(scope: SETTINGS)
            hasProjectAlerts: hasProjectScope(scope: ALERTS)
            hasProjectOperationsStoreRead: hasProjectScope(scope: OPERATIONS_STORE_READ)
            hasProjectOperationsStoreWrite: hasProjectScope(scope: OPERATIONS_STORE_WRITE)
            hasTargetRead: hasTargetScope(scope: READ)
            hasTargetDelete: hasTargetScope(scope: DELETE)
            hasTargetSettings: hasTargetScope(scope: SETTINGS)
            hasTargetRegistryRead: hasTargetScope(scope: REGISTRY_READ)
            hasTargetRegistryWrite: hasTargetScope(scope: REGISTRY_WRITE)
            hasTargetTokensRead: hasTargetScope(scope: TOKENS_READ)
            hasTargetTokensWrite: hasTargetScope(scope: TOKENS_WRITE)
          }
          ... on TokenNotFoundError {
            message
          }
        }
      }
    `),
    token,
  });
}

export function addAlertChannel(input: AddAlertChannelInput, authToken: string) {
  return execute({
    document: graphql(`
      mutation IntegrationTests_AddAlertChannel($input: AddAlertChannelInput!) {
        addAlertChannel(input: $input) {
          ok {
            addedAlertChannel {
              id
              name
              type
              ... on AlertSlackChannel {
                channel
              }
              ... on AlertWebhookChannel {
                endpoint
              }
              ... on TeamsWebhookChannel {
                endpoint
              }
            }
          }
          error {
            message
            inputErrors {
              webhookEndpoint
              slackChannel
              name
            }
          }
        }
      }
    `),
    variables: {
      input,
    },
    authToken,
  });
}

export function addAlert(input: AddAlertInput, authToken: string) {
  return execute({
    document: graphql(`
      mutation IntegrationTests_AddAlert($input: AddAlertInput!) {
        addAlert(input: $input) {
          ok {
            addedAlert {
              id
              type
              channel {
                id
                name
                type
              }
              target {
                id
                slug
              }
            }
          }
          error {
            message
          }
        }
      }
    `),
    variables: {
      input,
    },
    authToken,
  });
}

export function readOrganizationInfo(
  selector: {
    organizationSlug: string;
  },
  authToken: string,
) {
  return execute({
    document: graphql(`
      query readOrganizationInfo($selector: OrganizationSelectorInput!) {
        organization(reference: { bySelector: $selector }) {
          id
          slug
        }
      }
    `),
    authToken,
    variables: {
      selector,
    },
  });
}

export function readProjectInfo(
  selector: {
    organizationSlug: string;
    projectSlug: string;
  },
  authToken: string,
) {
  return execute({
    document: graphql(`
      query readProjectInfo($selector: ProjectSelectorInput!) {
        project(reference: { bySelector: $selector }) {
          id
          slug
        }
      }
    `),
    authToken,
    variables: {
      selector,
    },
  });
}

export function readTargetInfo(
  selector: {
    organizationSlug: string;
    projectSlug: string;
    targetSlug: string;
  },
  authToken: string,
) {
  return execute({
    document: graphql(`
      query readTargetInfo($selector: TargetSelectorInput!) {
        target(reference: { bySelector: $selector }) {
          id
          slug
        }
      }
    `),
    authToken,
    variables: {
      selector,
    },
  });
}

export function createMemberRole(input: CreateMemberRoleInput, authToken: string) {
  return execute({
    document: graphql(`
      mutation createMemberRole($input: CreateMemberRoleInput!) {
        createMemberRole(input: $input) {
          ok {
            updatedOrganization {
              id
              slug
              memberRoles {
                edges {
                  node {
                    id
                    name
                    description
                    isLocked
                    permissions
                  }
                }
              }
            }
          }
          error {
            message
            inputErrors {
              name
              description
            }
          }
        }
      }
    `),
    authToken,
    variables: {
      input,
    },
  });
}

export function assignMemberRole(input: AssignMemberRoleInput, authToken: string) {
  return execute({
    document: graphql(`
      mutation assignMemberRole($input: AssignMemberRoleInput!) {
        assignMemberRole(input: $input) {
          ok {
            updatedMember {
              id
            }
          }
          error {
            message
          }
        }
      }
    `),
    authToken,
    variables: {
      input,
    },
  });
}

export function deleteMemberRole(input: DeleteMemberRoleInput, authToken: string) {
  return execute({
    document: graphql(`
      mutation deleteMemberRole($input: DeleteMemberRoleInput!) {
        deleteMemberRole(input: $input) {
          ok {
            updatedOrganization {
              id
              slug
              memberRoles {
                edges {
                  node {
                    id
                    name
                    description
                    isLocked
                    permissions
                  }
                }
              }
            }
          }
          error {
            message
          }
        }
      }
    `),
    authToken,
    variables: {
      input,
    },
  });
}

export function updateMemberRole(input: UpdateMemberRoleInput, authToken: string) {
  return execute({
    document: graphql(`
      mutation updateMemberRole($input: UpdateMemberRoleInput!) {
        updateMemberRole(input: $input) {
          ok {
            updatedRole {
              id
              name
              description
              isLocked
              permissions
            }
          }
          error {
            message
            inputErrors {
              name
              description
            }
          }
        }
      }
    `),
    authToken,
    variables: {
      input,
    },
  });
}

export function publishSchema(
  input: SchemaPublishInput,
  token: string,
  authHeader?: 'x-api-token' | 'authorization',
) {
  return execute({
    document: graphql(`
      mutation schemaPublish($input: SchemaPublishInput!) {
        schemaPublish(input: $input) {
          __typename
          ... on SchemaPublishSuccess {
            initial
            valid
            message
            linkToWebsite
            changes {
              nodes {
                message
                criticality
              }
              total
            }
          }
          ... on SchemaPublishError {
            valid
            linkToWebsite
            changes {
              nodes {
                message
                criticality
              }
              total
            }
            errors {
              nodes {
                message
              }
              total
            }
          }
        }
      }
    `),
    token,
    variables: {
      input,
    },
    legacyAuthorizationMode: authHeader === 'x-api-token',
  });
}

export function checkSchema(input: SchemaCheckInput, token: string) {
  return execute({
    document: graphql(`
      mutation schemaCheck($input: SchemaCheckInput!) {
        schemaCheck(input: $input) {
          ... on SchemaCheckSuccess {
            __typename
            valid
            changes {
              nodes {
                message
                criticality
              }
              total
            }
            schemaCheck {
              id
            }
          }
          ... on SchemaCheckError {
            __typename
            valid
            changes {
              nodes {
                message
                criticality
              }
              total
            }
            errors {
              nodes {
                message
              }
              total
            }
            schemaCheck {
              id
            }
          }
        }
      }
    `),
    token,
    variables: {
      input,
    },
  });
}

export function deleteSchema(
  input: SchemaDeleteInput,
  token: string,
  authHeader?: 'x-api-token' | 'authorization',
) {
  return execute({
    document: graphql(`
      mutation schemaDelete($input: SchemaDeleteInput!) {
        schemaDelete(input: $input) {
          __typename
          ... on SchemaDeleteSuccess {
            valid
            changes {
              nodes {
                criticality
                message
              }
              total
            }
            errors {
              nodes {
                message
              }
              total
            }
          }
          ... on SchemaDeleteError {
            valid
            errors {
              nodes {
                message
              }
              total
            }
          }
        }
      }
    `),
    token,
    variables: {
      input,
    },
    legacyAuthorizationMode: authHeader === 'x-api-token',
  });
}

export function updateTargetValidationSettings(
  input: UpdateTargetConditionalBreakingChangeConfigurationInput,
  access:
    | {
        token: string;
      }
    | {
        authToken: string;
      },
) {
  return execute({
    document: graphql(`
      mutation updateTargetConditionalBreakingChangeConfiguration(
        $input: UpdateTargetConditionalBreakingChangeConfigurationInput!
      ) {
        updateTargetConditionalBreakingChangeConfiguration(input: $input) {
          ok {
            target {
              id
              conditionalBreakingChangeConfiguration {
                isEnabled
                period
                percentage
                targets {
                  id
                }
                excludedClients
              }
            }
          }
          error {
            message
            inputErrors {
              percentage
              period
            }
          }
        }
      }
    `),
    ...access,
    variables: {
      input,
    },
  });
}

export function updateBaseSchema(input: UpdateBaseSchemaInput, token: string) {
  return execute({
    document: graphql(`
      mutation updateBaseSchema($input: UpdateBaseSchemaInput!) {
        updateBaseSchema(input: $input) {
          __typename
        }
      }
    `),
    token,
    variables: {
      input,
    },
  });
}

export function readClientStats(
  reference: GraphQLSchema.TargetReferenceInput,
  period: GraphQLSchema.DateRangeInput,
  clientName: string,
  token: string,
) {
  return execute({
    document: graphql(`
      query IntegrationTests_ClientStat(
        $reference: TargetReferenceInput!
        $period: DateRangeInput!
        $clientName: String!
      ) {
        target(reference: $reference) {
          clientStats(period: $period, clientName: $clientName) {
            totalRequests
            totalVersions
            operations {
              edges {
                node {
                  id
                  name
                  operationHash
                  count
                }
              }
            }
            versions(limit: 25) {
              version
              count
            }
          }
        }
      }
    `),
    token,
    variables: {
      reference,
      period,
      clientName,
    },
  });
}

export function readOperationsStats(
  target: GraphQLSchema.TargetReferenceInput,
  period: GraphQLSchema.DateRangeInput,
  filter: GraphQLSchema.OperationStatsFilterInput,
  token: string,
) {
  return execute({
    document: graphql(`
      query readOperationsStats(
        $target: TargetReferenceInput!
        $period: DateRangeInput!
        $filter: OperationStatsFilterInput
      ) {
        target(reference: $target) {
          operationsStats(period: $period, filter: $filter) {
            totalOperations
            operations {
              edges {
                node {
                  id
                  operationHash
                  kind
                  name
                  count
                  percentage
                  duration {
                    p75
                    p90
                    p95
                    p99
                  }
                }
              }
            }
            clients {
              edges {
                node {
                  name
                  versions {
                    version
                    count
                  }
                  count
                }
              }
            }
          }
        }
      }
    `),
    token,
    variables: {
      target,
      period,
      filter,
    },
  });
}

export function readOperationBody(
  selector: {
    organizationSlug: string;
    projectSlug: string;
    targetSlug: string;
    hash: string;
  },
  token: string,
) {
  return execute({
    document: graphql(`
      query readOperationBody($selector: TargetSelectorInput!, $hash: ID!) {
        target(reference: { bySelector: $selector }) {
          id
          operation(hash: $hash) {
            body
          }
        }
      }
    `),
    token,
    variables: {
      selector: {
        organizationSlug: selector.organizationSlug,
        projectSlug: selector.projectSlug,
        targetSlug: selector.targetSlug,
      },
      hash: selector.hash,
    },
  });
}

export function fetchLatestSchema(token: string) {
  return execute({
    document: graphql(`
      query latestVersion {
        latestVersion {
          baseSchema
          log {
            ... on PushedSchemaLog {
              __typename
              commit
              service
            }
            ... on DeletedSchemaLog {
              __typename
              deletedService
            }
          }
          schemas {
            nodes {
              ... on SingleSchema {
                source
                commit
              }
              ... on CompositeSchema {
                source
                commit
                url
              }
            }
            total
          }
          errors: schemaCompositionErrors {
            nodes {
              message
            }
            total
          }
        }
      }
    `),
    token,
  });
}

export function fetchLatestValidSchema(token: string) {
  return execute({
    document: graphql(`
      query latestValidVersion {
        latestValidVersion {
          id
          baseSchema
          log {
            ... on PushedSchemaLog {
              __typename
              commit
              service
            }
            ... on DeletedSchemaLog {
              __typename
              deletedService
            }
          }
          tags
          schemas {
            nodes {
              ... on SingleSchema {
                __typename
                source
                commit
              }
              ... on CompositeSchema {
                __typename
                source
                commit
                url
              }
            }
            total
          }
        }
      }
    `),
    token,
  });
}

export function fetchVersions(selector: TargetSelectorInput, first: number, token: string) {
  return execute({
    document: graphql(`
      query schemaVersions($first: Int!, $selector: TargetSelectorInput!) {
        target(reference: { bySelector: $selector }) {
          schemaVersions(first: $first) {
            edges {
              node {
                id
                valid
                date
                log {
                  ... on PushedSchemaLog {
                    __typename
                    commit
                    service
                  }
                  ... on DeletedSchemaLog {
                    __typename
                    deletedService
                  }
                }
                baseSchema
                schemas {
                  nodes {
                    ... on SingleSchema {
                      __typename
                      source
                      commit
                    }
                    ... on CompositeSchema {
                      __typename
                      source
                      commit
                      url
                    }
                  }
                }
              }
            }
          }
        }
      }
    `),
    token,
    variables: {
      selector,
      first,
    },
  });
}

export function compareToPreviousVersion(
  selector: {
    organizationSlug: string;
    projectSlug: string;
    targetSlug: string;
    version: string;
  },
  token: string,
) {
  return execute({
    document: graphql(`
      query compareToPreviousVersion(
        $organizationSlug: String!
        $projectSlug: String!
        $targetSlug: String!
        $version: ID!
      ) {
        target(
          reference: {
            bySelector: {
              organizationSlug: $organizationSlug
              projectSlug: $projectSlug
              targetSlug: $targetSlug
            }
          }
        ) {
          id
          schemaVersion(id: $version) {
            id
            sdl
            supergraph
            log {
              ... on PushedSchemaLog {
                id
                author
                service
                commit
                serviceSdl
                previousServiceSdl
              }
              ... on DeletedSchemaLog {
                id
                deletedService
                previousServiceSdl
              }
            }
            schemaCompositionErrors {
              nodes {
                message
              }
            }
            isFirstComposableVersion
            breakingSchemaChanges {
              nodes {
                message(withSafeBasedOnUsageNote: false)
                criticality
                criticalityReason
                path
                approval {
                  approvedBy {
                    id
                    displayName
                  }
                  approvedAt
                  schemaCheckId
                }
                isSafeBasedOnUsage
              }
            }
            safeSchemaChanges {
              nodes {
                message(withSafeBasedOnUsageNote: false)
                criticality
                criticalityReason
                path
                approval {
                  approvedBy {
                    id
                    displayName
                  }
                  approvedAt
                  schemaCheckId
                }
                isSafeBasedOnUsage
              }
            }
            previousDiffableSchemaVersion {
              id
              supergraph
              sdl
            }
          }
        }
      }
    `),
    token,
    variables: {
      ...selector,
    },
  });
}

export function createCdnAccess(selector: TargetSelectorInput, token: string) {
  return execute({
    document: graphql(`
      mutation createCdnAccessToken($input: CreateCdnAccessTokenInput!) {
        createCdnAccessToken(input: $input) {
          ok {
            secretAccessToken
            cdnUrl
          }
          error {
            message
          }
        }
      }
    `),
    token,
    variables: {
      input: { target: { bySelector: selector }, alias: 'CDN Access Token' },
    },
  });
}

export async function fetchSchemaFromCDN(cdnUrl: string, secretAccessToken: string) {
  const res = await fetch(cdnUrl + '/sdl', {
    headers: {
      'X-Hive-CDN-Key': secretAccessToken,
    },
  });

  return {
    body: await res.text(),
    status: res.status,
  };
}

export async function fetchSupergraphFromCDN(cdnUrl: string, secretAccessToken: string) {
  const res = await fetch(cdnUrl + '/supergraph', {
    headers: {
      'X-Hive-CDN-Key': secretAccessToken,
    },
  });

  const textBody = await res.text();

  return {
    body: textBody,
    status: res.status,
  };
}

export async function fetchMetadataFromCDN(cdnUrl: string, secretAccessToken: string) {
  const res = await fetch(cdnUrl + '/metadata', {
    headers: {
      Accept: 'application/json',
      'X-Hive-CDN-Key': secretAccessToken,
    },
  });

  const jsonBody = await res.json();

  return {
    body: jsonBody,
    status: res.status,
  };
}

export async function updateOrgRateLimit(
  selector: OrganizationSelectorInput,
  monthlyLimits: RateLimitInput,
  authToken: string,
) {
  return execute({
    document: graphql(`
      mutation updateOrgRateLimit(
        $selector: OrganizationSelectorInput!
        $monthlyLimits: RateLimitInput!
      ) {
        updateOrgRateLimit(selector: $selector, monthlyLimits: $monthlyLimits) {
          id
        }
      }
    `),
    variables: {
      selector,
      monthlyLimits,
    },
    authToken,
  });
}

export async function enableExternalSchemaComposition(
  input: EnableExternalSchemaCompositionInput,
  token: string,
) {
  return execute({
    document: graphql(`
      mutation enableExternalSchemaComposition($input: EnableExternalSchemaCompositionInput!) {
        enableExternalSchemaComposition(input: $input) {
          ok {
            id
            externalSchemaComposition {
              endpoint
            }
          }
          error {
            message
            inputErrors {
              endpoint
              secret
            }
          }
        }
      }
    `),
    variables: {
      input,
    },
    token,
  });
}

export async function updateTargetSchemaComposition(
  input: Experimental__UpdateTargetSchemaCompositionInput,
  token: string,
) {
  return execute({
    document: graphql(`
      mutation experimental__updateTargetSchemaComposition(
        $input: Experimental__UpdateTargetSchemaCompositionInput!
      ) {
        experimental__updateTargetSchemaComposition(input: $input) {
          id
        }
      }
    `),
    variables: {
      input,
    },
    token,
  });
}

export function createOrganizationAccessToken(
  input: CreateOrganizationAccessTokenInput,
  authToken: string,
) {
  return execute({
    document: graphql(`
      mutation CreateOrganizationAccessToken($input: CreateOrganizationAccessTokenInput!) {
        createOrganizationAccessToken(input: $input) {
          ok {
            privateAccessKey
            createdOrganizationAccessToken {
              id
              title
              description
              permissions
              createdAt
            }
          }
          error {
            message
            details {
              title
              description
            }
          }
        }
      }
    `),
    authToken,
    variables: {
      input,
    },
  });
}
