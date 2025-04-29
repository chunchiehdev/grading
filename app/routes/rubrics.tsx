import { Outlet } from "react-router";

export const loader = async ({ request }: { request: Request }) => {
  const { listRubrics } = await import("@/services/rubric.server");
  const { rubrics, error } = await listRubrics();
  
  if (error) {
    console.error("Error loading rubrics:", error);
  }

  return { rubrics, error };
};

export default function RubricsRoute() {

  return (
    <div className="container">
      <Outlet />
    </div>
  );
}