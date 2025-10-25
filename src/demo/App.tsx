import { useState } from 'react';
import { FileProcessor } from '@lib';
import { ImagePreviewPlugin } from '@lib/plugins/images';

function App() {
  const [preview, setPreview] = useState<string>('');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const processor = new FileProcessor();
    processor.use(new ImagePreviewPlugin());

    const result = await processor.process(file);
    console.log(result);
    setPreview(result.metadata.previewURL);
  };

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleFile} />
      {preview && <img src={preview} alt="Preview" />}
    </div>
  );
}

export default App
