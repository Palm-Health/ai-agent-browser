export type DriveMediaFile = {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
};

const GOOGLE_DRIVE_API = 'https://www.googleapis.com/drive/v3/files';

function getAuthHeader() {
  const token = process.env.GOOGLE_DRIVE_ACCESS_TOKEN;
  if (!token) {
    throw new Error('Missing GOOGLE_DRIVE_ACCESS_TOKEN');
  }
  return { Authorization: `Bearer ${token}` };
}

export async function listDriveMediaFiles(folderId: string): Promise<DriveMediaFile[]> {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType, parents)',
    pageSize: '100',
  });

  const response = await fetch(`${GOOGLE_DRIVE_API}?${params.toString()}`, {
    headers: {
      ...getAuthHeader(),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Drive list failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.files as DriveMediaFile[];
}

export function buildDriveWebLink(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}
