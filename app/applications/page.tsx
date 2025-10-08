import { Suspense } from "react";
import ApplicationsContent from "./ApplicationsContent";

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<div>Loading applications...</div>}>
      <ApplicationsContent />
    </Suspense>
  );
}
