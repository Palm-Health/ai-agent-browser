import { VaultService } from '../services/vaultService';
import * as path from 'path';
import * as os from 'os';
import { promises as fs } from 'fs';

async function run() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vault-test-'));
  const vault = new VaultService(tempDir);

  const html = '<html><head><title>Test Page</title></head><body><h1>Hello Vault</h1></body></html>';
  const snapshot = await vault.savePageSnapshot('https://example.com', html, { title: 'Example Page' });

  const list = await vault.listSnapshots();
  if (!list.find(item => item.id === snapshot.id)) {
    throw new Error('Snapshot was not listed');
  }

  const retrieved = await vault.getSnapshotById(snapshot.id);
  if (!retrieved || !retrieved.html.includes('Hello Vault')) {
    throw new Error('Snapshot retrieval failed');
  }

  const rendered = await vault.renderVaultUrl(`vault://page/${snapshot.id}`);
  if (!rendered.html.includes('Hello Vault')) {
    throw new Error('Vault protocol rendering failed');
  }

  console.log('Vault tests passed');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
