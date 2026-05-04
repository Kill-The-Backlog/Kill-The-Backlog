import type { Selectable } from "@ktb/db/kysely-types";
import type { User } from "@ktb/db/types";

import { CaretUpDownIcon, SignOutIcon, SwordIcon } from "@phosphor-icons/react";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { useLayoutEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import invariant from "tiny-invariant";

import { RelativeTime } from "#components/relative-time.js";
import { Avatar, AvatarFallback, AvatarImage } from "#components/ui/avatar.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#components/ui/dropdown-menu.js";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "#components/ui/sidebar.js";
import { cn } from "#lib/utils/cn.js";
import { getInitials } from "#lib/utils/get-initials.js";
import { useRootLoaderData } from "#root.js";
import { queries } from "#zero/queries.js";

import { HeaderSlotContext } from "./header-slot.js";

export default function Route() {
  const [headerEl, setHeaderEl] = useState<HTMLElement | null>(null);

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "18rem" } as React.CSSProperties}
    >
      <AppSidebar />
      <SidebarInset className="h-svh">
        <header className="border-border flex h-12 shrink-0 items-center gap-2 border-b px-3">
          <SidebarTrigger />
          {/* Portal target for child routes' `HeaderSlot` items. `display:
              contents` lets the portaled children participate directly in the
              header's flex layout, inheriting its gap and alignment. */}
          <div className="contents" ref={setHeaderEl} />
        </header>
        <main className="flex-1 overflow-auto">
          <HeaderSlotContext.Provider value={headerEl}>
            <Outlet />
          </HeaderSlotContext.Provider>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function AppSidebar() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    invariant(el, "Scroll container is required");

    const update = () => {
      setCanScrollUp(el.scrollTop > 0);
      setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
    };

    // Container size changes (e.g. window resize). ResizeObserver does
    // not fire on scrollHeight changes, only on the element's own box.
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(el);

    // Catch DOM additions/removals inside the scroll container, e.g. the
    // session list mounting after data loads or sessions being added.
    const mutationObserver = new MutationObserver(update);
    mutationObserver.observe(el, { childList: true, subtree: true });

    update();
    el.addEventListener("scroll", update, { passive: true });

    return () => {
      el.removeEventListener("scroll", update);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="gap-1">
              <Link draggable={false} to="/">
                <SwordIcon weight="fill" />
                <span className="text-sm font-semibold tracking-tight">
                  KTB
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <SidebarContent ref={scrollRef}>
          <SessionList />
        </SidebarContent>
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 h-4 bg-linear-to-b from-black/10 to-transparent transition-opacity",
            canScrollUp ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-linear-to-t from-black/10 to-transparent transition-opacity",
            canScrollDown ? "opacity-100" : "opacity-0",
          )}
        />
      </div>
      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}

function SessionList() {
  const [sessions] = useQuery(queries.sessions.mine());

  if (sessions.length === 0) {
    return null;
  }

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {sessions.map((session) => {
            const repoName =
              session.repoFullName.split("/")[1] ?? session.repoFullName;
            const prNumber =
              session.prNumber !== null ? ` #${session.prNumber}` : "";
            return (
              <SidebarMenuItem key={session.id}>
                <NavLink draggable={false} to={`/sessions/${session.id}`}>
                  {({ isActive }) => (
                    <SidebarMenuButton
                      className="h-auto data-[active=true]:font-normal"
                      isActive={isActive}
                    >
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-xs">
                          {session.title ?? session.initialPrompt}
                        </span>
                        <span className="text-muted-foreground text-2xs truncate">
                          <RelativeTime
                            timestampMs={session.lastUserMessageAt}
                          />
                          {" · "}
                          {repoName}
                          {prNumber}
                        </span>
                      </div>
                    </SidebarMenuButton>
                  )}
                </NavLink>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function UserInfo({
  showEmail,
  user,
}: {
  showEmail: boolean;
  user: Pick<Selectable<User>, "avatarUrl" | "displayName" | "email">;
}) {
  return (
    <div className="flex items-center gap-2">
      <Avatar size="sm">
        <AvatarImage alt={user.displayName} src={user.avatarUrl ?? undefined} />
        <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-xs font-medium">{user.displayName}</span>
        {showEmail && (
          <span className="text-muted-foreground truncate text-xs">
            {user.email}
          </span>
        )}
      </div>
    </div>
  );
}

function UserMenu() {
  const { user } = useRootLoaderData();
  invariant(user, "User is required");
  const zero = useZero();
  const navigate = useNavigate();

  function handleSignOut(e: React.MouseEvent) {
    e.preventDefault();
    // @todo: Find a way to delete the zero cache on the actual sign-out route.
    void zero.delete().then(() => navigate("/sign-out"));
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <UserInfo showEmail={false} user={user} />
              <CaretUpDownIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
            side="top"
          >
            <div className="px-1 py-1.5">
              <UserInfo showEmail={true} user={user} />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link draggable={false} onClick={handleSignOut} to="/sign-out">
                <SignOutIcon />
                Sign out
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
