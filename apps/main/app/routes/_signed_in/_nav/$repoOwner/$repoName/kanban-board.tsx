import type { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";

import {
  attachClosestEdge,
  extractClosestEdge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { PlusIcon } from "@phosphor-icons/react";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { generateKeyBetween } from "fractional-indexing";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import invariant from "tiny-invariant";

import { Button } from "#components/ui/button.js";
import { cn } from "#lib/utils.js";
import { mutators } from "#zero/mutators.js";
import { queries } from "#zero/queries.js";

export type ColumnDef = { id: string; title: string };

type CardDragData = { cardId: string; columnId: string; type: "card" };

type KanbanCardRow = {
  columnId: string;
  id: string;
  number: number;
  sortOrder: string;
  title: string;
};

export const COLUMNS: ColumnDef[] = [
  { id: "backlog", title: "Backlog" },
  { id: "in-progress", title: "In Progress" },
  { id: "done", title: "Done" },
];

export function KanbanBoard({ repoId }: { repoId: number }) {
  const zero = useZero();
  const [cards] = useQuery(queries.kanbanCards.byRepo({ repoId }));

  const columnCards = useMemo(() => {
    const grouped = new Map<string, KanbanCardRow[]>();
    for (const col of COLUMNS) {
      grouped.set(col.id, []);
    }
    for (const card of cards) {
      const list = grouped.get(card.columnId);
      if (list) list.push(card);
    }
    return grouped;
  }, [cards]);

  const handleCardDrop = useCallback(
    function handleCardDrop({
      location,
      source,
    }: {
      location: {
        current: { dropTargets: { data: Record<string, unknown> }[] };
      };
      source: { data: Record<string, unknown> };
    }) {
      const dropTargets = location.current.dropTargets;
      if (dropTargets.length === 0) return;

      const { cardId: sourceCardId, columnId: sourceColumnId } =
        parseCardDragData(source.data);

      const columnTarget = dropTargets.find((t) => t.data["type"] === "column");
      if (!columnTarget) return;

      const destColumnId = columnTarget.data["columnId"];
      invariant(typeof destColumnId === "string");

      const cardTarget = dropTargets.find((t) => t.data["type"] === "card");
      if (cardTarget?.data["cardId"] === sourceCardId) return;

      const destCards = columnCards.get(destColumnId) ?? [];

      const targetCardId = cardTarget
        ? (cardTarget.data["cardId"] as string)
        : undefined;
      const closestEdge = cardTarget
        ? extractClosestEdge(cardTarget.data)
        : null;

      const sortOrder = computeFractionalIndex(
        destCards.filter((c) => c.id !== sourceCardId),
        targetCardId,
        closestEdge,
      );

      if (sourceColumnId === destColumnId) {
        zero.mutate(
          mutators.kanbanCards.reorder({ id: sourceCardId, sortOrder }),
        );
      } else {
        zero.mutate(
          mutators.kanbanCards.move({
            columnId: destColumnId,
            id: sourceCardId,
            sortOrder,
          }),
        );
      }
    },
    [columnCards, zero],
  );

  useEffect(
    () =>
      monitorForElements({
        canMonitor: ({ source }) => source.data["type"] === "card",
        onDrop: handleCardDrop,
      }),
    [handleCardDrop],
  );

  const handleAddCard = useCallback(
    (columnId: string, title: string) => {
      const colCards = columnCards.get(columnId) ?? [];
      const lastKey =
        colCards.length > 0 ? colCards[colCards.length - 1]!.sortOrder : null;

      zero.mutate(
        mutators.kanbanCards.create({
          columnId,
          id: crypto.randomUUID(),
          repoId,
          sortOrder: generateKeyBetween(lastKey, null),
          title,
        }),
      );
    },
    [columnCards, repoId, zero],
  );

  return (
    <div className="flex h-full gap-3 overflow-x-auto p-4">
      {COLUMNS.map((col) => (
        <KanbanColumn
          cards={columnCards.get(col.id) ?? []}
          column={col}
          key={col.id}
          onAddCard={handleAddCard}
        />
      ))}
    </div>
  );
}

function computeFractionalIndex(
  destCards: KanbanCardRow[],
  targetCardId: string | undefined,
  closestEdge: Edge | null,
): string {
  if (destCards.length === 0) return generateKeyBetween(null, null);

  if (!targetCardId) {
    return generateKeyBetween(destCards[destCards.length - 1]!.sortOrder, null);
  }

  const targetIndex = destCards.findIndex((c) => c.id === targetCardId);
  if (targetIndex === -1) {
    return generateKeyBetween(destCards[destCards.length - 1]!.sortOrder, null);
  }

  if (closestEdge === "top") {
    const prev = targetIndex > 0 ? destCards[targetIndex - 1]!.sortOrder : null;
    return generateKeyBetween(prev, destCards[targetIndex]!.sortOrder);
  }

  const next =
    targetIndex < destCards.length - 1
      ? destCards[targetIndex + 1]!.sortOrder
      : null;
  return generateKeyBetween(destCards[targetIndex]!.sortOrder, next);
}

function DropEdgeIndicator({ edge }: { edge: "bottom" | "top" }) {
  return (
    <div
      className={cn(
        "bg-primary pointer-events-none absolute right-1 left-1 z-10 h-0.5 rounded-full",
        edge === "top" ? "-top-px" : "-bottom-px",
      )}
    />
  );
}

function parseCardDragData(data: Record<string, unknown>): CardDragData {
  const cardId = data["cardId"];
  const columnId = data["columnId"];
  invariant(typeof cardId === "string", "Missing cardId in drag data");
  invariant(typeof columnId === "string", "Missing columnId in drag data");
  return { cardId, columnId, type: "card" };
}

const KanbanCard = memo(function KanbanCard({ card }: { card: KanbanCardRow }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);
  const { repoName, repoOwner } = useParams();

  useEffect(() => {
    const el = ref.current;
    invariant(el);

    const updateClosestEdge = ({
      self,
      source,
    }: {
      self: { data: Record<string, unknown> };
      source: { data: Record<string, unknown> };
    }) => {
      if (source.data["cardId"] !== card.id) {
        setClosestEdge(extractClosestEdge(self.data));
      }
    };

    return combine(
      draggable({
        element: el,
        getInitialData: () => ({
          cardId: card.id,
          columnId: card.columnId,
          type: "card",
        }),
        onDragStart: () => {
          setIsDragging(true);
        },
        onDrop: () => {
          setIsDragging(false);
        },
      }),
      dropTargetForElements({
        canDrop: ({ source }) => source.data["type"] === "card",
        element: el,
        getData: ({ element, input }) =>
          attachClosestEdge(
            { cardId: card.id, columnId: card.columnId, type: "card" },
            { allowedEdges: ["top", "bottom"], element, input },
          ),
        getIsSticky: () => true,
        onDrag: updateClosestEdge,
        onDragEnter: updateClosestEdge,
        onDragLeave: () => {
          setClosestEdge(null);
        },
        onDrop: () => {
          setClosestEdge(null);
        },
      }),
    );
  }, [card.id, card.columnId]);

  return (
    <div
      className="relative cursor-grab py-[3px] select-none active:cursor-grabbing"
      ref={ref}
    >
      {closestEdge === "top" && <DropEdgeIndicator edge="top" />}
      <Link
        className={cn(
          "bg-card border-border block rounded-md border px-3 py-2 text-xs wrap-break-word shadow-xs",
          isDragging && "opacity-50",
        )}
        draggable={false}
        to={`/${repoOwner}/${repoName}/c/${card.number}`}
      >
        {card.title}
      </Link>
      {closestEdge === "bottom" && <DropEdgeIndicator edge="bottom" />}
    </div>
  );
});

const KanbanColumn = memo(function KanbanColumn({
  cards,
  column,
  onAddCard,
}: {
  cards: KanbanCardRow[];
  column: ColumnDef;
  onAddCard: (columnId: string, title: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isDraggedOver, setIsDraggedOver] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");

  useEffect(() => {
    const el = ref.current;
    invariant(el);

    return dropTargetForElements({
      canDrop: ({ source }) => source.data["type"] === "card",
      element: el,
      getData: () => ({ columnId: column.id, type: "column" }),
      onDragEnter: () => {
        setIsDraggedOver(true);
      },
      onDragLeave: () => {
        setIsDraggedOver(false);
      },
      onDrop: () => {
        setIsDraggedOver(false);
      },
    });
  }, [column.id]);

  function handleAddCard() {
    const title = newCardTitle.trim();
    if (!title) return;
    onAddCard(column.id, title);
    setNewCardTitle("");
  }

  return (
    <div
      className={cn(
        "bg-muted/50 flex w-72 shrink-0 flex-col rounded-lg transition-colors",
        isDraggedOver && "bg-muted",
      )}
      ref={ref}
    >
      <div className="flex items-center justify-between px-3 py-2.5">
        <h3 className="font-heading text-xs font-semibold tracking-tight">
          {column.title}
        </h3>
        <span className="text-muted-foreground text-2xs tabular-nums">
          {cards.length}
        </span>
      </div>

      {/* -mt-px pt-px: the top padding prevents overflow-y-auto from clipping the first card's drop indicator */}
      <div className="-mt-px flex min-h-24 flex-1 flex-col overflow-y-auto px-2 pt-px pb-2">
        {cards.map((card) => (
          <KanbanCard card={card} key={card.id} />
        ))}
      </div>

      <div className="border-border/50 flex gap-1 border-t p-2">
        <input
          className="placeholder:text-muted-foreground min-w-0 flex-1 rounded bg-transparent px-2 py-1 text-xs outline-none"
          onChange={(e) => {
            setNewCardTitle(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAddCard();
          }}
          placeholder="Add a card..."
          value={newCardTitle}
        />
        <Button
          disabled={!newCardTitle.trim()}
          onClick={handleAddCard}
          size="icon-xs"
          variant="ghost"
        >
          <PlusIcon />
        </Button>
      </div>
    </div>
  );
});
