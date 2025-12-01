# Windows Release Mode

This project ships a Windows installer using Electron Builder. The pipeline supports unsigned and code-signed builds depending on whether signing secrets are available.

## Local build

Run the release pipeline from the repo root:

```bash
pnpm release:win
```

Flags:

- `--skipInstall` – skip `pnpm install` (if dependencies are already present).
- `--skipBuild` – skip `pnpm build` (if the renderer + Electron bundles are already built).
- `--skipSmokeTest` – build without launching the installer smoke test.

Outputs: the installer is written to `dist/<product>-Setup-<version>-<arch>.exe`.

## Smoke testing

The release script runs a simple post-build smoke test by launching the installer with `--smoke-test`. You can run it directly:

```bash
pnpm tsx tools/qa/winReleaseSmoke.ts
```

## Code signing

Electron Builder signs automatically when the following environment variables are present:

- `CSC_LINK` – HTTPS URL or base64 content for a `.pfx/.p12` certificate.
- `CSC_KEY_PASSWORD` – password for the certificate.

If these are omitted, the build continues unsigned.

## Tagged releases via GitHub Actions

Push a tag to trigger the Windows release workflow:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The workflow builds the installer on `windows-latest` and uploads the `.exe` to the matching GitHub Release.
