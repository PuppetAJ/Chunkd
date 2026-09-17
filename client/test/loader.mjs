// Lets Node import the block table despite its texture imports: each image
// becomes its own path, which is all a test needs of it.
import { register } from "node:module";

register("./images.mjs", import.meta.url);
