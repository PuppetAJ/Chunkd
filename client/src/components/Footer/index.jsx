import { FaGithub } from "react-icons/fa";

const Footer = () => (
  <footer className="footer footer-center flex w-full flex-col items-center gap-2 p-4 text-gray-300">
    <div className="flex items-center gap-3">
      <a className="duration-300 hover:scale-105" href="https://github.com/PuppetAJ/ReactMC">
        <FaGithub size={32} />
      </a>
      <p className="text-center">&copy; {new Date().getFullYear()} The Second Breakfast Club</p>
    </div>

    {/* The block textures are Faithful's, and their licence asks for clear
        credit and a visible link wherever their work is used. */}
    <p className="text-center text-xs text-gray-400">
      Block textures from{" "}
      <a
        className="underline hover:text-white"
        href="https://faithfulpack.net/faithful32x"
        target="_blank"
        rel="noreferrer"
      >
        Faithful 32x
      </a>, used under the{" "}
      <a
        className="underline hover:text-white"
        href="https://faithfulpack.net/license"
        target="_blank"
        rel="noreferrer"
      >
        Faithful licence
      </a>
      . Not an official Minecraft product; not approved by or associated with Mojang.
    </p>
  </footer>
);

export default Footer;
