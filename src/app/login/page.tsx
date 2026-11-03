import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { LoginForm, SubmitButton } from "./login-form";
import { guestLoginAction } from "./actions";
import { Card, CardContent } from "@/components/ui/card";

export default async function LoginPage() {
  if (await getSessionUser()) redirect("/");

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary font-display text-xl font-semibold text-primary-foreground">
            ₹
          </div>
          <div>
            <h1 className="font-display text-2xl leading-tight">
              Portfolio Rebalancer
            </h1>
            <p className="text-xs text-muted-foreground">
              Private tracker — no signup
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <LoginForm />
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Access is granted by an admin. Ask them for your credentials.
        </p>

        <form action={guestLoginAction} className="mt-6 space-y-2">
          <SubmitButton
            variant="outline"
            label="Try the demo — no login"
            pendingLabel="Setting up demo…"
          />
          <p className="text-center text-xs text-muted-foreground">
            A sample portfolio to play with. Deleted after 24 hours.
          </p>
        </form>
      </div>
    </main>
  );
}
