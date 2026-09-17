// Lets Node import the block table, which imports its texture images. Vite
// turns those into URLs; here each becomes its own path, which is all a test
// needs of it.
import { register } from "node:module";

register("./images.mjs", import.meta.url);
