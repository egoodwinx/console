import type {
  Organization,
  OrganizationGetStarted,
  OrganizationInvitation,
} from '../../shared/entities';
import { OrganizationAccessToken } from './providers/organization-access-tokens';
import { OrganizationMemberRole } from './providers/organization-member-roles';
import { OrganizationMembership } from './providers/organization-members';

export type OrganizationConnectionMapper = readonly Organization[];
export type OrganizationMapper = Organization;
export type MemberRoleMapper = OrganizationMemberRole;
export type OrganizationGetStartedMapper = OrganizationGetStarted;
export type OrganizationInvitationMapper = OrganizationInvitation;
export type MemberMapper = OrganizationMembership;
export type OrganizationAccessTokenMapper = OrganizationAccessToken;
