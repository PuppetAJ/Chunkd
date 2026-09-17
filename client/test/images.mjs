export async function load(url, context, next) {
  if (url.endsWith(".png")) {
    return { format: "module", shortCircuit: true, source: `export default ${JSON.stringify(url)};` };
  }
  return next(url, context);
}
