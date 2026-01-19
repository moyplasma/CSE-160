# Assignment 1 - Painting Program


## Resources Used

### Textbook
- *WebGL Programming Guide* by Kouichi Matsuda and Rodger Lea

### Video Resources
- Course YouTube playlist for Assignment 1

### AI Assistance
- **Claude**: Used for help with HTML image insertion and placement (displaying reference image next to canvas)
- **Claude**: Assisted with upgrading the undo functionality. The original implementation only removed a single shape from the shapes list using `pop()`. With AI assistance, I was able to implement stroke-based undo that tracks shapes by stroke ID and removes all shapes belonging to the same stroke, letting you undo entire brush strokes drawn from mouse down to mouse up.
