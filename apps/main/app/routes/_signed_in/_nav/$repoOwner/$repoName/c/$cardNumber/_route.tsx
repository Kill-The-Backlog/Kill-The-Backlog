import { XIcon } from "@phosphor-icons/react";
import { useQuery } from "@rocicorp/zero/react";
import { Link, Navigate, useOutletContext } from "react-router";

import { Avatar, AvatarFallback, AvatarImage } from "#components/ui/avatar.js";
import { Badge } from "#components/ui/badge.js";
import { Button } from "#components/ui/button.js";
import { Skeleton } from "#components/ui/skeleton.js";
import { queries } from "#zero/queries.js";

import type { RepoOutletContext } from "../../_route";
import type { Route } from "./+types/_route";

import { COLUMNS } from "../../kanban-board";
import { CardRunSection } from "./card-run-section";

export default function Route({ params }: Route.ComponentProps) {
  const { cardNumber, repoName, repoOwner } = params;

  return (
    <CardDetailPanel
      key={`${repoOwner}/${repoName}/c/${cardNumber}`}
      params={params}
    />
  );
}

function CardDetailPanel({
  params,
}: {
  params: Route.ComponentProps["params"];
}) {
  const { cardNumber, repoName, repoOwner } = params;

  const { repoId } = useOutletContext<RepoOutletContext>();

  const [card, cardResult] = useQuery(
    queries.kanbanCards.byNumber({ number: Number(cardNumber), repoId }),
  );
  const repoUrl = `/${repoOwner}/${repoName}`;

  if (!card && cardResult.type === "complete") {
    return <Navigate replace to={repoUrl} />;
  }

  const loading = !card;
  const column = COLUMNS.find((c) => c.id === card?.columnId);

  return (
    <aside className="border-border bg-background flex h-full flex-col border-l">
      <div className="border-border flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-heading truncate text-sm font-semibold tracking-tight">
          Card details
        </h2>
        <Button asChild size="icon-xs" variant="ghost">
          <Link to={repoUrl}>
            <XIcon />
          </Link>
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <dl className="flex flex-col gap-4 px-4 py-4">
          <DetailField
            label="Title"
            loading={loading}
            skeleton={<Skeleton className="h-5 w-40 rounded" />}
          >
            <dd className="text-sm wrap-break-word">{card?.title}</dd>
          </DetailField>

          <DetailField
            label="Column"
            loading={loading}
            skeleton={<Skeleton className="h-5 w-20 rounded" />}
          >
            <dd>
              <Badge variant="secondary">
                {column?.title ?? card?.columnId}
              </Badge>
            </dd>
          </DetailField>

          <DetailField
            label="Owner"
            loading={loading}
            skeleton={
              <div className="flex items-center gap-2">
                <Skeleton className="size-6 rounded-full" />
                <Skeleton className="h-5 w-24 rounded" />
              </div>
            }
          >
            <dd>
              {card?.user ? (
                <div className="flex items-center gap-2">
                  <Avatar size="sm">
                    <AvatarImage
                      alt={card.user.displayName}
                      src={card.user.avatarUrl ?? undefined}
                    />
                    <AvatarFallback>
                      {card.user.displayName[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{card.user.displayName}</span>
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">Unknown</span>
              )}
            </dd>
          </DetailField>
        </dl>

        {card && <CardRunSection cardId={card.id} />}
      </div>
    </aside>
  );
}

function DetailField({
  children,
  label,
  loading,
  skeleton,
}: {
  children: React.ReactNode;
  label: string;
  loading: boolean;
  skeleton: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-muted-foreground text-2xs mb-1 font-medium tracking-wider uppercase">
        {label}
      </dt>
      {loading ? skeleton : children}
    </div>
  );
}
