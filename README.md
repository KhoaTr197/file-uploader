# File Uploader

Thư viện tải tệp đơn giản được xây dựng bằng , **TypeScript**.

[![Giấy phép](https://img.shields.io/badge/Giấy%20phép-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.x-orange.svg)](https://www.typescriptlang.org/)

## Mục lục

- [Tổng quan](#tổng-quan)
- [Tính năng](#tính-năng)
- [Cài đặt](#cài-đặt)
- [Sử dụng](#sử-dụng)
- [Đóng góp](#đóng-góp)
- [Giấy phép](#giấy-phép)
- [Liên hệ](#liên-hệ)

## Tổng quan

**File Uploader** là một thư viện nhẹ, giúp hỗ trợ phát triển các tác vụ liên quan đến File. Dự án sử dụng:

- **TypeScript** để đảm bảo an toàn kiểu dữ liệu.

Dự án bắt đầu từ template chính thức **TypeScript** và mở rộng với tính năng xử lý tệp bằng **HTML5 File API**.

## Tính năng

- **Xác thực tệp**: Kiểm tra kích thước, loại tệp và số lượng.
- **TypeScript**: Toàn bộ mã nguồn được định kiểu rõ ràng.

## Cài đặt

```bash
  npm install @studib/file-uploader
  //-- or --//
  yarn add @studib/file-uploader
  //-- or --//
  pnpm install @studib/file-uploader
```

## Sử dụng

```js
import { FileUploaderUploader } from "@studib/file-uploader";

function App() {
  const [preview, setPreview] = useState("");

  const handleFile = async (e) => {
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
```

## Giấy phép

Dự án được cấp phép theo MIT License. Xem chi tiết tại LICENSE.

## Liên hệ

Khoa Trần - [GitHub @KhoaTr197](https://github.com/KhoaTr197)
Liên kết dự án: [File Uploader](https://github.com/KhoaTr197/file-uploader)
