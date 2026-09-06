// lucide 1.x dropped brand marks, so the GitHub logo comes from react-icons.
import { FaGithub } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-card/40">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">
          &copy; {new Date().getFullYear()} The Second Breakfast Club
        </p>

        {/* The block textures are Faithful's, and their licence asks for clear
            credit and a visible link wherever their work is used. */}
        <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
          Block textures from{" "}
          <a
            className="text-foreground underline underline-offset-2 hover:text-primary"
            href="https://faithfulpack.net/faithful32x"
            target="_blank"
            rel="noreferrer"
          >
            Faithful 32x
          </a>
          , used under the{" "}
          <a
            className="text-foreground underline underline-offset-2 hover:text-primary"
            href="https://faithfulpack.net/license"
            target="_blank"
            rel="noreferrer"
          >
            Faithful licence
          </a>
          . Not an official Minecraft product; not approved by or associated with Mojang.
        </p>

        <a
          className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
          href="https://github.com/PuppetAJ/ReactMC"
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
