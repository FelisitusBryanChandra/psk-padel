import { getServerAuth } from "@/lib/auth";
import { RegisterClient } from "./RegisterClient";

export default async function RegisterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getServerAuth();
  const isAdmin = auth?.role === "admin";

  return <RegisterClient id={id} isAdmin={isAdmin} />;
}
