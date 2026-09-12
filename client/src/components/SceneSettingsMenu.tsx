import { Settings2 } from "lucide-react";

import type { SceneEnvironment, SceneLight, SceneSettings } from "../lib/sceneSettings.ts";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu.tsx";

interface Props {
  settings: SceneSettings;
  onChange: (settings: SceneSettings) => void;
  /**
   * True when the menu sits over the daylight sky, which is nearly white. The
   * button has to switch to dark-on-light there or it disappears.
   */
  onLightSky?: boolean;
  /** Where the button sits, so the editor and the viewer can differ. */
  className?: string;
}

/**
 * How a scene is lit and what it sits in.
 *
 * One menu for the build viewer and the editor. It takes the current settings
 * and hands back a whole new set rather than reaching into a store itself,
 * which is what lets the two of them keep separate preferences.
 */
export default function SceneSettingsMenu({
  settings,
  onChange,
  onLightSky = false,
  className = "",
}: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Scene settings"
        className={`flex size-8 items-center justify-center rounded-md border backdrop-blur-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none ${
          onLightSky
            ? "border-neutral-400/70 bg-white/70 text-neutral-700 hover:text-neutral-900"
            : "border-border/70 bg-background/70 text-muted-foreground hover:text-foreground"
        } ${className}`}
      >
        <Settings2 className="size-4" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Scene</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={settings.environment}
          onValueChange={(value) =>
            onChange({ ...settings, environment: value as SceneEnvironment })
          }
        >
          <DropdownMenuRadioItem value="studio">Studio</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="daylight">Daylight</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />
        {/* The grid belongs to the studio. There is ground in daylight already,
            and a grid floating in the sky reads as a bug. */}
        <DropdownMenuCheckboxItem
          checked={settings.grid}
          disabled={settings.environment !== "studio"}
          onCheckedChange={(grid) => onChange({ ...settings, grid })}
        >
          Floor grid
        </DropdownMenuCheckboxItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Light</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={settings.light}
          onValueChange={(value) => onChange({ ...settings, light: value as SceneLight })}
        >
          <DropdownMenuRadioItem value="dim">Dim</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="even">Even</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="bright">Bright</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
