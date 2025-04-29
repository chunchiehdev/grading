import { redirect } from "react-router";

export async function action({ request }: { request: Request }) {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to logout");
  }

  return redirect("/");
}

export async function loader() {
  return redirect("/login");
}

export default function LogoutPage() {
  return null;
} 