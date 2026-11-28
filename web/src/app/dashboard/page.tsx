import { Suspense } from "react";
import { requireViewer } from "@/src/features/auth/services/viewer";
import WorkspacePage from "@/src/features/dashboard/containers/dashboard";

async function WorkspaceForViewer() {
  const viewer = await requireViewer();
  return <WorkspacePage firstName={viewer.first_name} role={viewer.role} />;
}

export default function Workspace() {
  return (
    <Suspense fallback={null}>
      <WorkspaceForViewer />
    </Suspense>
  );
}
