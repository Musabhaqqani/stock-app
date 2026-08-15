"use server";

import { redirect } from "next/navigation";
import { login } from "@/lib/auth";

export type LoginState = { error: string | null };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const name = String(formData.get("name") ?? "");
  const passphrase = String(formData.get("passphrase") ?? "");

  if (!name || !passphrase) {
    return { error: "Enter both your name and passphrase." };
  }

  if (!(await login(name, passphrase))) {
    // Deliberately vague: don't reveal whether the name exists.
    return { error: "That name and passphrase don't match." };
  }

  redirect("/");
}
