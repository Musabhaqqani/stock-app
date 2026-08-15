"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PassphraseReveal } from "@/components/passphrase-reveal";
import { addUserAction, type AddUserState } from "@/app/(app)/users/actions";

const initial: AddUserState = { error: null, created: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creating…" : "Create user"}
    </Button>
  );
}

export function AddUserDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(addUserAction, initial);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>
        <UserPlus />
        <span className="sr-only sm:not-sr-only">Add user</span>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Add a user</DialogTitle>
          <DialogDescription>
            Creates credentials directly. They start with an empty portfolio
            and add their own holdings. You hand them the passphrase.
          </DialogDescription>
        </DialogHeader>

        {/*
          Once a user is created the form is replaced by the passphrase, which
          is the only time it is ever visible. Adding another resets the state.
        */}
        {state.created ? (
          <div className="space-y-4">
            <PassphraseReveal
              name={state.created.name}
              passphrase={state.created.passphrase}
            />
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <div>
              <Label htmlFor="user-name">Name</Label>
              <Input
                id="user-name"
                name="name"
                required
                autoComplete="off"
                placeholder="Their sign-in name"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="user-pass">Passphrase</Label>
              <Input
                id="user-pass"
                name="passphrase"
                autoComplete="off"
                placeholder="Leave blank to generate one"
                className="mt-1.5 font-mono"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Minimum 8 characters if you set it yourself.
              </p>
            </div>

            <label className="flex items-center gap-2.5 text-sm">
              <input type="checkbox" name="isAdmin" className="size-4 accent-[var(--under)]" />
              Make them an admin (can manage users)
            </label>

            {state.error && (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            )}

            <DialogFooter>
              <SubmitButton />
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
