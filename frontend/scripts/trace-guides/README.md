# Revision tracing guides

`src/utils/traceGuides.generated.ts` holds the tracing guide for every
character the app traces: capital and small letters, digits and longer
numbers, number names, and Hindi letters, numerals and matra words. The board
draws these exact points and scores against them, so what a child sees is what
they are marked on. Lines and pre-writing shapes are drawn in
`src/utils/tracingAccuracy.ts`. What each revision lesson traces is listed in
`curriculum/revision/trace-sets.json`.

To change a list, edit `trace-sets.json`, then regenerate:

1. Put these in one folder (not the repo), with an empty `out/` folder:
   - `render.html` and `render-server.py` from here
   - `trace-sets.json`
   - `Nunito_700Bold.ttf` (from `node_modules/@expo-google-fonts/nunito/700Bold/`)
   - `NotoSansDevanagari-Regular.ttf` (SIL Open Font License, from
     github.com/notofonts/devanagari)
2. `python render-server.py 8765`, then open `http://127.0.0.1:8765/render.html`
   in a browser. It renders each item with full Hindi text shaping (matras,
   conjuncts) and saves one PNG per item into `out/`.
3. Save the item list the page prints as `items.json` in the same folder (it is
   A-Z, 0-9 and every item in `trace-sets.json`, sorted).
4. `python -I scripts/trace-guides/skeletonize.py <that folder> src/utils/traceGuides.generated.ts`
5. `npm run test:unit` checks every listed item has a guide that fits the board.

Only the derived centre-lines ship in the app; the fonts themselves are not
bundled.
