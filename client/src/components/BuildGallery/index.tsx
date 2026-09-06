import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { Blocks, Boxes, Trash2 } from "lucide-react";

import { DELETE_BUILD } from "../../utils/mutations.ts";
import { QUERY_ME } from "../../utils/queries.ts";
import { formatTimestamp } from "../../lib/formatTimestamp.ts";
import type { BuildSummary } from "../../lib/feedTypes.ts";
import SavedBuild from "../SavedBuild/index.tsx";
import { Button } from "../ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog.tsx";

interface Props {
  builds: BuildSummary[];
  /** Only the owner of a profile may delete its builds. */
  canManage: boolean;
  emptyBody: string;
}

/**
 * A profile's saved worlds.
 *
 * A build is only rendered in 3D once someone opens it. Each world is a real
 * WebGL scene, and drawing a grid of them at once would cost more contexts than
 * a browser will hand out.
 */
export default function BuildGallery({ builds, canManage, emptyBody }: Props) {
  const [openBuild, setOpenBuild] = useState<BuildSummary | null>(null);
  const [buildToDelete, setBuildToDelete] = useState<BuildSummary | null>(null);

  const [deleteBuild, { loading: deleting }] = useMutation(DELETE_BUILD, {
    refetchQueries: [{ query: QUERY_ME }],
  });

  if (builds.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
        <Boxes className="mx-auto mb-3 size-8 text-muted-foreground" />
        <p className="font-medium">No builds yet</p>
        <p className="mt-1 text-sm text-muted-foreground">{emptyBody}</p>
      </div>
    );
  }

  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {builds.map((build) => (
          <li key={build._id} className="overflow-hidden rounded-xl border border-border bg-card">
            {/* The picture was taken from wherever the player was standing when
                they saved, so it is the fastest way to tell two worlds apart. */}
            {build.thumbnail ? (
              <img
                src={build.thumbnail}
                alt=""
                className="aspect-video w-full border-b border-border object-cover"
              />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center border-b border-border bg-muted">
                <Blocks className="size-6 text-muted-foreground" />
              </div>
            )}

            <div className="p-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{build.name}</p>
                {build.createdAt && (
                  <p className="text-xs text-muted-foreground">
                    Saved {formatTimestamp(build.createdAt)}
                  </p>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setOpenBuild(build)}>
                  Open
                </Button>
                {canManage && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="ml-auto text-muted-foreground hover:text-destructive"
                    aria-label={`Delete ${build.name}`}
                    onClick={() => setBuildToDelete(build)}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <Dialog open={openBuild !== null} onOpenChange={(next) => !next && setOpenBuild(null)}>
        <DialogContent className="max-w-3xl sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{openBuild?.name}</DialogTitle>
          </DialogHeader>
          <div className="h-[60vh] min-h-64">
            {openBuild && <SavedBuild buildId={openBuild._id} />}
          </div>
          <p className="text-xs text-muted-foreground">Drag to orbit, scroll to zoom.</p>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={buildToDelete !== null}
        onOpenChange={(next) => !next && setBuildToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{buildToDelete?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              The world is gone for good. Posts that reference it stay, but they will no longer
              have a build to show.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={() => {
                if (buildToDelete) deleteBuild({ variables: { buildId: buildToDelete._id } });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
