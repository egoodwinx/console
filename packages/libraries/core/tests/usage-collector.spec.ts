import { buildSchema, parse } from 'graphql';
import { createCollector } from '../src/client/usage';

const schema = buildSchema(/* GraphQL */ `
  type Query {
    project(selector: ProjectSelectorInput!): Project
    projectsByType(type: ProjectType!): [Project!]!
    projectsByTypes(types: [ProjectType!]!): [Project!]!
    projects(filter: FilterInput, and: [FilterInput!]): [Project!]!
    projectsByMetadata(metadata: JSON): [Project!]!
  }

  type Mutation {
    deleteProject(selector: ProjectSelectorInput!): DeleteProjectPayload!
  }

  input ProjectSelectorInput {
    organization: ID!
    project: ID!
  }

  input FilterInput {
    type: ProjectType
    pagination: PaginationInput
    order: [ProjectOrderByInput!]
    metadata: JSON
  }

  input PaginationInput {
    limit: Int
    offset: Int
  }

  input ProjectOrderByInput {
    field: String!
    direction: OrderDirection
  }

  enum OrderDirection {
    ASC
    DESC
  }

  type ProjectSelector {
    organization: ID!
    project: ID!
  }

  type DeleteProjectPayload {
    selector: ProjectSelector!
    deletedProject: Project!
  }

  type Project {
    id: ID!
    cleanId: ID!
    name: String!
    type: ProjectType!
    buildUrl: String
    validationUrl: String
  }

  enum ProjectType {
    FEDERATION
    STITCHING
    SINGLE
  }

  scalar JSON
`);

const op = parse(/* GraphQL */ `
  mutation deleteProject($selector: ProjectSelectorInput!) {
    deleteProject(selector: $selector) {
      selector {
        organization
        project
      }
      deletedProject {
        ...ProjectFields
      }
    }
  }

  fragment ProjectFields on Project {
    id
    cleanId
    name
    type
  }
`);

test('collect fields', async () => {
  const collect = createCollector({
    schema,
    max: 1,
  });
  const info$ = await collect(op, {});
  const info = await info$.value;

  expect(info.fields).toMatchInlineSnapshot(`
    [
      Mutation.deleteProject,
      Mutation.deleteProject.selector,
      DeleteProjectPayload.selector,
      ProjectSelector.organization,
      ProjectSelector.project,
      DeleteProjectPayload.deletedProject,
      Project.id,
      Project.cleanId,
      Project.name,
      Project.type,
      ProjectType.FEDERATION,
      ProjectType.STITCHING,
      ProjectType.SINGLE,
      ProjectSelectorInput.organization,
      ID,
      ProjectSelectorInput.project,
    ]
  `);
});

test('collect input object types', async () => {
  const collect = createCollector({
    schema,
    max: 1,
  });
  const info$ = await collect(op, {});
  const info = await info$.value;

  expect(info.fields).toMatchInlineSnapshot(`
    [
      Mutation.deleteProject,
      Mutation.deleteProject.selector,
      DeleteProjectPayload.selector,
      ProjectSelector.organization,
      ProjectSelector.project,
      DeleteProjectPayload.deletedProject,
      Project.id,
      Project.cleanId,
      Project.name,
      Project.type,
      ProjectType.FEDERATION,
      ProjectType.STITCHING,
      ProjectType.SINGLE,
      ProjectSelectorInput.organization,
      ID,
      ProjectSelectorInput.project,
    ]
  `);
});

test('collect enums and scalars as inputs', async () => {
  const collect = createCollector({
    schema,
    max: 1,
  });
  const info$ = await collect(
    parse(/* GraphQL */ `
      query getProjects($limit: Int!, $type: ProjectType!) {
        projects(filter: { pagination: { limit: $limit }, type: $type }) {
          id
        }
      }
    `),
    {},
  );
  const info = await info$.value;

  expect(info.fields).toMatchInlineSnapshot(`
    [
      Query.projects,
      Query.projects.filter!,
      Query.projects.filter,
      Project.id,
      Int,
      ProjectType.FEDERATION,
      ProjectType.STITCHING,
      ProjectType.SINGLE,
      FilterInput.pagination!,
      FilterInput.pagination,
      FilterInput.type,
      PaginationInput.limit,
    ]
  `);
});

test('collect scalars as hard-coded inputs', async () => {
  const collect = createCollector({
    schema,
    max: 1,
  });
  const info$ = await collect(
    parse(/* GraphQL */ `
      {
        projects(filter: { pagination: { limit: 20 } }) {
          id
        }
      }
    `),
    {},
  );
  const info = await info$.value;

  expect(info.fields).toMatchInlineSnapshot(`
    [
      Query.projects,
      Query.projects.filter!,
      Query.projects.filter,
      Project.id,
      FilterInput.pagination!,
      FilterInput.pagination,
      Int,
      PaginationInput.limit!,
      PaginationInput.limit,
    ]
  `);
});

test('collect enum values from object fields', async () => {
  const collect = createCollector({
    schema,
    max: 1,
  });
  const info$ = await collect(
    parse(/* GraphQL */ `
      query getProjects($limit: Int!) {
        projects(filter: { pagination: { limit: $limit }, type: FEDERATION }) {
          id
        }
      }
    `),
    { limit: 10 },
  );
  const info = await info$.value;

  expect(info.fields).toMatchInlineSnapshot(`
    [
      Query.projects,
      Query.projects.filter!,
      Query.projects.filter,
      Project.id,
      Int,
      FilterInput.pagination!,
      FilterInput.pagination,
      FilterInput.type!,
      FilterInput.type,
      PaginationInput.limit!,
      PaginationInput.limit,
      ProjectType.FEDERATION,
    ]
  `);
});

test('collect enum values from arguments', async () => {
  const collect = createCollector({
    schema,
    max: 1,
  });
  const info$ = await collect(
    parse(/* GraphQL */ `
      query getProjects {
        projectsByType(type: FEDERATION) {
          id
        }
      }
    `),
    {},
  );
  const info = await info$.value;

  expect(info.fields).toMatchInlineSnapshot(`
    [
      Query.projectsByType,
      Query.projectsByType.type!,
      Query.projectsByType.type,
      Project.id,
      ProjectType.FEDERATION,
    ]
  `);
});

test('collect arguments', async () => {
  const collect = createCollector({
    schema,
    max: 1,
  });
  const info$ = await collect(
    parse(/* GraphQL */ `
      query getProjects($limit: Int!, $type: ProjectType!) {
        projects(filter: { pagination: { limit: $limit }, type: $type }) {
          id
        }
      }
    `),
    {},
  );
  const info = await info$.value;

  expect(info.fields).toMatchInlineSnapshot(`
    [
      Query.projects,
      Query.projects.filter!,
      Query.projects.filter,
      Project.id,
      Int,
      ProjectType.FEDERATION,
      ProjectType.STITCHING,
      ProjectType.SINGLE,
      FilterInput.pagination!,
      FilterInput.pagination,
      FilterInput.type,
      PaginationInput.limit,
    ]
  `);
});

test('skips argument directives', async () => {
  const collect = createCollector({
    schema,
    max: 1,
  });
  const info$ = await collect(
    parse(/* GraphQL */ `
      query getProjects($limit: Int!, $type: ProjectType!, $includeName: Boolean!) {
        projects(filter: { pagination: { limit: $limit }, type: $type }) {
          id
          ...NestedFragment
        }
      }

      fragment NestedFragment on Project {
        ...IncludeNameFragment @include(if: $includeName)
      }

      fragment IncludeNameFragment on Project {
        name
      }
    `),
    {},
  );
  const info = await info$.value;

  expect(info.fields).toMatchInlineSnapshot(`
    [
      Query.projects,
      Query.projects.filter!,
      Query.projects.filter,
      Project.id,
      Project.name,
      Int,
      ProjectType.FEDERATION,
      ProjectType.STITCHING,
      ProjectType.SINGLE,
      Boolean,
      FilterInput.pagination!,
      FilterInput.pagination,
      FilterInput.type,
      PaginationInput.limit,
    ]
  `);
});

test('collect used-only input fields', async () => {
  const collect = createCollector({
    schema,
    max: 1,
  });
  const info$ = await collect(
    parse(/* GraphQL */ `
      query getProjects($limit: Int!, $type: ProjectType!) {
        projects(filter: { pagination: { limit: $limit }, type: $type }) {
          id
        }
      }
    `),
    {},
  );
  const info = await info$.value;

  expect(info.fields).toMatchInlineSnapshot(`
    [
      Query.projects,
      Query.projects.filter!,
      Query.projects.filter,
      Project.id,
      Int,
      ProjectType.FEDERATION,
      ProjectType.STITCHING,
      ProjectType.SINGLE,
      FilterInput.pagination!,
      FilterInput.pagination,
      FilterInput.type,
      PaginationInput.limit,
    ]
  `);
});

test('collect all input fields when `processVariables` has not been passed and input is passed as a variable', async () => {
  const collect = createCollector({
    schema,
    max: 1,
  });
  const info$ = await collect(
    parse(/* GraphQL */ `
      query getProjects($pagination: PaginationInput!, $type: ProjectType!) {
        projects(filter: { pagination: $pagination, type: $type }) {
          id
        }
      }
    `),
    {},
  );
  const info = await info$.value;

  expect(info.fields).toMatchInlineSnapshot(`
    [
      Query.projects,
      Query.projects.filter!,
      Query.projects.filter,
      Project.id,
      PaginationInput.limit,
      Int,
      PaginationInput.offset,
      ProjectType.FEDERATION,
      ProjectType.STITCHING,
      ProjectType.SINGLE,
      FilterInput.pagination,
      FilterInput.type,
    ]
  `);
});

test('collect entire input object type used as variable', async () => {
  const collect = createCollector({
    schema,
    max: 1,
  });
  const info$ = await collect(
    parse(/* GraphQL */ `
      query getProjects($filter: FilterInput) {
        projects(filter: $filter) {
          name
        }
      }
    `),
    {},
  );
  const info = await info$.value;

  expect(info.fields).toMatchInlineSnapshot(`
    [
      Query.projects,
      Query.projects.filter,
      Project.name,
      FilterInput.type,
      ProjectType.FEDERATION,
      ProjectType.STITCHING,
      ProjectType.SINGLE,
      FilterInput.pagination,
      PaginationInput.limit,
      Int,
      PaginationInput.offset,
      FilterInput.order,
      ProjectOrderByInput.field,
      String,
      ProjectOrderByInput.direction,
      OrderDirection.ASC,
      OrderDirection.DESC,
      FilterInput.metadata,
      JSON,
    ]
  `);
});

test('collect entire input object type used as variable (list)', async () => {
  const collect = createCollector({
    schema,
    max: 1,
  });
  const info$ = await collect(
    parse(/* GraphQL */ `
      query getProjects($filter: FilterInput) {
        projects(and: $filter) {
          name
        }
      }
    `),
    {},
  );
  const info = await info$.value;

  expect(info.fields).toMatchInlineSnapshot(`
    [
      Query.projects,
      Query.projects.and,
      Project.name,
      FilterInput.type,
      ProjectType.FEDERATION,
      ProjectType.STITCHING,
      ProjectType.SINGLE,
      FilterInput.pagination,
      PaginationInput.limit,
      Int,
      PaginationInput.offset,
      FilterInput.order,
      ProjectOrderByInput.field,
      String,
      ProjectOrderByInput.direction,
      OrderDirection.ASC,
      OrderDirection.DESC,
      FilterInput.metadata,
      JSON,
    ]
  `);
});

test('collect used input fields (list)', async () => {
  const collect = createCollector({
    schema,
    max: 1,
  });
  const info$ = await collect(
    parse(/* GraphQL */ `
      query getProjects($pagination: PaginationInput) {
        projects(and: { pagination: $pagination, type: FEDERATION }) {
          name
        }
      }
    `),
    {},
  );
  const info = await info$.value;

  expect(info.fields).toMatchInlineSnapshot(`
    [
      Query.projects,
      Query.projects.and!,
      Query.projects.and,
      Project.name,
      PaginationInput.limit,
      Int,
      PaginationInput.offset,
      FilterInput.pagination,
      FilterInput.type!,
      FilterInput.type,
      ProjectType.FEDERATION,
    ]
  `);
});

test('enum values as list', async () => {
  const collect = createCollector({
    schema,
    max: 1,
  });
  const info$ = await collect(
    parse(/* GraphQL */ `
      query getProjects {
        projectsByTypes(types: [FEDERATION, STITCHING]) {
          name
        }
      }
    `),
    {},
  );
  const info = await info$.value;

  expect(info.fields).toMatchInlineSnapshot(`
    [
      Query.projectsByTypes,
      Query.projectsByTypes.types!,
      Query.projectsByTypes.types,
      Project.name,
      ProjectType.FEDERATION,
      ProjectType.STITCHING,
    ]
  `);
});

test('custom scalar as argument (inlined)', async () => {
  const collect = createCollector({
    schema,
    max: 1,
  });
  const info$ = await collect(
    parse(/* GraphQL */ `
      query getProjects {
        projectsByMetadata(metadata: { key: { value: "value" } }) {
          name
        }
      }
    `),
    {},
  );
  const info = await info$.value;

  expect(info.fields).toMatchInlineSnapshot(`
    [
      Query.projectsByMetadata,
      Query.projectsByMetadata.metadata!,
      Query.projectsByMetadata.metadata,
      Project.name,
      JSON,
    ]
  `);
});

test('custom scalar as argument (variable)', async () => {
  const collect = createCollector({
    schema,
    max: 1,
  });
  const info$ = await collect(
    parse(/* GraphQL */ `
      query getProjects($metadata: JSON) {
        projectsByMetadata(metadata: $metadata) {
          name
        }
      }
    `),
    {},
  );
  const info = await info$.value;

  expect(info.fields).toMatchInlineSnapshot(`
    [
      Query.projectsByMetadata,
      Query.projectsByMetadata.metadata,
      Project.name,
      JSON,
    ]
  `);
});

// TODO: same but with processVariables: true
test('custom scalar as an argument (variable with default value)', async () => {
  const collect = createCollector({
    schema,
    max: 1,
  });
  const info$ = await collect(
    parse(/* GraphQL */ `
      query getProjects($metadata: JSON = { key: { value: "value" } }) {
        projectsByMetadata(metadata: $metadata) {
          name
        }
      }
    `),
    {},
  );
  const info = await info$.value;

  expect(info.fields).toMatchInlineSnapshot(`
    [
      Query.projectsByMetadata,
      Query.projectsByMetadata.metadata,
      Project.name,
      JSON,
    ]
  `);
});

test('custom scalar in input object field (inlined)', async () => {
  const collect = createCollector({
    schema,
    max: 1,
  });
  const info$ = await collect(
    parse(/* GraphQL */ `
      query getProjects {
        projects(filter: { metadata: { key: "value" } }) {
          name
        }
      }
    `),
    {},
  );
  const info = await info$.value;

  expect(info.fields).toMatchInlineSnapshot(`
    [
      Query.projects,
      Query.projects.filter!,
      Query.projects.filter,
      Project.name,
      FilterInput.metadata!,
      FilterInput.metadata,
      JSON,
    ]
  `);
});

test('custom scalar in input object field (variable)', async () => {
  const collect = createCollector({
    schema,
    max: 1,
  });
  const info$ = await collect(
    parse(/* GraphQL */ `
      query getProjects($metadata: JSON) {
        projects(filter: { metadata: $metadata }) {
          name
        }
      }
    `),
    {},
  );
  const info = await info$.value;

  expect(info.fields).toMatchInlineSnapshot(`
    [
      Query.projects,
      Query.projects.filter!,
      Query.projects.filter,
      Project.name,
      JSON,
      FilterInput.metadata,
    ]
  `);
});

test('custom scalar in input object field (variable)', async () => {
  const collect = createCollector({
    schema,
    max: 1,
  });
  const info$ = await collect(
    parse(/* GraphQL */ `
      query getProjects($metadata: JSON = { key: { value: "value" } }) {
        projects(filter: { metadata: $metadata }) {
          name
        }
      }
    `),
    {},
  );
  const info = await info$.value;

  expect(info.fields).toMatchInlineSnapshot(`
    [
      Query.projects,
      Query.projects.filter!,
      Query.projects.filter,
      Project.name,
      JSON,
      FilterInput.metadata,
    ]
  `);
});

//

test('should get a cache hit when document is the same but variables are different (by default)', async () => {
  const collect = createCollector({
    schema,
    max: 1,
  });
  const doc = parse(/* GraphQL */ `
    query getProjects($pagination: PaginationInput!, $type: ProjectType!) {
      projects(filter: { pagination: $pagination, type: $type }) {
        id
      }
    }
  `);
  const first = await collect(doc, {
    pagination: {
      limit: 1,
    },
    type: 'STITCHING',
  });

  const second = await collect(doc, {
    pagination: {
      offset: 2,
    },
    type: 'STITCHING',
  });

  expect(first.cacheHit).toBe(false);
  expect(second.cacheHit).toBe(true);
});

test('(processVariables: true) should get a cache miss when document is the same but variables are different', async () => {
  const collect = createCollector({
    schema,
    max: 1,
    processVariables: true,
  });
  const doc = parse(/* GraphQL */ `
    query getProjects($pagination: PaginationInput!, $type: ProjectType!) {
      projects(filter: { pagination: $pagination, type: $type }) {
        id
      }
    }
  `);
  const first = await collect(doc, {
    pagination: {
      limit: 1,
    },
    type: 'STITCHING',
  });

  const second = await collect(doc, {
    pagination: {
      offset: 2,
    },
    type: 'STITCHING',
  });

  const third = await collect(doc, {
    pagination: {
      offset: 2,
    },
    type: 'STITCHING',
  });

  expect(first.cacheHit).toBe(false);
  expect(second.cacheHit).toBe(false);
  expect(third.cacheHit).toBe(true);
});

test('(processVariables: true) collect used-only input fields', async () => {
  const collect = createCollector({
    schema,
    max: 1,
    processVariables: true,
  });
  const info$ = await collect(
    parse(/* GraphQL */ `
      query getProjects($pagination: PaginationInput!, $type: ProjectType!) {
        projects(filter: { pagination: $pagination, type: $type }) {
          id
        }
      }
    `),
    {
      pagination: {
        limit: 1,
      },
      type: 'STITCHING',
    },
  );
  const info = await info$.value;

  expect(info.fields).toMatchInlineSnapshot(`
    [
      Query.projects,
      Query.projects.filter!,
      Query.projects.filter,
      Project.id,
      PaginationInput.limit!,
      PaginationInput.limit,
      Int,
      ProjectType.FEDERATION,
      ProjectType.STITCHING,
      ProjectType.SINGLE,
      FilterInput.pagination!,
      FilterInput.pagination,
      FilterInput.type!,
      FilterInput.type,
    ]
  `);
});

test('(processVariables: true) should collect input object without fields when corresponding variable is not provided', async () => {
  const collect = createCollector({
    schema,
    max: 1,
    processVariables: true,
  });
  const info$ = await collect(
    parse(/* GraphQL */ `
      query getProjects($pagination: PaginationInput, $type: ProjectType!) {
        projects(filter: { pagination: $pagination, type: $type }) {
          id
        }
      }
    `),
    {
      type: 'STITCHING',
    },
  );
  const info = await info$.value;

  expect(info.fields).toMatchInlineSnapshot(`
    [
      PaginationInput,
      Query.projects,
      Query.projects.filter!,
      Query.projects.filter,
      Project.id,
      ProjectType.FEDERATION,
      ProjectType.STITCHING,
      ProjectType.SINGLE,
      FilterInput.pagination,
      FilterInput.type!,
      FilterInput.type,
    ]
  `);
});

test('(processVariables: true) collect used-only input type fields from an array', async () => {
  const collect = createCollector({
    schema,
    max: 1,
    processVariables: true,
  });
  const info$ = await collect(
    parse(/* GraphQL */ `
      query getProjects($filter: FilterInput) {
        projects(filter: $filter) {
          id
        }
      }
    `),
    {
      filter: {
        order: [
          {
            field: 'name',
          },
          {
            field: 'buildUrl',
            direction: 'DESC',
          },
        ],
        pagination: {
          limit: 10,
        },
      },
    },
  );
  const info = await info$.value;

  expect(info.fields).toMatchInlineSnapshot(`
    [
      Query.projects,
      Query.projects.filter!,
      Query.projects.filter,
      Project.id,
      FilterInput.order!,
      FilterInput.order,
      FilterInput.pagination!,
      FilterInput.pagination,
      ProjectOrderByInput.field!,
      ProjectOrderByInput.field,
      ProjectOrderByInput.direction!,
      ProjectOrderByInput.direction,
      String,
      OrderDirection.ASC,
      OrderDirection.DESC,
      PaginationInput.limit!,
      PaginationInput.limit,
      Int,
    ]
  `);
});

test('(processVariables: true) custom scalar as argument (variable)', async () => {
  const collect = createCollector({
    schema,
    max: 1,
    processVariables: true,
  });
  const info$ = await collect(
    parse(/* GraphQL */ `
      query getProjects($metadata: JSON) {
        projectsByMetadata(metadata: $metadata) {
          name
        }
      }
    `),
    {
      metadata: {
        key: {
          value: 'value',
        },
      },
    },
  );
  const info = await info$.value;

  expect(info.fields).toMatchInlineSnapshot(`
    [
      Query.projectsByMetadata,
      Query.projectsByMetadata.metadata!,
      Query.projectsByMetadata.metadata,
      Project.name,
      JSON,
    ]
  `);
});

test('(processVariables: true) custom scalar as an argument (variable with default value)', async () => {
  const collect = createCollector({
    schema,
    max: 1,
  });
  const info$ = await collect(
    parse(/* GraphQL */ `
      query getProjects($metadata: JSON = { key: { value: "value" } }) {
        projectsByMetadata(metadata: $metadata) {
          name
        }
      }
    `),
    {
      metadata: {
        key: {
          value: 'value',
        },
      },
    },
  );
  const info = await info$.value;

  expect(info.fields).toMatchInlineSnapshot(`
    [
      Query.projectsByMetadata,
      Query.projectsByMetadata.metadata!,
      Query.projectsByMetadata.metadata,
      Project.name,
      JSON,
    ]
  `);
});

test('(processVariables: true) custom scalar in input object field (variable)', async () => {
  const collect = createCollector({
    schema,
    max: 1,
    processVariables: true,
  });
  const info$ = await collect(
    parse(/* GraphQL */ `
      query getProjects($metadata: JSON) {
        projects(filter: { metadata: $metadata }) {
          name
        }
      }
    `),
    {
      metadata: {
        key: {
          value: 'value',
        },
      },
    },
  );
  const info = await info$.value;

  expect(info.fields).toMatchInlineSnapshot(`
    [
      Query.projects,
      Query.projects.filter!,
      Query.projects.filter,
      Project.name,
      JSON,
      FilterInput.metadata!,
      FilterInput.metadata,
    ]
  `);
});

test('(processVariables: true) custom scalar in input object field (variable)', async () => {
  const collect = createCollector({
    schema,
    max: 1,
    processVariables: true,
  });
  const info$ = await collect(
    parse(/* GraphQL */ `
      query getProjects($metadata: JSON = { key: { value: "value" } }) {
        projects(filter: { metadata: $metadata }) {
          name
        }
      }
    `),
    {
      metadata: {
        value: 'key',
      },
    },
  );
  const info = await info$.value;

  expect(info.fields).toMatchInlineSnapshot(`
    [
      Query.projects,
      Query.projects.filter!,
      Query.projects.filter,
      Project.name,
      JSON,
      FilterInput.metadata!,
      FilterInput.metadata,
    ]
  `);
});
