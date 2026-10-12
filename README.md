# Atelier Noir — GD Beauty

A luxury fragrance landing page built with Next.js 15, React 19 and three.js.

The centrepiece is a working perfume flacon. Press the bottle in the hero (or **Press to spray** in the Fragrance chapter):

1. the cap unscrews, lifts off and floats away
2. the bottle turns its nozzle toward you and the actuator presses down
3. the mist travels toward the viewer in perspective and lands on the screen as droplets. They bead up, merge, run down leaving trails, then evaporate.

Leave it alone for a few seconds and the cap goes back on.

Every product in the range section has its own ritual. Whatever lands on the screen fades in a few seconds, and is wiped as soon as you scroll:

| Chapter | On the object | On the screen |
| --- | --- | --- |
| Fragrance | Cap unscrews, the actuator presses | Mist in perspective, then droplets that bead, merge and run |
| Skin | Lid unscrews and flips back, the jar tips toward you. Press again to close | — |
| Colour | Cap pulls off, the bullet swivels up | A heart and the shade name written in waxy lipstick, as on a mirror |
| Body | The locked pump head twists to face you, then pumps twice | Heavy golden oil drops that splat and slide down slowly with glossy trails |

## Run

```bash
npm install
npm run dev
```

## Where things live

| File | What it does |
| --- | --- |
| `lib/flacon.ts` | The modelled bottle (layered glass, liquid, dip tube, collar, actuator, cap) and its uncap → spray state machine |
| `lib/products.ts` | Cream jar, lipstick and oil pump, sharing one open → act state machine |
| `lib/wetScreen.ts` | Full-screen canvas: mist in perspective, droplets, merging, running drops, evaporation |
| `lib/fx/*` | The other screen effects: lipstick, oil |
| `lib/glass.ts` | Layered glass (reflective skins + fresnel shell) shared by every vessel |
| `lib/heroScene.ts` | Hero 3D stage: hover lean, click-to-spray |
| `lib/rangeScene.ts` | Scroll-driven 3D objects for the four disciplines |
| `lib/accordScene.ts` | The oil drop landing on skin |
| `components/*` | Page sections |

Photography: Unsplash (free licence).
