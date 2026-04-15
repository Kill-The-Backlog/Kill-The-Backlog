import type { BreadcrumbHandle } from "#lib/route-handle.js";

export const handle: BreadcrumbHandle = {
  breadcrumb: () => ({ label: "Repos", to: "/repos" }),
};
