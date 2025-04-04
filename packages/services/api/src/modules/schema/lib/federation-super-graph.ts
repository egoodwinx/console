import {
  Kind,
  NamedTypeNode,
  TypeNode,
  visit,
  type ConstArgumentNode,
  type ConstDirectiveNode,
  type DocumentNode,
  type EnumValueDefinitionNode,
  type FieldDefinitionNode,
  type NameNode,
} from 'graphql';
import { traceInlineSync } from '@hive/service-common';
import { extractLinkImplementations } from '@theguild/federation-composition';

export type SuperGraphInformation = {
  /** Mapping of schema coordinate to the services that own it. */
  schemaCoordinateServicesMappings: Map<string, Array<string>>;
  /** Metadata mapped by field name */
  schemaCoordinateMetadataMappings: Map<
    string,
    Array<{ name: string; content: string; source: string | null }>
  > | null;
  metadataAttributes: Array<{ name: string; values: string[] }> | null;
};

/**
 * Extracts the super graph information from the GraphQL schema AST.
 */
export const extractSuperGraphInformation = traceInlineSync(
  'Extract Supergraph Info',
  {},
  (documentAst: DocumentNode): Pick<SuperGraphInformation, 'schemaCoordinateServicesMappings'> => {
    const schemaCoordinateServicesMappings = new Map<string, Array<string>>();

    const serviceEnumValueToServiceNameMappings = new Map<string, string>();
    const schemaCoordinateToServiceEnumValueMappings = new Map<string, Set<string>>();

    const { resolveImportName } = extractLinkImplementations(documentAst);
    const joinFieldDirectiveName = resolveImportName('https://specs.apollo.dev/join', '@field');
    const joinGraphName = resolveImportName('https://specs.apollo.dev/join', 'Graph');
    const joinGraphDirectiveName = resolveImportName('https://specs.apollo.dev/join', '@graph');
    const joinTypeDirectiveName = resolveImportName('https://specs.apollo.dev/join', '@type');
    const joinEnumTypeDirectiveName = resolveImportName(
      'https://specs.apollo.dev/join',
      '@enumValue',
    );

    function getJoinGraphEnumServiceName(enumValueDefinitionNode: EnumValueDefinitionNode) {
      const arg = enumValueDefinitionNode.directives
        ?.find(directive => directive.name.value === joinGraphDirectiveName)
        ?.arguments?.find(argument => argument.name.value === 'name');
      if (arg === undefined) {
        return null;
      }
      return getStringValueArgumentValue(arg);
    }

    // START -- Federation 1.0 support - this can be removed once we ship Federation 2.0 by default.
    const potentialTypeServiceOwners = new Map<string, string>();
    const typeFieldMappings = new Map<string, Set<string>>();
    // END -- Federation 1.0 support

    function interfaceAndObjectHandler(node: {
      readonly fields?: ReadonlyArray<FieldDefinitionNode> | undefined;
      readonly directives?: ReadonlyArray<ConstDirectiveNode> | undefined;
      readonly name: NameNode;
    }) {
      const objectTypeServiceReferences = new Set(
        getJoinTypeEnumServiceName({
          directives: node.directives ?? [],
          joinDirectiveName: joinTypeDirectiveName,
        }),
      );

      if (node.fields === undefined) {
        return false;
      }

      // START -- Federation 1.0 support - this can be removed once we ship Federation 2.0 by default.
      const typeFields = new Set<string>();
      // END -- Federation 1.0 support

      for (const fieldNode of node.fields) {
        const schemaCoordinate = `${node.name.value}.${fieldNode.name.value}`;

        const joinField = fieldNode.directives?.find(
          directive =>
            directive.name.value === joinFieldDirectiveName &&
            !directive.arguments?.find(
              arg =>
                arg.name.value === 'usedOverridden' &&
                arg.value.kind === Kind.BOOLEAN &&
                arg.value.value === true,
            ),
        );
        const graphArg = joinField?.arguments?.find(arg => arg.name.value === 'graph');

        if (graphArg === undefined) {
          schemaCoordinateToServiceEnumValueMappings.set(
            schemaCoordinate,
            objectTypeServiceReferences,
          );

          // START -- Federation 1.0 support - this can be removed once we ship Federation 2.0 by default.
          typeFields.add(fieldNode.name.value);
          // END -- Federation 1.0 support

          continue;
        }

        const serviceEnumValue = getEnumValueArgumentValue(graphArg);

        if (!serviceEnumValue) {
          continue;
        }

        schemaCoordinateToServiceEnumValueMappings.set(
          schemaCoordinate,
          new Set([serviceEnumValue]),
        );

        // START -- Federation 1.0 support - this can be removed once we ship Federation 2.0 by default.
        objectTypeServiceReferences.add(serviceEnumValue);

        const fieldTypeName = unwrapTypeNode(fieldNode.type).name.value;
        potentialTypeServiceOwners.set(fieldTypeName, serviceEnumValue);
        // END -- Federation 1.0 support
      }

      schemaCoordinateToServiceEnumValueMappings.set(node.name.value, objectTypeServiceReferences);

      // START -- Federation 1.0 support - this can be removed once we ship Federation 2.0 by default.
      if (typeFields.size) {
        typeFieldMappings.set(node.name.value, typeFields);
      }
      // END -- Federation 1.0 support

      return false;
    }

    visit(documentAst, {
      /** Collect the service enum to service name mappings. */
      EnumTypeDefinition(node) {
        if (node.name.value === joinGraphName && node.values?.length) {
          for (const enumValueNode of node.values) {
            const serviceName = getJoinGraphEnumServiceName(enumValueNode);
            if (serviceName === null) {
              continue;
            }

            serviceEnumValueToServiceNameMappings.set(enumValueNode.name.value, serviceName);
          }
        }

        const enumServiceNames = getJoinTypeEnumServiceName({
          directives: node.directives ?? [],
          joinDirectiveName: joinTypeDirectiveName,
        });

        if (enumServiceNames.size) {
          schemaCoordinateToServiceEnumValueMappings.set(node.name.value, enumServiceNames);
        }

        if (node.values?.length) {
          for (const enumValueNode of node.values) {
            const enumValueServiceNames = getJoinTypeEnumServiceName({
              directives: enumValueNode.directives ?? [],
              joinDirectiveName: joinEnumTypeDirectiveName,
            });

            if (enumValueServiceNames.size) {
              const schemaCoordinate = `${node.name.value}.${enumValueNode.name.value}`;
              schemaCoordinateToServiceEnumValueMappings.set(
                schemaCoordinate,
                enumValueServiceNames,
              );
            }
          }
        }

        return false;
      },
      ObjectTypeDefinition(node) {
        return interfaceAndObjectHandler(node);
      },
      InterfaceTypeDefinition(node) {
        return interfaceAndObjectHandler(node);
      },
      UnionTypeDefinition(node) {
        const serviceReferences = new Set(
          getJoinTypeEnumServiceName({
            directives: node.directives ?? [],
            joinDirectiveName: joinTypeDirectiveName,
          }),
        );

        schemaCoordinateToServiceEnumValueMappings.set(node.name.value, serviceReferences);
      },
      InputObjectTypeDefinition(node) {
        const serviceReferences = new Set(
          getJoinTypeEnumServiceName({
            directives: node.directives ?? [],
            joinDirectiveName: joinTypeDirectiveName,
          }),
        );

        schemaCoordinateToServiceEnumValueMappings.set(node.name.value, serviceReferences);

        if (!node.fields?.length) {
          return false;
        }

        for (const fieldNode of node.fields) {
          const schemaCoordinate = `${node.name.value}.${fieldNode.name.value}`;

          const graphArg = fieldNode.directives
            ?.find(directive => directive.name.value === joinFieldDirectiveName)
            ?.arguments?.find(arg => arg.name.value === 'graph');

          if (graphArg === undefined) {
            schemaCoordinateToServiceEnumValueMappings.set(schemaCoordinate, serviceReferences);
            continue;
          }

          const serviceEnumValue = getEnumValueArgumentValue(graphArg);

          if (!serviceEnumValue) {
            continue;
          }

          schemaCoordinateToServiceEnumValueMappings.set(
            schemaCoordinate,
            new Set([serviceEnumValue]),
          );
        }

        return false;
      },
      ScalarTypeDefinition(node) {
        const objectTypeServiceReferences = new Set(
          getJoinTypeEnumServiceName({
            directives: node.directives ?? [],
            joinDirectiveName: joinTypeDirectiveName,
          }),
        );

        if (objectTypeServiceReferences.size) {
          schemaCoordinateToServiceEnumValueMappings.set(
            node.name.value,
            objectTypeServiceReferences,
          );
        }
      },
    });

    for (const [
      schemaCoordinate,
      serviceEnumValues,
    ] of schemaCoordinateToServiceEnumValueMappings) {
      const serviceNames = new Set<string>();
      for (const serviceEnumValue of serviceEnumValues) {
        const serviceName = serviceEnumValueToServiceNameMappings.get(serviceEnumValue);
        if (serviceName) {
          serviceNames.add(serviceName);
        }
      }

      if (!serviceNames.size) {
        continue;
      }

      schemaCoordinateServicesMappings.set(schemaCoordinate, Array.from(serviceNames));
    }

    // START -- Federation 1.0 support - this can be removed once we ship Federation 2.0 by default.
    for (const [typeName, serviceEnumValue] of potentialTypeServiceOwners) {
      if (schemaCoordinateServicesMappings.has(typeName)) {
        continue;
      }

      const fields = typeFieldMappings.get(typeName);

      if (fields === undefined) {
        continue;
      }

      const serviceName = serviceEnumValueToServiceNameMappings.get(serviceEnumValue);
      if (serviceName === undefined) {
        continue;
      }

      schemaCoordinateServicesMappings.set(typeName, [serviceName]);

      for (const fieldName of fields) {
        schemaCoordinateServicesMappings.set(`${typeName}.${fieldName}`, [serviceName]);
      }
    }
    // END -- Federation 1.0 support

    return { schemaCoordinateServicesMappings };
  },
);

function getJoinTypeEnumServiceName(args: {
  directives: ReadonlyArray<ConstDirectiveNode>;
  joinDirectiveName: string;
}) {
  if (!args.directives?.length) {
    return new Set<string>();
  }
  const enumServiceValues = new Set<string>();
  for (const directiveNode of args.directives) {
    if (directiveNode.name.value !== args.joinDirectiveName) {
      continue;
    }

    const nameArgNode = directiveNode.arguments?.find(argument => argument.name.value === 'graph');

    if (nameArgNode === undefined) {
      continue;
    }

    const enumServiceValue = getEnumValueArgumentValue(nameArgNode);

    if (enumServiceValue === null) {
      continue;
    }

    enumServiceValues.add(enumServiceValue);
  }

  return enumServiceValues;
}

function getEnumValueArgumentValue(arg: ConstArgumentNode): string | null {
  if (arg.value.kind !== Kind.ENUM) {
    return null;
  }

  return arg.value.value;
}

function getStringValueArgumentValue(arg: ConstArgumentNode): string | null {
  if (arg.value.kind !== Kind.STRING) {
    return null;
  }

  return arg.value.value;
}

function unwrapTypeNode(node: TypeNode): NamedTypeNode {
  let innerNode = node;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (innerNode.kind === Kind.NAMED_TYPE) {
      return innerNode;
    }
    innerNode = innerNode.type;
  }
}
