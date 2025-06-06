import { hash } from '../../../shared/helpers';
import { OperationsManager } from '../providers/operations-manager';
import type { ClientStatsResolvers } from './../../../__generated__/types';

export const ClientStats: ClientStatsResolvers = {
  totalRequests: ({ organization, project, target, period, clientName }, _, { injector }) => {
    return injector.get(OperationsManager).countRequestsAndFailures({
      organizationId: organization,
      projectId: project,
      targetId: target,
      period,
      clients: clientName === 'unknown' ? ['unknown', ''] : [clientName],
    });
  },
  totalVersions: ({ organization, project, target, period, clientName }, _, { injector }) => {
    return injector.get(OperationsManager).countClientVersions({
      organizationId: organization,
      projectId: project,
      targetId: target,
      period,
      clientName,
    });
  },
  requestsOverTime: (
    { organization, project, target, period, clientName },
    { resolution },
    { injector },
  ) => {
    return injector.get(OperationsManager).readRequestsOverTime({
      targetId: target,
      projectId: project,
      organizationId: organization,
      period,
      resolution,
      clients: clientName === 'unknown' ? ['unknown', ''] : [clientName],
    });
  },
  operations: async (
    { organization, project, target, period, clientName },
    _args,
    { injector },
  ) => {
    const operationsManager = injector.get(OperationsManager);
    const [operations, durations] = await Promise.all([
      operationsManager.readOperationsStats({
        organizationId: organization,
        projectId: project,
        targetId: target,
        period,
        clients: clientName === 'unknown' ? ['unknown', ''] : [clientName],
      }),
      operationsManager.readDetailedDurationMetrics({
        organizationId: organization,
        projectId: project,
        targetId: target,
        period,
        clients: clientName === 'unknown' ? ['unknown', ''] : [clientName],
      }),
    ]);

    const nodes = await operations
      .map(op => {
        return {
          id: hash(`${op.operationName}__${op.operationHash}`),
          kind: op.kind,
          name: op.operationName,
          count: op.count,
          countOk: op.countOk,
          percentage: op.percentage,
          duration: durations.get(op.operationHash)!,
          operationHash: op.operationHash,
        };
      })
      .sort((a, b) => b.count - a.count);

    return {
      edges: nodes.map(node => ({ node, cursor: '' })),
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        endCursor: '',
        startCursor: '',
      },
    };
  },
  versions: ({ organization, project, target, period, clientName }, { limit }, { injector }) => {
    return injector.get(OperationsManager).readClientVersions({
      targetId: target,
      projectId: project,
      organizationId: organization,
      period,
      clientName,
      limit,
    });
  },
};
