# MalesNgonten CLI (`malesngonten`) 🛠️

The official CLI tool to scaffold and add cinematic Remotion components and terminal simulators to your projects.

---

## Installation & Usage

Run components directly in your Remotion project using `npx`:

```bash
npx malesngonten add Terminal-Simulator
```

*(If running directly from GitHub before npm publication:)*
```bash
npx github:malesngonten/malesngonten add Terminal-Simulator
```

### Publishing to NPM
To make `npx malesngonten` work globally for everyone without `github:`, publish this package to npm:
```bash
npm login
npm publish --access public
```
