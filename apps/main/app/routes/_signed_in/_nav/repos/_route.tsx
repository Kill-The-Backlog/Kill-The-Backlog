import { Outlet } from "react-router";

import type { BreadcrumbHandle } from "#lib/route-handle.js";

export const handle: BreadcrumbHandle = {
  breadcrumb: () => ({ label: "Repos", to: "/repos" }),
};

export default function Route() {
  return <Outlet />;
}
