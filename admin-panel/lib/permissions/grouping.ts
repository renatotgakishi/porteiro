import type { Permission } from "@/lib/api/permissions";

export type PermissionNode = {
  id: string;
  key: string;
  action: string;
  description: string;
};

export type ResourceGroup = {
  resource: string;
  label: string;
  permissions: PermissionNode[];
};

export type DomainGroup = {
  domain: string;
  label: string;
  resources: ResourceGroup[];
};

const DOMAIN_LABELS: Record<string, string> = {
  iam: "IAM",
  platform: "Plataforma",
  catalog: "Catálogo",
};

const RESOURCE_LABELS: Record<string, string> = {
  users: "Usuários",
  roles: "Papéis",
  permissions: "Permissões",
  tenants: "Inquilinos",
  categories: "Categorias",
  products: "Produtos",
};

function labelForDomain(domain: string): string {
  return DOMAIN_LABELS[domain] ?? domain.charAt(0).toUpperCase() + domain.slice(1);
}

function labelForResource(resource: string): string {
  return RESOURCE_LABELS[resource] ?? resource.charAt(0).toUpperCase() + resource.slice(1);
}

/**
 * Divide uma permission no formato `<domain>.<resource>.<action>`.
 * Se não tiver 3 partes, devolve domínio "outros".
 */
function parseKey(key: string): {
  domain: string;
  resource: string;
  action: string;
} {
  const parts = key.split(".");
  if (parts.length !== 3) {
    return { domain: "outros", resource: "geral", action: key };
  }
  return { domain: parts[0], resource: parts[1], action: parts[2] };
}

export function buildTree(permissions: Permission[]): DomainGroup[] {
  const domains = new Map<string, Map<string, PermissionNode[]>>();

  for (const p of permissions) {
    const { domain, resource, action } = parseKey(p.key);

    if (!domains.has(domain)) domains.set(domain, new Map());
    const resources = domains.get(domain)!;

    if (!resources.has(resource)) resources.set(resource, []);
    resources.get(resource)!.push({
      id: p.id,
      key: p.key,
      action,
      description: p.description ?? "",
    });
  }

  const result: DomainGroup[] = [];

  for (const [domain, resources] of domains) {
    const resourceList: ResourceGroup[] = [];
    for (const [resource, perms] of resources) {
      perms.sort((a, b) => a.action.localeCompare(b.action));
      resourceList.push({
        resource,
        label: labelForResource(resource),
        permissions: perms,
      });
    }
    resourceList.sort((a, b) => a.resource.localeCompare(b.resource));
    result.push({
      domain,
      label: labelForDomain(domain),
      resources: resourceList,
    });
  }

  result.sort((a, b) => a.domain.localeCompare(b.domain));
  return result;
}