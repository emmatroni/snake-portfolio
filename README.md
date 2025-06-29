# Snake Portfolio

Interactive portfolio implementation using Snake game mechanics. Built as part of Communication Design coursework for Laboratorio di Web e Digital Design at Politecnico di Milano.

## Overview

A web-based portfolio that uses game interaction to present projects. Users navigate a snake to collect keywords, which unlock detailed project information. The implementation demonstrates responsive design, cross-platform compatibility, and interactive user experience principles.

**Live Demo**: [emmatroni.webflow.io](https://emmatroni.webflow.io/)

## Technical Implementation

### Technologies
- **p5.js**: Graphics rendering and animation framework
- **Hammer.js**: Touch gesture recognition for mobile devices
- **Vanilla JavaScript**: Game logic and DOM manipulation
- **CSS3**: Styling
- **Webflow**: Content hosting and CMS template pages.

### Key Features
- Responsive grid system adapting to screen dimensions
- Progressive text revelation based on game progress
- Mobile touch controls with swipe gesture detection
- Cross-browser text rendering optimizations
- Modal overlay system for project display

### Architecture
```
├── Game Logic
│   ├── Snake movement and collision detection
│   ├── Food positioning and collection
│   └── Animation system with interpolation
├── Responsive Design
│   ├── Dynamic grid calculation
│   ├── Typography scaling
│   └── Mobile/desktop control adaptation
└── Portfolio Integration
    ├── Project data mapping
    ├── Modal panel system
    └── Navigation state management
```

## Controls

| Platform | Movement | Interaction | Panel Close |
|----------|----------|-------------|-------------|
| Desktop | Arrow keys | Mouse click | ESC key |
| Mobile | Swipe gestures | Touch | X button |

## Configuration

Project data is stored in the `portfolioData` array:

```javascript
const portfolioData = [
  {
    sentence: "Text content",
    keyword: "collectible_word",
    slug: "project-identifier"
  }
];
```

## Browser Compatibility

Tested and optimized for:
- Chrome (desktop/mobile)
- Safari (desktop/iOS)
- Firefox (desktop/mobile)

Text positioning includes browser-specific adjustments for consistent rendering across platforms.

---

Laboratorio di Web e Digital Design, Politecnico di Milano  - AY: 2024/25
