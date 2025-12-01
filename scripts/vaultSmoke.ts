import { initVault, saveSnapshot, listSnapshots, getSnapshotHTML } from '../src/browser/vault/vaultService';

async function run() {
  await initVault();
  const record = await saveSnapshot({
    url: 'https://example.com',
    html: '<html><head><title>Example</title></head><body><h1>Example</h1><p>Test page</p></body></html>',
    meta: { title: 'Example Test Page', tags: ['smoke'] },
  });

  console.log('Saved snapshot', record.id);
  const snapshots = await listSnapshots();
  console.log('Snapshot count', snapshots.length);
  const html = await getSnapshotHTML(record.id);
  console.log('Loaded snapshot length', html?.length || 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
