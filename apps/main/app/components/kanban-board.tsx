import type { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";

import {
  attachClosestEdge,
  extractClosestEdge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { getReorderDestinationIndex } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { reorder } from "@atlaskit/pragmatic-drag-and-drop/reorder";
import { PlusIcon } from "@phosphor-icons/react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import invariant from "tiny-invariant";

import { Button } from "#components/ui/button.js";
import { cn } from "#lib/utils.js";

type Card = { id: string; title: string };

type CardDragData = { cardId: string; columnId: string; type: "card" };

type CardDropTarget = { cardId: string; closestEdge: Edge | null };

type ColumnData = { cards: Card[]; id: string; title: string };

const DEFAULT_COLUMNS: ColumnData[] = [
  { cards: [], id: "backlog", title: "Backlog" },
  { cards: [], id: "in-progress", title: "In Progress" },
  { cards: [], id: "done", title: "Done" },
];

export function KanbanBoard() {
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);

  useEffect(
    () =>
      monitorForElements({
        canMonitor: ({ source }) => source.data["type"] === "card",
        onDrop({ location, source }) {
          const dropTargets = location.current.dropTargets;
          if (dropTargets.length === 0) return;
          setColumns((prev) => computeCardDrop(prev, source.data, dropTargets));
        },
      }),
    [],
  );

  const addCard = useCallback((columnId: string, title: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.id === columnId
          ? {
              ...col,
              cards: [...col.cards, { id: crypto.randomUUID(), title }],
            }
          : col,
      ),
    );
  }, []);

  return (
    <div className="flex h-full gap-3 overflow-x-auto p-4">
      {columns.map((column) => (
        <KanbanColumn column={column} key={column.id} onAddCard={addCard} />
      ))}
    </div>
  );
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

const KanbanCard = memo(function KanbanCard({
  card,
  columnId,
}: {
  card: Card;
  columnId: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);

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
          columnId,
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
            { cardId: card.id, columnId, type: "card" },
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
  }, [card.id, columnId]);

  return (
    <div
      className="relative cursor-grab py-[3px] select-none active:cursor-grabbing"
      ref={ref}
    >
      {closestEdge === "top" && <DropEdgeIndicator edge="top" />}
      <div
        className={cn(
          "bg-card border-border rounded-md border px-3 py-2 text-xs wrap-break-word shadow-xs",
          isDragging && "opacity-50",
        )}
      >
        {card.title}
      </div>
      {closestEdge === "bottom" && <DropEdgeIndicator edge="bottom" />}
    </div>
  );
});

const KanbanColumn = memo(function KanbanColumn({
  column,
  onAddCard,
}: {
  column: ColumnData;
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
          {column.cards.length}
        </span>
      </div>

      {/* -mt-px pt-px: the top padding prevents overflow-y-auto from clipping the first card's drop indicator */}
      <div className="-mt-px flex min-h-24 flex-1 flex-col overflow-y-auto px-2 pt-px pb-2">
        {column.cards.map((card) => (
          <KanbanCard card={card} columnId={column.id} key={card.id} />
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

function computeCardDrop(
  columns: ColumnData[],
  sourceData: Record<string, unknown>,
  dropTargets: { data: Record<string, unknown> }[],
): ColumnData[] {
  const { cardId: sourceCardId, columnId: sourceColumnId } =
    parseCardDragData(sourceData);

  const columnTarget = dropTargets.find((t) => t.data["type"] === "column");
  if (!columnTarget) return columns;

  const destColumnId = columnTarget.data["columnId"];
  invariant(typeof destColumnId === "string");

  const cardTarget = dropTargets.find((t) => t.data["type"] === "card");
  if (cardTarget?.data["cardId"] === sourceCardId) return columns;

  const cardDropTarget: CardDropTarget | null = cardTarget
    ? {
        cardId: parseCardDragData(cardTarget.data).cardId,
        closestEdge: extractClosestEdge(cardTarget.data),
      }
    : null;

  if (sourceColumnId === destColumnId) {
    return reorderWithinColumn(
      columns,
      sourceColumnId,
      sourceCardId,
      cardDropTarget,
    );
  }
  return moveAcrossColumns(
    columns,
    sourceColumnId,
    sourceCardId,
    destColumnId,
    cardDropTarget,
  );
}

function findCardPosition(
  columns: ColumnData[],
  columnId: string,
  cardId: string,
) {
  const col = columns.find((c) => c.id === columnId);
  if (!col) return null;
  const index = col.cards.findIndex((c) => c.id === cardId);
  if (index === -1) return null;
  return { col, index };
}

function moveAcrossColumns(
  columns: ColumnData[],
  sourceColumnId: string,
  sourceCardId: string,
  destColumnId: string,
  cardDropTarget: CardDropTarget | null,
): ColumnData[] {
  const source = findCardPosition(columns, sourceColumnId, sourceCardId);
  if (!source) return columns;

  const destCol = columns.find((c) => c.id === destColumnId);
  if (!destCol) return columns;

  const card = source.col.cards[source.index];
  invariant(card);

  const newDestCards = Array.from(destCol.cards);
  if (cardDropTarget) {
    const indexOfTarget = destCol.cards.findIndex(
      (c) => c.id === cardDropTarget.cardId,
    );
    const insertAt =
      indexOfTarget === -1
        ? newDestCards.length
        : cardDropTarget.closestEdge === "bottom"
          ? indexOfTarget + 1
          : indexOfTarget;
    newDestCards.splice(insertAt, 0, card);
  } else {
    newDestCards.push(card);
  }

  return columns.map((col) => {
    if (col.id === sourceColumnId) {
      return { ...col, cards: col.cards.filter((c) => c.id !== sourceCardId) };
    }
    if (col.id === destColumnId) {
      return { ...col, cards: newDestCards };
    }
    return col;
  });
}

function reorderWithinColumn(
  columns: ColumnData[],
  sourceColumnId: string,
  sourceCardId: string,
  cardDropTarget: CardDropTarget | null,
): ColumnData[] {
  const source = findCardPosition(columns, sourceColumnId, sourceCardId);
  if (!source) return columns;

  const indexOfTarget = cardDropTarget
    ? source.col.cards.findIndex((c) => c.id === cardDropTarget.cardId)
    : source.col.cards.length - 1;
  if (indexOfTarget === -1) return columns;

  const finishIndex = getReorderDestinationIndex({
    axis: "vertical",
    closestEdgeOfTarget: cardDropTarget?.closestEdge ?? null,
    indexOfTarget,
    startIndex: source.index,
  });
  if (source.index === finishIndex) return columns;

  return columns.map((col) =>
    col.id === sourceColumnId
      ? {
          ...col,
          cards: reorder({
            finishIndex,
            list: col.cards,
            startIndex: source.index,
          }),
        }
      : col,
  );
}
