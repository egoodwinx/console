import { formatISO } from 'date-fns/formatISO';
import { subHours } from 'date-fns/subHours';
import { ProjectType } from 'testkit/gql/graphql';
import { waitFor } from '../../testkit/flow';
import { initSeed } from '../../testkit/seed';

test.concurrent(
  'X-API-Token header should work when calling GraphQL API and collecting usage',
  async () => {
    const { createOrg } = await initSeed().createOwner();
    const { inviteAndJoinMember, createProject } = await createOrg();
    await inviteAndJoinMember();
    const {
      createTargetAccessToken,
      readOperationsStats,
      readOperationBody,
      waitForOperationsCollected,
    } = await createProject(ProjectType.Single);
    const { publishSchema, collectLegacyOperations: collectOperations } =
      await createTargetAccessToken({});

    const result = await publishSchema({
      sdl: `type Query { ping: String }`,
      headerName: 'x-api-token',
    }).then(r => r.expectNoGraphQLErrors());
    expect(result.schemaPublish.__typename).toBe('SchemaPublishSuccess');

    const collectResult = await collectOperations(
      [
        {
          operation: 'query ping { ping }',
          operationName: 'ping',
          fields: ['Query', 'Query.ping'],
          execution: {
            ok: true,
            duration: 200_000_000,
            errorsTotal: 0,
          },
        },
      ],
      'x-api-token',
    );

    expect(collectResult.status).toEqual(200);

    await waitForOperationsCollected(1);

    const from = formatISO(subHours(Date.now(), 6));
    const to = formatISO(Date.now());
    const operationsStats = await readOperationsStats(from, to);
    expect(operationsStats.operations.edges).toHaveLength(1);

    const op = operationsStats.operations.edges[0].node;
    expect(op.count).toEqual(1);
    await expect(readOperationBody(op.operationHash!)).resolves.toEqual('query ping{ping}');
    expect(op.operationHash).toBeDefined();
    expect(op.duration.p75).toEqual(200);
    expect(op.duration.p90).toEqual(200);
    expect(op.duration.p95).toEqual(200);
    expect(op.duration.p99).toEqual(200);
    expect(op.kind).toEqual('query');
    expect(op.name).toMatch('ping');
    expect(op.percentage).toBeGreaterThan(99);
  },
);
