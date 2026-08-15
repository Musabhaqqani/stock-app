"use client";

import { useActionState } from "react";
import { MoreHorizontal, Shield, ShieldOff, Trash2, KeyRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PassphraseReveal } from "@/components/passphrase-reveal";
import {
  deleteUserAction,
  resetPassphraseAction,
  toggleAdminAction,
  type AddUserState,
} from "@/app/(app)/users/actions";

type Row = {
  id: string;
  name: string;
  isAdmin: boolean;
  createdAt: string;
  holdings: number;
};

const initial: AddUserState = { error: null, created: null };

export function UserList({
  users,
  currentUserId,
}: {
  users: Row[];
  currentUserId: string;
}) {
  const [resetState, resetAction] = useActionState(resetPassphraseAction, initial);

  return (
    <div className="space-y-4">
      {resetState.created && (
        <PassphraseReveal
          name={resetState.created.name}
          passphrase={resetState.created.passphrase}
        />
      )}

      <ul className="divide-y divide-border">
        {users.map((user) => {
          const isSelf = user.id === currentUserId;

          return (
            <li key={user.id} className="flex items-center gap-3 py-3 first:pt-0">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-sm font-semibold">
                {user.name.slice(0, 1).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{user.name}</span>
                  {user.isAdmin && (
                    <Badge
                      variant="outline"
                      className="border-under/40 text-xs text-under"
                    >
                      admin
                    </Badge>
                  )}
                  {isSelf && (
                    <span className="text-xs text-muted-foreground">you</span>
                  )}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {user.holdings} holdings · added{" "}
                  {new Date(user.createdAt).toLocaleDateString("en-IN", {
                    dateStyle: "medium",
                  })}
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0"
                      aria-label={`Actions for ${user.name}`}
                    />
                  }
                >
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end">
                  <form action={resetAction}>
                    <input type="hidden" name="id" value={user.id} />
                    <DropdownMenuItem render={<button type="submit" className="w-full" />}>
                      <KeyRound className="size-4" />
                      Reset passphrase
                    </DropdownMenuItem>
                  </form>

                  {/* Self-demotion and self-deletion are blocked server-side
                      too — hiding the menu item is only the first layer. */}
                  {!isSelf && (
                    <>
                      <form action={toggleAdminAction}>
                        <input type="hidden" name="id" value={user.id} />
                        <DropdownMenuItem render={<button type="submit" className="w-full" />}>
                          {user.isAdmin ? (
                            <>
                              <ShieldOff className="size-4" />
                              Remove admin
                            </>
                          ) : (
                            <>
                              <Shield className="size-4" />
                              Make admin
                            </>
                          )}
                        </DropdownMenuItem>
                      </form>

                      <form action={deleteUserAction}>
                        <input type="hidden" name="id" value={user.id} />
                        <DropdownMenuItem
                          render={<button type="submit" className="w-full" />}
                          variant="destructive"
                        >
                          <Trash2 className="size-4" />
                          Remove access
                        </DropdownMenuItem>
                      </form>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
