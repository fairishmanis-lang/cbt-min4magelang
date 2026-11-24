import ExcelJS from 'exceljs';

export interface SoalTerbaca {
  pertanyaan: string;
  opsi_a: string;
  opsi_b: string;
  opsi_c: string;
  opsi_d: string;
  opsi_e: string;
  kunci_jawaban: string;
}

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  let binary = '';
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function formatRichText(text = ''): string {
  if (!text || typeof text !== 'string') return '';

  // 1. Ubah pecahan [[1/2]] menjadi $\frac{1}{2}$
  let result = text.replace(
    /\[\[([^/\]]+)\/([^\]]+)\]\]/g,
    (_, pembilang: string, penyebut: string) =>
      `$\\frac{${pembilang.trim()}}{${penyebut.trim()}}$`
  );

  // 2. Ubah tabel [[TABEL]] A | B ;; 1 | 2 [[/TABEL]] menjadi tabel HTML
  result = result.replace(
    /\[\[TABEL\]\]([\s\S]*?)\[\[\/TABEL\]\]/gi,
    (_, isiTabel: string) => {
      const barisList = isiTabel
        .trim()
        .split(';;')
        .map((b) => b.trim())
        .filter(Boolean);

      if (barisList.length === 0) return '';

      const barisHtml = barisList
        .map((baris, idx) => {
          const kolomList = baris.split('|').map((k) => k.trim());
          const tagSel = idx === 0 ? 'th' : 'td';
          const selHtml = kolomList
            .map((kolom) => `<${tagSel}>${kolom}</${tagSel}>`)
            .join('');
          return `<tr>${selHtml}</tr>`;
        })
        .join('');

      return `<table class="soal-tabel"><tbody>${barisHtml}</tbody></table>`;
    }
  );

  return result;
}

export async function parseExcelSoal(file: File): Promise<SoalTerbaca[]> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error('Sheet pertama tidak ditemukan di file Excel.');
  }

  // Ambil semua gambar yang ditempel di Excel berdasarkan posisi baris & kolom
  const petaGambar: Record<string, string[]> = {};
  const workbookModel = workbook.model as unknown as {
    media?: Array<{ index: number; buffer?: ArrayBuffer | Uint8Array; extension?: string }>;
  };
  const daftarMedia = workbookModel?.media || [];

  for (const img of sheet.getImages()) {
    const imageId = Number(img.imageId);
    const media = daftarMedia.find((m) => m.index === imageId);
    if (!media || !media.buffer) continue;

    const baris = Math.floor(img.range.tl.row) + 1;
    const kolom = Math.floor(img.range.tl.col) + 1;
    const base64 = arrayBufferToBase64(media.buffer);
    const ekstensi = media.extension || 'png';
    const srcGambar = `data:image/${ekstensi};base64,${base64}`;
    const kunci = `${baris}_${kolom}`;

    if (!petaGambar[kunci]) {
      petaGambar[kunci] = [];
    }
    petaGambar[kunci].push(
      `<img src="${srcGambar}" alt="Gambar Soal" class="soal-gambar" />`
    );
  }

  const hasilSoal: SoalTerbaca[] = [];

  sheet.eachRow((row, rowNumber) => {
    // Baris 1 dianggap header/judul kolom, lewati
    if (rowNumber === 1) return;

    const ambilIsiKolom = (colIndex: number): string => {
      const teksAsli = (row.getCell(colIndex).text || '').trim();
      const teksFormat = formatRichText(teksAsli);
      const gambarSel = petaGambar[`${rowNumber}_${colIndex}`] || [];

      if (gambarSel.length === 0) return teksFormat;
      if (!teksFormat) return gambarSel.join('<br/>');
      return `${teksFormat}<br/>${gambarSel.join('<br/>')}`;
    };

    const pertanyaan = ambilIsiKolom(2); // Kolom B: Soal
    const opsiA = ambilIsiKolom(3);      // Kolom C: Opsi A
    const opsiB = ambilIsiKolom(4);      // Kolom D: Opsi B
    const opsiC = ambilIsiKolom(5);      // Kolom E: Opsi C
    const opsiD = ambilIsiKolom(6);      // Kolom F: Opsi D
    const opsiE = ambilIsiKolom(7);      // Kolom G: Opsi E (jika ada)
    const kunciJawaban = (row.getCell(8).text || '').trim().toUpperCase(); // Kolom H

    if (!pertanyaan && !opsiA && !opsiB) return;

    hasilSoal.push({
      pertanyaan,
      opsi_a: opsiA,
      opsi_b: opsiB,
      opsi_c: opsiC,
      opsi_d: opsiD,
      opsi_e: opsiE,
      kunci_jawaban: kunciJawaban,
    });
  });

  return hasilSoal;
}
