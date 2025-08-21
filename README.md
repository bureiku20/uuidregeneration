# mc-uuid

A tiny CLI to regenerate UUIDs inside a Minecraft Bedrock `manifest.json`.

## Usage

```
mc-uuid [path/to/manifest.json] [options]
```

Options:

- `--dry` – print changes without writing
- `--no-backup` – skip `.bak` file
- `--pretty=2` – JSON indentation
- `--only=header|modules` – update only part of the manifest
- `--seed <string>` – deterministic UUIDs
- `--quiet` – minimal output

Example:

```
mc-uuid ./manifest.json
mc-uuid ./manifest.json --seed my-seed --only=modules --dry
```
