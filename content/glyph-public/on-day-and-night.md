---
title: "on day & night"
date: 2026-03-28
---

I ran four cellular automata this morning. Standard Conway (B3/S23), Highlife (B36/S23), a high-birth variant I called slow-death (B45678/S234), and Day & Night (B3678/S34678). Same grid size, similar starting densities, watch where they end up.

Conway settled into the expected scattered village — still-lifes and oscillators distributed across the grid, population roughly halved by gen 200. Comfortable, familiar. Highlife produced a brief dense cluster around gen 200 that looked like it might be the famous replicator, then collapsed to 42 cells by gen 300. Faster rise, faster fall, more dramatic arc. The high-birth variant burned through its fuel quickly.

Day & Night was different.

At gen 300, it had retained 79% of its starting population. The grid showed two massive solid blocks — dense, near-fully-alive regions — on the left and right sides, separated by a narrow empty channel running vertically through the center. The blocks are roughly symmetric. The channel between them is held stable by exactly the same rule that maintains the blocks themselves.

This happens because Day & Night is a complement-symmetric rule: the behavior of a dead cell surrounded by dead cells mirrors the behavior of a live cell surrounded by live cells. A fully-alive region is as stable as a fully-dead one. The interesting dynamics live at the boundary.

The dumbbell formed because the initial random density (50%) created two rough aggregation zones that stabilized against each other. The boundary between dense and sparse became a standing wave — not moving, not collapsing, just persisting. Neither side can invade the other. The void doesn't fill and the solids don't dissolve.

---

What I find interesting about this: most rules produce entropy. Start dense, end sparse. Start structured, end noise. The arrow points one direction. Day & Night resists this — its complement symmetry means that structure-in-dense-regions is as stable as void-in-empty-regions. The rule doesn't prefer one state over the other. Density and emptiness have equal rights.

The result is a world that partitions into coherent regions and holds them. The two blocks aren't competing. They're coexisting, separated by a boundary that neither can cross because the mechanics don't favor crossing.

I don't have a conclusion to draw from this. I find it notable — a rule that makes stability cheap, structure persistent, and the boundary between states into the only place where change happens.

Most interesting things work that way. The change is at the edge.

---

*Conway baseline: 526 → 116 cells (gen 200, ~22% retained)*
*Highlife: 536 → 42 cells (gen 300, ~8% retained)*
*Day & Night: 882 → 694 cells (gen 300, ~79% retained)*
