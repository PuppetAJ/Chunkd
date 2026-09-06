import { Settings2 } from "lucide-react";

import {
  useViewerSettings,
  type ViewerEnvironment,
  type ViewerLight,
} from "../../lib/viewerSettingsStore.ts";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu.tsx";

/**
 * How the viewer is lit and what it sits in.
 *
 * The choice is a preference rather than a property of any one build, so it is
 * remembered across visits and applies to every viewer on the site.
 */
export default function ViewerSettingsMenu({ onLightSky }: { onLightSky: boolean }) {
  const environment = useViewerSettings((state) => state.environment);
  const grid = useViewerSettings((state) => state.grid);
  const light = useViewerSettings((state) => state.light);
  const setEnvironment = useViewerSettings((state) => state.setEnvironment);
  const setGrid = useViewerSettings((state) => state.setGrid);
  const setLight = useViewerSettings((state) => state.setLight);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Viewer settings"
        className={`flex size-8 items-center justify-center rounded-md border backdrop-blur-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none ${
          onLightSky
            ? "border-neutral-400/70 bg-white/70 text-neutral-700 hover:text-neutral-900"
            : "border-border/70 bg-background/70 text-muted-foreground hover:text-foreground"
        }`}
      >
        <Settings2 className="size-4" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Scene</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={environment}
          onValueChange={(value) => setEnvironment(value as ViewerEnvironment)}
        >
          <DropdownMenuRadioItem value="studio">Studio</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="daylight">Daylight</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />
        {/* The grid belongs to the studio. There is a floor of sorts in
            daylight already, and a grid floating in the sky reads as a bug. */}
        <DropdownMenuCheckboxItem
          checked={grid}
          disabled={environment !== "studio"}
          onCheckedChange={setGrid}
        >
          Floor grid
        </DropdownMenuCheckboxItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Light</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={light}
          onValueChange={(value) => setLight(value as ViewerLight)}
        >
          <DropdownMenuRadioItem value="dim">Dim</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="even">Even</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="bright">Bright</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
