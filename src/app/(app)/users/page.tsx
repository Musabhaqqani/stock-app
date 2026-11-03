import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { AddUserDialog } from "@/components/add-user-dialog";
import { UserList } from "@/components/user-list";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  // Admin-only. Non-admins are redirected before anything here renders.
  const admin = await requireAdmin();

  const users = await prisma.user.findMany({
    where: { isGuest: false },
    orderBy: [{ isAdmin: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      isAdmin: true,
      createdAt: true,
      _count: { select: { stocks: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Users"
        subtitle={`${users.length} with access`}
        actions={<AddUserDialog />}
      />

      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <UserList
              users={users.map((u) => ({
                id: u.id,
                name: u.name,
                isAdmin: u.isAdmin,
                createdAt: u.createdAt.toISOString(),
                holdings: u._count.stocks,
              }))}
              currentUserId={admin.id}
            />
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Access is granted here or via{" "}
          <code className="font-mono">npm run user:add</code>. There is no public
          signup — a person can only get in if an admin creates their
          credentials. Passphrases are stored hashed and shown exactly once, at
          creation.
        </p>
      </div>
    </>
  );
}
