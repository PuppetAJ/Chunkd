// lucide 1.x dropped brand marks, so the GitHub logo comes from react-icons.
import { FaGithub } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-card/40">
      <div className="page-gutter mx-auto flex w-full max-w-6xl flex-col gap-3 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">
          &copy; {new Date().getFullYear()} Adrian Jimenez
        </p>

        {/* CC BY-SA asks for credit and a link to the licence wherever the
            work is used, and names the original author rather than only the
            maintainers who carried the pack on. */}
        <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
          Block textures from{" "}
          <a
            className="text-foreground underline underline-offset-2 hover:text-primary"
            href="https://github.com/Athemis/PixelPerfectionCE"
            target="_blank"
            rel="noreferrer"
          >
            Pixel Perfection
          </a>{" "}
          by XSSheep and its community maintainers, used under{" "}
          <a
            className="text-foreground underline underline-offset-2 hover:text-primary"
            href="https://creativecommons.org/licenses/by-sa/4.0/"
            target="_blank"
            rel="noreferrer"
          >
            CC BY-SA 4.0
          </a>
          . Not an official Minecraft product; not approved by or associated with Mojang.
        </p>

        <a
          className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
          href="https://github.com/PuppetAJ/Chunkd"
          target="_blank"
          rel="noreferrer"
        >
          <FaGithub className="size-5" />
          <span className="sr-only sm:not-sr-only">Source</span>
        </a>
      </div>
    </footer>
  );
}
