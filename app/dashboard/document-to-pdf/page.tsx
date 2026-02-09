"use client";

import { useState, useRef } from "react";
import { PDFDocument, StandardFonts } from "pdf-lib";
import * as mammoth from "mammoth";

export default function DocumentToPdfPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ALLOWED_TYPES = [".txt", ".html", ".json", ".docx"];

  const isValidFileType = (fileName?: string) => {
    if (!fileName) return false;
    return ALLOWED_TYPES.some((ext) =>
      fileName.toLowerCase().endsWith(ext)
    );
  };

  const processSelectedFile = (file: File) => {
    setFiles([file]);

    if (!isValidFileType(file.name)) {
      setError(
        "Unsupported file type. Please upload: .txt, .html, .json, .docx"
      );
    } else {
      setError("");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    processSelectedFile(e.target.files[0]);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (!e.dataTransfer.files?.[0]) return;
    processSelectedFile(e.dataTransfer.files[0]);
  };

  const handleRemoveFile = () => {
    setFiles([]);
    setError("");
  };
  const [isDragging, setIsDragging] = useState(false); // ✅ NEW

  const handleConvert = async () => {
    if (!files[0]) return;

    const file = files[0];

    if (!isValidFileType(file.name)) {
      setError(
        "Unsupported file type. Please upload: .txt, .html, .json, .docx"
      );
      return;
    }

    setLoading(true);

    try {
      let text = "";

      console.log("Processing:", file.name);

      // DOCX Support
      if (file.name.toLowerCase().endsWith(".docx")) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value || "";
      } else {
        console.log("Text file detected");
        text = await file.text();
      }

      if (!text || text.trim().length === 0) {
        throw new Error("No readable text found in file");
      }

      // Create PDF
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]);

      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      const fontSize = 12;
      const margin = 50;
      const { width, height } = page.getSize();

      const words = text.split(/\s+/);
      let lines: string[] = [];
      let currentLine = "";

      for (const word of words) {
        const test = currentLine + word + " ";
        const w = font.widthOfTextAtSize(test, fontSize);

        if (w > width - margin * 2 && currentLine !== "") {
          lines.push(currentLine);
          currentLine = word + " ";
        } else {
          currentLine = test;
        }
      }

      if (currentLine) lines.push(currentLine);

      let y = height - margin;

      for (const line of lines) {
        if (y < margin) break;

        page.drawText(line, {
          x: margin,
          y,
          size: fontSize,
          font,
        });

        y -= fontSize + 6;
      }

      const pdfBytes = await pdfDoc.save();

      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = file.name.replace(/\.[^/.]+$/, "") + ".pdf";
      a.click();

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError("Conversion failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 650, margin: "40px auto" }}>
      <h1>Document to PDF</h1>

      {/* ✅ NEW DRAG + DROP AREA */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => {
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);

          if (e.dataTransfer.files) {
            setFiles(Array.from(e.dataTransfer.files));
          }
        }}
        style={{
          border: isDragging ? "2px solid #4f46e5" : "2px dashed #aaa",
          background: isDragging ? "#eef2ff" : "transparent",
          padding: "40px",
          textAlign: "center",
          borderRadius: "10px",
          transition: "all 0.2s ease",
          cursor: "pointer",
          marginTop: "20px"
        }}
      >
        <input
          type="file"
          accept=".txt,.html,.json,.docx"
          onChange={(e) => {
            if (!e.target.files) return;
            setFiles(Array.from(e.target.files));
          }}
          style={{ display: "none" }}
          id="fileUpload"
        />

        <label htmlFor="fileUpload" style={{ cursor: "pointer" }}>
          {isDragging
            ? "Drop file here 📂"
            : "Drag & drop file here OR Click to select"}
        </label>
      </div>

      <br />

      <button onClick={handleConvert} disabled={loading}>
        {loading ? "Converting..." : "Convert to PDF"}
      </button>
    </div>
  );
}
