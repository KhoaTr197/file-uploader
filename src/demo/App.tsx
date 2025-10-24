import { useState } from 'react';
import { FileProcessor } from '@lib/core/processor';
import { ImagePreviewPlugin } from '@lib/plugins/images/PreviewPlugin';

function App() {
  const [preview, setPreview] = useState<string>('');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const processor = new FileProcessor();
    processor.use(new ImagePreviewPlugin({ size: 150 }));

    const result = await processor.process(file);
    setPreview(result.metadata.thumbnailURL);
  };

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleFile} />
      {preview && <img src={preview} alt="Preview" />}
    </div>
  );
}

export default App
