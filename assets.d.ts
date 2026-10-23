/** wrangler.jsonc `rules`: CSS files are Text modules, imported as their source text. */
declare module "*.css" {
  const text: string;
  export default text;
}
