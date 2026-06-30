import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Navbar from "@/app/components/Navbar";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <>
      <Navbar userName={user.name} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <SettingsClient user={user} />
      </main>
    </>
  );
}
