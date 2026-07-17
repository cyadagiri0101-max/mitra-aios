import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader } from '../components/Card';

type IndexedFile = {
  id: string;
  toolNo: string;
  itemType: 'folder' | 'file';
  folderName: string;
  parentRelativePath: string | null;
  relativePath: string;
  uncPath: string;
  fileName: string;
  extension: string | null;
  sizeBytes: number;
  lastModifiedAt: string;
};

export function EngineeringFileIndexerPage() {
  const [records, setRecords] = useState<IndexedFile[]>([]);
  const [toolNo, setToolNo] = useState('BM450');
  const [summary, setSummary] = useState<string>('');

  const load = async () => {
    const browseResponse = await api.get('/engineering-file-index', { params: { toolNo } });
    setRecords(browseResponse.data ?? []);
  };

  const rescan = async () => {
    const scanResponse = await api.post('/engineering-file-indexer/scan');
    const data = scanResponse.data;
    setSummary(`Indexed ${data.indexedFolders ?? 0} folders and ${data.indexedFiles ?? 0} files`);
    await load();
  };

  useEffect(() => {
    load();
  }, [toolNo]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Engineering File Indexer</h1>
          <p className="text-sm text-gray-500">Browse indexed folders and files from the SMB share.</p>
        </div>
        <button type="button" onClick={() => rescan()} className="btn-primary">Rescan</button>
      </div>
      {summary && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{summary}</div>}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <input value={toolNo} onChange={(e) => setToolNo(e.target.value)} placeholder="Tool No" className="input-field" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="px-3 py-2">Tool No</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Folder</th>
                  <th className="px-3 py-2">Path</th>
                  <th className="px-3 py-2">Ext</th>
                  <th className="px-3 py-2">Size</th>
                  <th className="px-3 py-2">Last Modified</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-t border-gray-100">
                    <td className="px-3 py-3">{record.toolNo}</td>
                    <td className="px-3 py-3 capitalize">{record.itemType}</td>
                    <td className="px-3 py-3">{record.folderName}</td>
                    <td className="px-3 py-3">{record.relativePath}</td>
                    <td className="px-3 py-3">{record.extension ?? '-'}</td>
                    <td className="px-3 py-3">{record.sizeBytes}</td>
                    <td className="px-3 py-3">{new Date(record.lastModifiedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
