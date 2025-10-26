import { useState } from 'react';
import { FileProcessor } from '@lib';
import { ImagePreviewPlugin } from '@lib/plugins/images';

function App() {
  const [preview, setPreview] = useState<{
    id: string;
    dataUrl: string;
  }[]>([]);
  const processor = new FileProcessor({
    maxFiles: 5
  });
  const plugin = new ImagePreviewPlugin();
  processor.use(plugin);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const fileArray: File[] = Array.from(files);

    const result = await processor.processMany(fileArray);
    console.log(result);
    setPreview(result.map(r => ({
      id: r.metadata.id,
      dataUrl: r.metadata.previewURL
    })));
  };

  const handleClose = (closeId: string) => {
    plugin.cleanupPreview(closeId);
    setPreview(prev => prev.filter(p => p.id !== closeId))
  }

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleFile} multiple />
      {preview && preview.map(p => (
        <>
          <img src={p.dataUrl} alt="Preview" />
          <button
            onClick={() => handleClose(p.id)}
            style={{
              background: "red",
              color: "white",
            }}
          >
            X
          </button>
        </>
      ))}
    </div>
  );
}

export default App
