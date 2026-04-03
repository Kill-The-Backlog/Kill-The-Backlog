export type BreadcrumbHandle<LoaderData = unknown> = {
  breadcrumb: (loaderData: LoaderData) => {
    label: string;
    to: string;
  };
};

export function hasBreadcrumbHandle(
  handle: unknown,
): handle is BreadcrumbHandle {
  return (
    handle != null &&
    typeof handle === "object" &&
    "breadcrumb" in handle &&
    typeof handle.breadcrumb === "function"
  );
}
