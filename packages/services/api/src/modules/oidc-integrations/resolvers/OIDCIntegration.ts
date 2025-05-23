import { OrganizationMemberRoles } from '../../organization/providers/organization-member-roles';
import { OIDCIntegrationsProvider } from '../providers/oidc-integrations.provider';
import type { OidcIntegrationResolvers } from './../../../__generated__/types';

export const OIDCIntegration: OidcIntegrationResolvers = {
  id: oidcIntegration => oidcIntegration.id,
  tokenEndpoint: oidcIntegration => oidcIntegration.tokenEndpoint,
  userinfoEndpoint: oidcIntegration => oidcIntegration.userinfoEndpoint,
  authorizationEndpoint: oidcIntegration => oidcIntegration.authorizationEndpoint,
  clientId: oidcIntegration => oidcIntegration.clientId,
  clientSecretPreview: (oidcIntegration, _, { injector }) =>
    injector.get(OIDCIntegrationsProvider).getClientSecretPreview(oidcIntegration),
  /**
   * Fallbacks to Viewer if default member role is not set
   */
  defaultMemberRole: async (oidcIntegration, _, { injector }) => {
    if (oidcIntegration.defaultMemberRoleId) {
      const role = await injector
        .get(OrganizationMemberRoles)
        .findMemberRoleById(oidcIntegration.defaultMemberRoleId);

      if (!role) {
        throw new Error(
          `Default role not found (role_id=${oidcIntegration.defaultMemberRoleId}, organization=${oidcIntegration.linkedOrganizationId})`,
        );
      }

      return role;
    }

    const role = await injector
      .get(OrganizationMemberRoles)
      .findViewerRoleByOrganizationId(oidcIntegration.linkedOrganizationId);

    if (!role) {
      throw new Error(
        `Viewer role not found (organization=${oidcIntegration.linkedOrganizationId})`,
      );
    }

    return role;
  },
};
