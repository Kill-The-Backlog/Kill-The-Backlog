import { CaretUpDownIcon, GitBranchIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import invariant from "tiny-invariant";

import type {
  loader as branchesLoader,
  GitHubBranchItem,
} from "#routes/_signed_in/api/repos/$owner/$repo/branches/_route.js";

import { Button } from "#components/ui/button.js";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "#components/ui/command.js";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "#components/ui/empty.js";
import { Skeleton } from "#components/ui/skeleton.js";

export function BranchPicker({
  className,
  defaultBranch,
  onChange,
  repoFullName,
  value,
}: {
  className?: string;
  defaultBranch: null | string;
  onChange: (branchName: string) => void;
  repoFullName: null | string;
  value: null | string;
}) {
  const [open, setOpen] = useState(false);
  const fetcher = useFetcher<typeof branchesLoader>();

  // Drop the previous repo's branches when the repo changes so they don't
  // briefly show when the picker opens for the new repo. Intentionally
  // keyed only on repoFullName — including `fetcher` would loop because
  // reset() mutates fetcher state, which gives a new fetcher reference.
  useEffect(() => {
    fetcher.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoFullName]);

  useEffect(() => {
    if (!open || !repoFullName) return;
    if (fetcher.data || fetcher.state !== "idle") return;
    const [owner, repo] = repoFullName.split("/");
    invariant(owner && repo, "Invalid repo full name");
    void fetcher.load(
      `/api/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches`,
    );
  }, [open, fetcher, repoFullName]);

  const branches = fetcher.data?.branches;
  const sortedBranches = branches
    ? sortBranchesByDefault(branches, defaultBranch)
    : undefined;

  if (!repoFullName) {
    return (
      <Button className={className} disabled type="button" variant="secondary">
        <GitBranchIcon data-icon="inline-start" />
        <span className="max-w-40 truncate">Select a branch</span>
        <CaretUpDownIcon data-icon="inline-end" />
      </Button>
    );
  }

  return (
    <>
      <Button
        className={className}
        onMouseDown={() => {
          setOpen(true);
        }}
        type="button"
        variant="secondary"
      >
        <GitBranchIcon data-icon="inline-start" />
        <span className="max-w-40 truncate">{value ?? "Select a branch"}</span>
        <CaretUpDownIcon data-icon="inline-end" />
      </Button>
      <CommandDialog
        className="sm:max-w-lg"
        description="Choose a branch as the base for this session."
        onOpenChange={setOpen}
        open={open}
        title="Select a branch"
      >
        <Command value={value ?? undefined}>
          <CommandInput placeholder="Search branches..." />
          <CommandList>
            {!sortedBranches ? (
              <BranchListSkeleton />
            ) : sortedBranches.length > 0 ? (
              <>
                <CommandEmpty>No branches match your search.</CommandEmpty>
                {sortedBranches.map((branch) => (
                  <CommandItem
                    data-checked={branch.name === value}
                    key={branch.name}
                    onSelect={() => {
                      onChange(branch.name);
                      setOpen(false);
                    }}
                    value={branch.name}
                  >
                    <GitBranchIcon className="size-3.5" />
                    <span className="truncate text-xs font-medium">
                      {branch.name}
                    </span>
                  </CommandItem>
                ))}
              </>
            ) : (
              <EmptyBranches />
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}

function EmptyBranches() {
  return (
    <Empty className="py-10">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <GitBranchIcon />
        </EmptyMedia>
        <EmptyTitle>No branches found</EmptyTitle>
        <EmptyDescription>
          This repository has no branches available.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function sortBranchesByDefault(
  branches: GitHubBranchItem[],
  defaultBranch: null | string,
): GitHubBranchItem[] {
  if (!defaultBranch) return branches;
  const defaultIndex = branches.findIndex(
    (branch) => branch.name === defaultBranch,
  );
  if (defaultIndex === -1) return branches;
  return [
    branches[defaultIndex]!,
    ...branches.slice(0, defaultIndex),
    ...branches.slice(defaultIndex + 1),
  ];
}

const SKELETON_WIDTHS = ["w-32", "w-48", "w-24", "w-40", "w-36", "w-44"];

function BranchListSkeleton() {
  return (
    <div className="py-1">
      {Array.from({ length: 6 }, (_, i) => (
        <div className="flex items-center gap-2 px-2 py-2" key={i}>
          <Skeleton className="size-3.5 rounded" />
          <Skeleton className={`h-3.5 ${SKELETON_WIDTHS[i]}`} />
        </div>
      ))}
    </div>
  );
}
