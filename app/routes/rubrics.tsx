import { LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData, Outlet } from "@remix-run/react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { listRubrics } = await import("@/services/rubric.server");
  const { rubrics, error } = await listRubrics();
  
  if (error) {
    console.error("Error loading rubrics:", error);
  }

  return Response.json({ rubrics, error });
};

export default function RubricsRoute() {

  return (
    <div className="container">
      <Outlet />
    </div>
  );
}