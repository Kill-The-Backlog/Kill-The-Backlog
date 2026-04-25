import { CaretUpDownIcon, GithubLogoIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";

import type {
  GitHubRepoItem,
  loader as reposLoader,
} from "#routes/_signed_in/api/repos/_route.js";

import { PrivateBadge } from "#components/private-badge.js";
import { Avatar, AvatarFallback, AvatarImage } from "#components/ui/avatar.js";
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
import { getInitials } from "#lib/utils/get-initials.js";

export type { GitHubRepoItem };

export function RepoPicker({
  className,
  initialFullName,
  onChange,
  value,
}: {
  className?: string;
  initialFullName?: string | null;
  onChange: (repo: GitHubRepoItem) => void;
  value: GitHubRepoItem | null;
}) {
  const [open, setOpen] = useState(false);
  const fetcher = useFetcher<typeof reposLoader>();
  const hasFetched = useRef(false);
  const initialSelected = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && !hasFetched.current && fetcher.state === "idle") {
      hasFetched.current = true;
      void fetcher.load("/api/repos");
    }
  }, [open, fetcher]);

  const repos = fetcher.data?.repos;
  const isLoading = fetcher.state === "loading" || (open && !repos);

  useEffect(() => {
    if (
      !initialSelected.current &&
      initialFullName &&
      !value &&
      repos &&
      repos.length > 0
    ) {
      initialSelected.current = true;
      const matchedRepo = repos.find((r) => r.fullName === initialFullName);
      if (matchedRepo) {
        onChange(matchedRepo);
      }
    }
  }, [initialFullName, repos, value, onChange]);

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
        <GithubLogoIcon data-icon="inline-start" />
        {value ? value.fullName : "Select a repository"}
        <CaretUpDownIcon data-icon="inline-end" />
      </Button>
      <CommandDialog
        className="sm:max-w-lg"
        description="Choose a GitHub repository to work against."
        onOpenChange={setOpen}
        open={open}
        title="Select a repository"
      >
        <Command value={value?.fullName}>
          <CommandInput placeholder="Search repositories..." />
          <CommandList ref={listRef}>
            {isLoading ? (
              <RepoListSkeleton />
            ) : repos && repos.length > 0 ? (
              <>
                <CommandEmpty>No repositories match your search.</CommandEmpty>
                {repos.map((repo) => (
                  <CommandItem
                    key={repo.githubRepoId}
                    keywords={repo.description ? [repo.description] : []}
                    onSelect={() => {
                      onChange(repo);
                      setOpen(false);
                    }}
                    value={repo.fullName}
                  >
                    <Avatar size="sm">
                      <AvatarImage
                        alt={repo.ownerLogin}
                        src={repo.ownerAvatarUrl}
                      />
                      <AvatarFallback>
                        {getInitials(repo.ownerLogin)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-xs font-medium">
                          {repo.fullName}
                        </span>
                        {repo.isPrivate && <PrivateBadge />}
                      </div>
                      {repo.description && (
                        <p className="text-muted-foreground mt-0.5 truncate text-xs">
                          {repo.description}
                        </p>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </>
            ) : (
              <EmptyRepos />
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}

function EmptyRepos() {
  return (
    <Empty className="py-10">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <GithubLogoIcon />
        </EmptyMedia>
        <EmptyTitle>No repositories found</EmptyTitle>
        <EmptyDescription>
          No repositories found on your GitHub account.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

const SKELETON_NAME_WIDTHS = ["w-40", "w-56", "w-36", "w-48", "w-52", "w-44"];
const SKELETON_DESC_WIDTHS = ["w-64", "w-72", "w-56", "w-80", "w-60", "w-68"];

function RepoListSkeleton() {
  return (
    <div className="py-1">
      {Array.from({ length: 6 }, (_, i) => (
        <div className="flex items-center gap-2 px-2 py-2" key={i}>
          <Skeleton className="size-6 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className={`h-3.5 ${SKELETON_NAME_WIDTHS[i]}`} />
            <Skeleton className={`h-3 ${SKELETON_DESC_WIDTHS[i]}`} />
          </div>
        </div>
      ))}
    </div>
  );
}
