# 🛠️ Implementation Plan — OneTap Admin Dashboard
**URL:** https://admin.onetap-charm.com  
**Versi:** 2.0  
**Tanggal:** 2026-05-07  
**Status:** Ready for Development

---

## 📋 Daftar Fitur

| ID | Fitur | Prioritas | Estimasi |
|----|-------|-----------|----------|
| A1 | Hapus Menu Tags | Low | 0.5 jam |
| A2 | Password Protection untuk Read/Write NFC | High | 4–6 jam |
| A3 | Password Link Protection (Encrypted Redirect) | High | 6–8 jam |
| A4 | Bulk Write NFC Tags | Medium | 5–7 jam |
| A5 | NFC Absensi + Auto WA via Fonnte (tanpa aksi user) | High | 8–12 jam |

---

## A1 — Hapus Menu Tags

### Deskripsi
Sembunyikan atau hapus menu "Tags" dari sidebar navigasi admin.

### Langkah Implementasi

1. Cari komponen Sidebar di codebase (biasanya `components/Sidebar.tsx` atau `components/Layout.tsx`)
2. Temukan array/list nav items — cari item dengan label `"Tags"` atau route `/tags`
3. Hapus atau comment-out item tersebut
4. Protect atau redirect route `/tags` jika diakses langsung via URL

```tsx
// Hapus item ini dari nav config
// { label: "Tags", href: "/tags", icon: TagIcon }
```

5. Test navigasi — pastikan tidak ada broken link mengarah ke halaman Tags

---

## A2 — Password Protection untuk Read/Write NFC

### Deskripsi
Sebelum admin bisa melakukan operasi **Read** atau **Write** ke NFC tag, sistem meminta password tambahan sebagai lapisan keamanan privasi.

### Arsitektur

```
Admin klik "Read" / "Write"
        ↓
Modal muncul → Input Password
        ↓
Verifikasi password (server-side bcrypt)
        ↓
[Salah] → Tampilkan error, blokir akses
[Benar] → Lanjutkan operasi Read/Write
```

### Schema Data

```json
{
  "nfc_operation_password": {
    "hash": "<bcrypt_hash_of_password>",
    "enabled": true,
    "scope": "per_user"
  }
}
```

### Langkah Implementasi

**Step 1 — Buat komponen Modal Password**

```tsx
// components/NfcPasswordModal.tsx
interface NfcPasswordModalProps {
  isOpen: boolean;
  operation: "read" | "write";
  onSuccess: () => void;
  onCancel: () => void;
}

export function NfcPasswordModal({
  isOpen, operation, onSuccess, onCancel
}: NfcPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    const res = await fetch("/api/nfc/verify-operation-password", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
    const result = await res.json();
    if (result.success) {
      onSuccess();
    } else {
      setError("Password salah. Coba lagi.");
    }
    setLoading(false);
  };

  return (
    <Modal isOpen={isOpen} title={`Konfirmasi ${operation === "read" ? "Read" : "Write"} NFC`}>
      <p className="text-gray-500 mb-4">
        Masukkan password untuk melanjutkan operasi ini.
      </p>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="input w-full"
        placeholder="Password"
      />
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      <div className="flex gap-3 mt-4">
        <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1">
          {loading ? "Memverifikasi..." : "Konfirmasi"}
        </button>
        <button onClick={onCancel} className="btn-outline flex-1">Batal</button>
      </div>
    </Modal>
  );
}
```

**Step 2 — API endpoint verifikasi**

```ts
// pages/api/nfc/verify-operation-password.ts
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const { password, userId } = await req.json();
  const storedHash = await db.getUserNfcPasswordHash(userId);

  if (!storedHash) {
    return Response.json({ success: true }); // tidak ada password = bebas akses
  }

  const isValid = await bcrypt.compare(password, storedHash);
  return Response.json({ success: isValid });
}
```

**Step 3 — Integrasikan ke halaman Read & Write**

```tsx
const [showPasswordModal, setShowPasswordModal] = useState(false);
const [pendingOperation, setPendingOperation] = useState<"read" | "write" | null>(null);

const handleReadClick = () => {
  if (nfcPasswordEnabled) {
    setPendingOperation("read");
    setShowPasswordModal(true);
  } else {
    startReadOperation();
  }
};

const handlePasswordSuccess = () => {
  setShowPasswordModal(false);
  if (pendingOperation === "read") startReadOperation();
  if (pendingOperation === "write") startWriteOperation();
};
```

**Step 4 — Halaman Settings untuk atur password NFC**

```tsx
// Di halaman /settings
<section className="card p-6">
  <h3 className="font-semibold text-lg mb-4">Keamanan Operasi NFC</h3>
  <Toggle
    label="Aktifkan password sebelum Read/Write"
    checked={enabled}
    onChange={setEnabled}
  />
  {enabled && (
    <div className="mt-4 space-y-3">
      <Input type="password" label="Password baru" />
      <Input type="password" label="Konfirmasi password" />
      <button className="btn-primary">Simpan Password</button>
    </div>
  )}
</section>
```

---

## A3 — Password Link Protection (Encrypted Redirect)

### Deskripsi
Link yang disimpan di NFC tag bisa diproteksi password. Ketika NFC di-tap, user diarahkan ke halaman perantara yang meminta password. Jika benar, baru di-redirect ke URL tujuan.

### Arsitektur

```
NFC Tag menyimpan → onetap-charm.com/r/{token}
        ↓
User tap NFC → halaman /r/{token} terbuka
        ↓
Cek: apakah link ini protected?
        ↓
[Tidak] → Redirect langsung ke URL asli
[Ya]    → Tampilkan form input password
        ↓
Server verifikasi password
        ↓
[Salah] → Tampilkan error
[Benar] → Redirect ke URL asli
```

### Schema Database

```sql
CREATE TABLE protected_links (
  id             UUID PRIMARY KEY,
  tag_id         VARCHAR(255) NOT NULL,
  original_url   TEXT NOT NULL,
  is_protected   BOOLEAN DEFAULT FALSE,
  password_hash  VARCHAR(255),
  token          VARCHAR(64) UNIQUE NOT NULL,
  created_at     TIMESTAMP,
  updated_at     TIMESTAMP
);
```

### Implementasi

**Step 1 — Generate token saat Write**

```ts
// lib/linkProtection.ts
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

export async function generateLink(
  originalUrl: string,
  tagId: string,
  password?: string
): Promise<string> {
  const token = randomBytes(24).toString("hex");
  const passwordHash = password ? await bcrypt.hash(password, 10) : null;

  await db.protectedLinks.create({
    token,
    tagId,
    originalUrl,
    isProtected: !!password,
    passwordHash,
  });

  return `https://onetap-charm.com/r/${token}`;
}
```

**Step 2 — Halaman redirect /r/[token]**

```tsx
// pages/r/[token].tsx
export default function RedirectPage({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { data: linkData, isLoading } = useLinkData(token);

  useEffect(() => {
    if (linkData && !linkData.isProtected) {
      window.location.href = linkData.originalUrl;
    }
  }, [linkData]);

  if (isLoading || !linkData?.isProtected) {
    return <LoadingScreen text="Mengalihkan..." />;
  }

  const handleUnlock = async () => {
    const res = await fetch(`/api/links/unlock/${token}`, {
      method: "POST",
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    } else {
      setError("Password salah. Coba lagi.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-white">
      <div className="card p-8 max-w-sm w-full text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-bold mb-1">Link Terproteksi</h2>
        <p className="text-gray-500 text-sm mb-6">
          Masukkan password untuk mengakses konten ini.
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
          placeholder="Password"
          className="input w-full mb-3"
        />
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <button onClick={handleUnlock} className="btn-primary w-full">
          Buka →
        </button>
      </div>
    </div>
  );
}
```

**Step 3 — API endpoint unlock**

```ts
// pages/api/links/unlock/[token].ts
export async function POST(req: Request, { params }: { params: { token: string } }) {
  const { password } = await req.json();
  const link = await db.getLinkByToken(params.token);

  if (!link) return Response.json({ error: "Link tidak ditemukan" }, { status: 404 });
  if (!link.isProtected) return Response.json({ url: link.originalUrl });

  const isValid = await bcrypt.compare(password, link.passwordHash);
  if (!isValid) return Response.json({ error: "Password salah" }, { status: 401 });

  return Response.json({ url: link.originalUrl });
}
```

**Step 4 — Toggle di form Write Admin**

```tsx
<FormSection title="Proteksi Link">
  <Toggle
    label="Aktifkan Password Link Protection"
    checked={isPasswordProtected}
    onChange={setIsPasswordProtected}
  />
  {isPasswordProtected && (
    <div className="mt-3 space-y-2">
      <Input
        type="password"
        label="Password untuk link ini"
        placeholder="Minimal 6 karakter"
        value={linkPassword}
        onChange={setLinkPassword}
      />
      <p className="text-xs text-gray-400">
        User harus memasukkan password ini sebelum diarahkan ke URL tujuan.
      </p>
    </div>
  )}
</FormSection>
```

---

## A4 — Bulk Write NFC Tags

### Deskripsi
Admin bisa menulis data yang sama ke banyak NFC tag secara berurutan tanpa harus mengklik "Write" ulang setiap kali. Berguna untuk pesanan banyak dengan data seragam.

### Alur UX

```
1. Admin isi data di form Write
2. Aktifkan toggle "Bulk Write Mode"
3. (Opsional) Isi jumlah tag target
4. Klik "Mulai Bulk Write"
5. "Tempelkan NFC tag ke-1..."
6. Tag ditempel → tulis data → "✓ Tag ke-1 berhasil"
7. Otomatis siap untuk tag berikutnya
8. Ulangi sampai target atau admin klik "Selesai"
```

### Implementasi

**Step 1 — State management**

```tsx
const [isBulkMode, setIsBulkMode] = useState(false);
const [bulkTarget, setBulkTarget] = useState<number | null>(null);
const [bulkCount, setBulkCount] = useState(0);
const [bulkStatus, setBulkStatus] = useState<"idle" | "waiting" | "writing" | "done">("idle");
const [bulkLog, setBulkLog] = useState<
  { index: number; status: "success" | "error"; message: string }[]
>([]);
```

**Step 2 — Loop write logic**

```tsx
const startBulkWrite = async () => {
  setBulkStatus("waiting");
  setBulkCount(0);
  setBulkLog([]);
  let count = 0;

  while (true) {
    if (bulkTarget && count >= bulkTarget) {
      setBulkStatus("done");
      break;
    }

    setBulkStatus("waiting");

    try {
      const ndef = new NDEFReader();
      await ndef.write(nfcPayload);
      count++;
      setBulkCount(count);
      setBulkLog((prev) => [
        ...prev,
        { index: count, status: "success", message: `Tag ke-${count} berhasil ditulis` },
      ]);
      await new Promise((r) => setTimeout(r, 800));
    } catch (err: any) {
      setBulkLog((prev) => [
        ...prev,
        { index: count + 1, status: "error", message: `Error: ${err.message}` },
      ]);
    }
  }
};
```

**Step 3 — UI Bulk Write**

```tsx
<div className="border rounded-xl p-4 mt-4 bg-gray-50">
  <div className="flex items-center justify-between">
    <div>
      <h4 className="font-semibold">Bulk Write Mode</h4>
      <p className="text-sm text-gray-500">Tulis data yang sama ke banyak tag sekaligus</p>
    </div>
    <Toggle checked={isBulkMode} onChange={setIsBulkMode} />
  </div>

  {isBulkMode && (
    <div className="mt-4 space-y-3">
      <Input
        type="number"
        label="Jumlah tag (kosongkan = tidak terbatas)"
        value={bulkTarget ?? ""}
        onChange={(v) => setBulkTarget(v ? parseInt(v) : null)}
        min={1}
      />

      {bulkStatus === "idle" && (
        <button onClick={startBulkWrite} className="btn-primary w-full">
          Mulai Bulk Write
        </button>
      )}

      {(bulkStatus === "waiting" || bulkStatus === "writing") && (
        <div className="text-center p-6 bg-blue-50 rounded-xl">
          <div className="animate-bounce text-4xl mb-3">📲</div>
          <p className="font-semibold text-blue-700">
            Tempelkan NFC tag ke-{bulkCount + 1}...
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {bulkCount} tag berhasil{bulkTarget ? ` dari ${bulkTarget}` : ""}
          </p>
          <button
            onClick={() => setBulkStatus("done")}
            className="btn-outline mt-4 text-sm"
          >
            Selesai
          </button>
        </div>
      )}

      {bulkStatus === "done" && (
        <div className="text-center p-4 bg-green-50 rounded-xl">
          <p className="font-semibold text-green-700">
            ✓ Selesai — {bulkCount} tag berhasil ditulis
          </p>
          <button
            onClick={() => { setBulkStatus("idle"); setBulkLog([]); setBulkCount(0); }}
            className="btn-outline mt-3 text-sm"
          >
            Mulai Lagi
          </button>
        </div>
      )}

      {bulkLog.length > 0 && (
        <div className="max-h-48 overflow-y-auto space-y-1 mt-2">
          {bulkLog.map((log) => (
            <div
              key={log.index}
              className={`text-sm px-3 py-2 rounded-lg ${
                log.status === "success"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {log.status === "success" ? "✓" : "✗"} {log.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )}
</div>
```

---

## A5 — NFC Absensi: Auto-Kirim WA via Fonnte

### Deskripsi
Ketika keychain NFC di-tap, kehadiran **langsung tercatat otomatis** di database dan **pesan WA langsung terkirim ke guru** — **tanpa aksi apapun dari siswa**. Siswa hanya tap, selesai.

### Flow Lengkap

```
Siswa tap NFC keychain
        ↓
Browser otomatis buka: onetap-charm.com/attend/{token}
        ↓
Server catat kehadiran ke database (nama, kelas, timestamp)
        ↓
Server kirim HTTP request ke Fonnte API
        ↓
Fonnte kirim WA otomatis ke nomor guru ← TIDAK PERLU AKSI USER
        ↓
Halaman tampilkan: "✅ Kehadiran berhasil tercatat!"
        ↓
Guru terima notif WA: "Siswa Budi hadir di kelas IPA pukul 08:32 WIB"
```

### Setup Fonnte (One-Time)

1. Daftar akun di [fonnte.com](https://fonnte.com)
2. Di dashboard Fonnte, klik **"Tambah Device"**
3. Hubungkan nomor WhatsApp dengan scan QR (bisa nomor pribadi/bisnis)
4. Salin **API Token** dari dashboard Fonnte
5. Simpan token ke environment variable project:

```env
FONNTE_API_TOKEN=your_fonnte_token_here
```

> **Catatan biaya Fonnte:** Mulai ~Rp 50.000–150.000/bulan. Ada free trial. Pesan tidak terbatas selama device aktif.

### Schema Database

```sql
-- Konfigurasi per NFC tag absensi
CREATE TABLE attendance_tags (
  id               UUID PRIMARY KEY,
  tag_id           VARCHAR(255) UNIQUE NOT NULL,
  student_name     VARCHAR(255) NOT NULL,
  class_name       VARCHAR(255) NOT NULL,
  subject          VARCHAR(255),
  teacher_phone    VARCHAR(20) NOT NULL,    -- format: 628xxxxxxxxxx
  message_template TEXT NOT NULL,
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMP,
  updated_at       TIMESTAMP
);

-- Log setiap kejadian absensi
CREATE TABLE attendance_logs (
  id           UUID PRIMARY KEY,
  tag_id       VARCHAR(255) NOT NULL,
  student_name VARCHAR(255) NOT NULL,
  class_name   VARCHAR(255) NOT NULL,
  tapped_at    TIMESTAMP NOT NULL,
  wa_sent      BOOLEAN DEFAULT FALSE,
  wa_error     TEXT                        -- simpan error message jika gagal
);
```

### Implementasi

**Step 1 — Fonnte API helper**

```ts
// lib/fonnte.ts
const FONNTE_API_TOKEN = process.env.FONNTE_API_TOKEN!;

interface SendWAParams {
  target: string;   // format: 628xxxxxxxxxx
  message: string;
}

export async function sendWhatsApp({ target, message }: SendWAParams): Promise<boolean> {
  try {
    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: FONNTE_API_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target,
        message,
        countryCode: "62",
      }),
    });

    const data = await res.json();
    return data.status === true;
  } catch (err) {
    console.error("Fonnte send error:", err);
    return false;
  }
}
```

**Step 2 — API endpoint attendance (dipanggil otomatis saat halaman dibuka)**

```ts
// pages/api/attendance/[token].ts
import { sendWhatsApp } from "@/lib/fonnte";

export async function POST(req: Request, { params }: { params: { token: string } }) {
  // 1. Ambil konfigurasi tag dari DB
  const tag = await db.attendanceTags.findByTagId(params.token);
  if (!tag || !tag.isActive) {
    return Response.json({ error: "Tag tidak valid" }, { status: 404 });
  }

  // 2. Catat ke attendance_logs
  const now = new Date();
  const log = await db.attendanceLogs.create({
    tagId: params.token,
    studentName: tag.studentName,
    className: tag.className,
    tappedAt: now,
    waSent: false,
  });

  // 3. Format tanggal & waktu (Indonesia)
  const date = now.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const time = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // 4. Render template pesan
  const message = tag.messageTemplate
    .replace("{student_name}", tag.studentName)
    .replace("{class_name}", tag.className)
    .replace("{subject}", tag.subject ?? "-")
    .replace("{date}", date)
    .replace("{time}", time);

  // 5. Kirim WA via Fonnte (fully automatic, no user action needed)
  const waSent = await sendWhatsApp({
    target: tag.teacherPhone,
    message,
  });

  // 6. Update status pengiriman WA di log
  await db.attendanceLogs.update(log.id, {
    waSent,
    waError: waSent ? null : "Fonnte failed to deliver",
  });

  return Response.json({
    success: true,
    studentName: tag.studentName,
    className: tag.className,
    date,
    time,
    waSent,
  });
}
```

**Step 3 — Halaman /attend/[token] (otomatis, tidak ada tombol apapun)**

```tsx
// pages/attend/[token].tsx
// Halaman ini dipanggil ketika NFC di-tap
// Seluruh proses terjadi otomatis di background

export default function AttendancePage({ token }: { token: string }) {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [data, setData] = useState<{
    studentName: string;
    className: string;
    date: string;
    time: string;
    waSent: boolean;
  } | null>(null);

  useEffect(() => {
    // Langsung proses saat halaman dibuka — tanpa klik apapun
    const processAttendance = async () => {
      try {
        const res = await fetch(`/api/attendance/${token}`, { method: "POST" });
        const result = await res.json();

        if (result.success) {
          setData(result);
          setStatus("success");
        } else {
          setStatus("error");
        }
      } catch {
        setStatus("error");
      }
    };

    processAttendance();
  }, [token]);

  // Loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="text-center">
          <div className="animate-spin text-5xl mb-4">⏳</div>
          <p className="text-lg font-semibold text-gray-700">Mencatat kehadiran...</p>
          <p className="text-sm text-gray-400 mt-1">Mohon tunggu sebentar</p>
        </div>
      </div>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center p-8">
          <div className="text-5xl mb-4">❌</div>
          <p className="text-lg font-semibold text-red-600">Gagal mencatat kehadiran</p>
          <p className="text-gray-500 text-sm mt-1">
            Tag tidak valid atau tidak aktif. Hubungi admin.
          </p>
        </div>
      </div>
    );
  }

  // Success state — ditampilkan setelah semua proses selesai
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
      <div className="card max-w-sm w-full mx-4 p-8 text-center shadow-lg">
        {/* Success icon */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">✅</span>
        </div>

        <h2 className="text-2xl font-bold text-green-700 mb-1">Hadir!</h2>
        <p className="text-gray-500 text-sm mb-6">Kehadiran kamu berhasil tercatat</p>

        {/* Detail card */}
        <div className="bg-gray-50 rounded-xl p-4 text-left space-y-3 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Nama</span>
            <span className="font-semibold text-sm">{data?.studentName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Kelas</span>
            <span className="font-semibold text-sm">{data?.className}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Tanggal</span>
            <span className="font-semibold text-sm">{data?.date}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Waktu</span>
            <span className="font-semibold text-sm">{data?.time} WIB</span>
          </div>
        </div>

        {/* WA notification status */}
        <div className={`text-xs px-3 py-2 rounded-full inline-block mb-6 ${
          data?.waSent
            ? "bg-green-100 text-green-600"
            : "bg-yellow-100 text-yellow-600"
        }`}>
          {data?.waSent
            ? "📲 Notifikasi WA terkirim ke guru"
            : "⚠️ Notifikasi WA gagal — hubungi admin"}
        </div>

        <div className="pt-4 border-t">
          <a
            href="https://onetap-charm.com"
            className="text-xs text-gray-300 hover:text-gray-400"
          >
            Powered by OneTap
          </a>
        </div>
      </div>
    </div>
  );
}
```

**Step 4 — Form konfigurasi Attendance di Write NFC Admin**

Tambahkan tab "Absensi WA" di halaman Write:

```tsx
{writeMode === "attendance" && (
  <div className="space-y-4">
    <Input
      label="Nama Siswa"
      value={studentName}
      onChange={setStudentName}
      required
    />
    <Input
      label="Nama Kelas"
      value={className}
      onChange={setClassName}
      required
    />
    <Input
      label="Mata Pelajaran (opsional)"
      value={subject}
      onChange={setSubject}
    />
    <Input
      label="Nomor WhatsApp Guru / Admin"
      placeholder="628xxxxxxxxxx (tanpa + atau spasi)"
      value={teacherPhone}
      onChange={setTeacherPhone}
      required
    />
    <div>
      <label className="text-sm font-medium block mb-1">Template Pesan WA</label>
      <textarea
        value={messageTemplate}
        onChange={(e) => setMessageTemplate(e.target.value)}
        rows={5}
        className="input w-full font-mono text-sm"
      />
      <div className="mt-2 p-3 bg-blue-50 rounded-lg text-xs text-blue-700 space-y-1">
        <p className="font-semibold">Variabel yang tersedia:</p>
        <p><code>{"{student_name}"}</code> — nama siswa</p>
        <p><code>{"{class_name}"}</code> — nama kelas</p>
        <p><code>{"{subject}"}</code> — mata pelajaran</p>
        <p><code>{"{date}"}</code> — tanggal lengkap (Senin, 7 Mei 2026)</p>
        <p><code>{"{time}"}</code> — jam tap (08:32)</p>
      </div>
    </div>

    {/* Preview pesan */}
    <div className="p-4 bg-gray-50 rounded-xl border">
      <p className="text-xs text-gray-400 mb-2">Preview pesan yang akan dikirim:</p>
      <p className="text-sm whitespace-pre-wrap text-gray-700">
        {messageTemplate
          .replace("{student_name}", studentName || "Nama Siswa")
          .replace("{class_name}", className || "Nama Kelas")
          .replace("{subject}", subject || "Mata Pelajaran")
          .replace("{date}", "Senin, 7 Mei 2026")
          .replace("{time}", "08:32")}
      </p>
    </div>
  </div>
)}
```

**Step 5 — Halaman Log Absensi di Dashboard Admin**

Tambahkan menu "Absensi" di sidebar:

```tsx
// pages/admin/attendance.tsx
export default function AttendanceDashboard() {
  const { data: logs } = useAttendanceLogs();
  const { data: stats } = useAttendanceStats();

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Log Absensi</h1>
          <p className="text-gray-500 text-sm">Rekap kehadiran dari semua NFC tag absensi</p>
        </div>
        <button onClick={exportCSV} className="btn-outline">
          Export CSV
        </button>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card p-4">
          <p className="text-sm text-gray-500">Hari Ini</p>
          <p className="text-3xl font-bold text-blue-600">{stats?.today ?? 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Minggu Ini</p>
          <p className="text-3xl font-bold text-purple-600">{stats?.thisWeek ?? 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">WA Terkirim</p>
          <p className="text-3xl font-bold text-green-600">{stats?.waSentRate ?? 0}%</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-3 mb-4">
        <input placeholder="Cari nama siswa..." className="input max-w-xs" />
        <input type="date" className="input" />
        <select className="input">
          <option value="">Semua Kelas</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Nama Siswa</th>
              <th className="px-4 py-3 text-left">Kelas</th>
              <th className="px-4 py-3 text-left">Waktu</th>
              <th className="px-4 py-3 text-left">Notif WA</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {logs?.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{log.studentName}</td>
                <td className="px-4 py-3 text-gray-500">{log.className}</td>
                <td className="px-4 py-3 text-gray-500">{formatDateTime(log.tappedAt)}</td>
                <td className="px-4 py-3">
                  {log.waSent ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      ✓ Terkirim
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                      ✗ Gagal
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## 📦 Dependencies Tambahan

| Package | Kegunaan |
|---------|----------|
| `bcryptjs` | Hash password |
| `uuid` | Generate unique token |
| `crypto` (built-in Node.js) | Generate random token untuk link protection |
| Web NFC API (`NDEFReader`) | Baca/tulis NFC di browser Chrome Android |

### Environment Variables yang Diperlukan

```env
FONNTE_API_TOKEN=your_fonnte_api_token
LINK_ENCRYPTION_KEY=32_char_random_secret_here
DATABASE_URL=your_database_url
```

---

## ⚠️ Catatan Penting

- **Web NFC API** hanya berjalan di Chrome Android — admin wajib pakai Android untuk operasi NFC
- **Fonnte** perlu nomor WA yang aktif dan terhubung via QR. Jika HP mati atau logout dari WA, notifikasi tidak terkirim. Pertimbangkan pakai nomor dedicated khusus untuk Fonnte
- Semua password wajib di-hash dengan **bcrypt** — jangan pernah simpan plain text
- Terapkan **rate limiting** di endpoint `/api/attendance/[token]` untuk mencegah tap spam
- Halaman `/r/{token}` dan `/attend/{token}` di-host di **landing page**, bukan di admin
- Default template pesan WA yang direkomendasikan:
  ```
  ✅ *Absensi OneTap*
  
  Siswa *{student_name}* hadir dalam kelas *{class_name}*
  📅 {date}
  🕐 {time} WIB
  ```

---

## 🗓️ Estimasi Total Pengerjaan

| Fase | Fitur | Estimasi |
|------|-------|----------|
| Fase 1 | A1 + A2 (Hapus Tags + Password Op) | 1–2 hari |
| Fase 2 | A3 (Password Link Protection) | 2–3 hari |
| Fase 3 | A4 (Bulk Write) | 1–2 hari |
| Fase 4 | A5 (Absensi + Fonnte Auto-WA) | 2–3 hari |
| **Total** | | **~6–10 hari kerja** |