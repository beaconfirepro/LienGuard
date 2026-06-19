/**
 * FilingRedirect — preserves the legacy /filing/:streamId URL. The standalone
 * filing page was merged into the Project workspace "Filing" tab, so this
 * resolves the stream's parent project and forwards to the merged workspace.
 */

import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

function apiFetch<T>(path: string): Promise<T> {
  return fetch(`/api${path}`, { credentials: "include" }).then((r) => r.json());
}

export default function FilingRedirect() {
  const { streamId } = useParams<{ streamId: string }>();
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery({
    queryKey: ["filing-stream", streamId],
    queryFn: () =>
      apiFetch<{ stream: { id: string; lienProjectId: string } | null }>(
        `/filing/stream/${streamId}`,
      ),
    enabled: !!streamId,
  });

  const projectId = data?.stream?.lienProjectId;

  useEffect(() => {
    if (projectId && streamId) {
      setLocation(`/projects/${projectId}?tab=filing&stream=${streamId}`, {
        replace: true,
      });
    }
  }, [projectId, streamId, setLocation]);

  return (
    <div
      className="flex items-center justify-center py-24 text-[13px]"
      style={{ color: "var(--text-dim)" }}
    >
      {isLoading || projectId ? "Opening filing…" : "Filing stream not found."}
    </div>
  );
}
