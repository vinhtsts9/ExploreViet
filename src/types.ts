// c:\Vinhts\WebDulich\fe\src\types.ts

// Cấu trúc dữ liệu cho một khối nội dung ở phía Frontend (trong state của component)
export type ContentBlock =
  | { type: "text"; content: string }
  | { type: "image" | "video"; url: string; caption?: string };

// Cấu trúc dữ liệu cho một khối nội dung khi gửi lên Backend (khớp với API)
export type BackendContentBlock =
  | { type: "text"; value: string }
  | { type: "image" | "video"; value: string; caption?: string };
