# PDF2STRUCTURE
Based on Architecture Plan PDF to Set Up Structure Layout


## Workflow

1. Open a PDF, pick a page and crop each floor plan into a **Plan Sheet** (several crops per page are fine).
2. In the **Storey** tab choose one structural sheet as the **base sheet** and set the shared origin on it. Every other sheet is a super-sheet: translate it over the base sheet until its origin marker sits on the shared origin.
3. Fill in the **storey list** (ETABS style: name, height, elevation). Give each master storey a plan sheet; a typical floor is set to "Similar to" a master and shares its sheet and members.
4. Select a storey with **Edit** and draw columns, beams, walls, portal frames and slabs. Use **Copy members to this storey** to bring members over from another storey.
5. Run **Node coordination check** to find columns, walls and portal-frame ends with no node at the same X, Y on the storey below. Snap the node, or add the missing support node.
