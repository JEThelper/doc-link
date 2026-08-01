import { useCallback, useEffect, useRef, useState } from "react";

import {
  PadFile,
  deleteFile,
  fileUrl,
  listFiles,
  uploadFile,
} from "../api";
import { useAuth } from "../auth";

interface Props {
  slug: string;
}

// Upload limits — kept in sync with backend env defaults (ANON_MAX_FILE_BYTES /
// AUTH_MAX_FILE_BYTES in .env.example). These are the client-side pre-flight
// guards; the server enforces the authoritative limits.
const ANON_MAX_FILE_BYTES  = 10 * 1024 * 1024;  // 10 MB
const AUTH_MAX_FILE_BYTES  = 50 * 1024 * 1024;  // 50 MB
const ANON_MAX_FILES       = 5;
const AUTH_MAX_FILES       = 50;

// Conservative allowlist covering the most common safe file types.
// Anything not in this set is rejected client-side with a clear message.
const ALLOWED_MIME_PREFIXES = [
  "image/",
  "video/",
  "audio/",
  "text/",
  "application/pdf",
  "application/json",
  "application/zip",
  "application/x-zip-compressed",
  "application/gzip",
  "application/x-tar",
  "application/vnd.openxmlformats-officedocument",  // .docx/.xlsx/.pptx
  "application/vnd.ms-",                             // legacy Office formats
  "application/msword",
  "application/rtf",
  "application/xml",
  "application/csv",
];

function isMimeAllowed(mime: string): boolean {
  // Browsers sometimes return an empty MIME type for unknown files — allow
  // those through and let the server decide, rather than blocking valid files.
  if (!mime) return true;
  return ALLOWED_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix));
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileTray({ slug }: Props) {
  const { user } = useAuth();
  const [files, setFiles] = useState<PadFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const maxFileBytes  = user ? AUTH_MAX_FILE_BYTES  : ANON_MAX_FILE_BYTES;
  const maxFileCount  = user ? AUTH_MAX_FILES        : ANON_MAX_FILES;
  const maxFileMB     = maxFileBytes / (1024 * 1024);

  useEffect(() => {
    listFiles(slug).then(setFiles).catch(() => {});
  }, [slug]);

  /** Returns a validation error string, or null if the file is acceptable. */
  function validateFile(file: File, currentCount: number): string | null {
    if (currentCount >= maxFileCount) {
      return `Maximum ${maxFileCount} files per pad.`;
    }
    if (file.size > maxFileBytes) {
      return `"${file.name}" is ${formatSize(file.size)} — maximum size is ${maxFileMB} MB.`;
    }
    if (!isMimeAllowed(file.type)) {
      return `"${file.name}" has an unsupported file type (${file.type || "unknown"}).`;
    }
    return null;
  }

  const upload = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      setError("");
      setBusy(true);

      // Pre-flight: validate every file before any network requests.
      let currentCount = files.length;
      for (const f of Array.from(fileList)) {
        const err = validateFile(f, currentCount);
        if (err) {
          setError(err);
          setBusy(false);
          return;
        }
        currentCount++;
      }

      try {
        for (const f of Array.from(fileList)) {
          const created = await uploadFile(slug, f);
          setFiles((prev) => [...prev, created]);
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slug, files.length, maxFileBytes, maxFileCount]
  );

  async function remove(id: string) {
    try {
      await deleteFile(slug, id);
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="file-tray">
      <div
        className={`file-dropzone${dragging ? " is-dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          upload(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Attach files"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            upload(e.target.files);
            e.target.value = "";
          }}
        />
        <span className="file-dropzone-label">
          {busy
            ? "Uploading…"
            : `Tap to add files, or drop them here (max ${maxFileMB} MB each)`}
        </span>
      </div>

      {error && (
        <p className="file-error" role="alert">
          {error}
        </p>
      )}

      {files.length > 0 && (
        <ul className="file-chips">
          {files.map((f) => (
            <li key={f.id} className={`file-chip file-chip--${f.scan_status}`}>
              {f.scan_status === "clean" ? (
                <a
                  className="file-chip-name"
                  href={fileUrl(slug, f.id)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {f.filename}
                </a>
              ) : (
                <span className="file-chip-name" title={statusHint(f.scan_status)}>
                  {f.filename}
                </span>
              )}
              <span className="file-chip-meta">
                {f.scan_status === "pending" && "scanning…"}
                {f.scan_status === "failed" && "unavailable"}
                {f.scan_status === "clean" && formatSize(f.size_bytes)}
              </span>
              <button
                type="button"
                className="file-chip-remove"
                onClick={() => remove(f.id)}
                aria-label={`Remove ${f.filename}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function statusHint(status: string): string {
  if (status === "pending") return "Still being scanned for malware.";
  if (status === "failed") return "Failed the malware scan and cannot be downloaded.";
  return "";
}
