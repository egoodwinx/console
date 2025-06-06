import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { FragmentType, graphql, useFragment } from '@/gql';
import { Link, useRouter } from '@tanstack/react-router';

const ProjectSelector_OrganizationConnectionFragment = graphql(`
  fragment ProjectSelector_OrganizationConnectionFragment on OrganizationConnection {
    nodes {
      id
      slug
      projects {
        edges {
          node {
            id
            slug
          }
        }
      }
    }
  }
`);

export function ProjectSelector(props: {
  currentOrganizationSlug: string;
  currentProjectSlug: string;
  organizations: FragmentType<typeof ProjectSelector_OrganizationConnectionFragment> | null;
}) {
  const router = useRouter();

  const organizations = useFragment(
    ProjectSelector_OrganizationConnectionFragment,
    props.organizations,
  )?.nodes;

  const currentOrganization = organizations?.find(
    node => node.slug === props.currentOrganizationSlug,
  );

  const projectEdges = currentOrganization?.projects.edges;
  const currentProject = projectEdges?.find(
    edge => edge.node.slug === props.currentProjectSlug,
  )?.node;

  return (
    <>
      {currentOrganization ? (
        <Link
          to="/$organizationSlug"
          params={{ organizationSlug: props.currentOrganizationSlug }}
          className="max-w-[200px] shrink-0 truncate font-medium"
        >
          {currentOrganization.slug}
        </Link>
      ) : (
        <div className="h-5 w-48 max-w-[200px] animate-pulse rounded-full bg-gray-800" />
      )}
      {projectEdges?.length && currentProject ? (
        <>
          <div className="italic text-gray-500">/</div>
          <Select
            value={props.currentProjectSlug}
            onValueChange={id => {
              void router.navigate({
                to: '/$organizationSlug/$projectSlug',
                params: {
                  organizationSlug: props.currentOrganizationSlug,
                  projectSlug: id,
                },
              });
            }}
          >
            <SelectTrigger variant="default" data-cy="project-picker-trigger">
              <div className="font-medium" data-cy="project-picker-current">
                {currentProject.slug}
              </div>
            </SelectTrigger>
            <SelectContent>
              {projectEdges.map(edge => (
                <SelectItem
                  key={edge.node.slug}
                  value={edge.node.slug}
                  data-cy={`project-picker-option-${edge.node.slug}`}
                >
                  {edge.node.slug}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      ) : (
        <div className="h-5 w-48 animate-pulse rounded-full bg-gray-800" />
      )}
    </>
  );
}
