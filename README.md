# MalesNgonten CLI (`malesngonten`) 🛠️

The official CLI tool to scaffold and add cinematic Remotion components and terminal simulators to your projects.

---

## Installation & Usage

Run components directly in your Remotion project using `npx`:

```bash
npx github:malesngonten/malesngonten add Terminal-Simulator
```

### What it does:
1. Fetches the component manifest from `malesngonten-registry`.
2. Automatically downloads component source files (`TypingDemo.tsx`, shaders) into `src/components/...`.
3. Downloads all required audio assets (`key-click.wav`, `fire-whoosh.wav`, etc.) into `public/audio/...`.
4. Outputs required npm dependencies (`remotion`, `@remotion/media`, `zod`).
