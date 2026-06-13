export interface HambatanInfo {
  label: string;
  icon: string;
  definisi: string;
  penyebab: string[];
  analisa: string;
  intervensi: string[];
  warna: string;
}

export const HAMBATAN_INFO: Record<string, HambatanInfo> = {
  "Kesulitan Penglihatan": {
    label: "Kesulitan Penglihatan",
    icon: "👁️",
    warna: "#6366f1",
    definisi:
      "Hambatan pada fungsi indra penglihatan yang tidak dapat dikoreksi sepenuhnya dengan kacamata, mencakup kondisi low vision (penglihatan sangat terbatas) hingga buta total (tunanetra).",
    penyebab: [
      "Kelainan refraksi parah (miopi tinggi, glaukoma)",
      "Katarak kongenital atau degeneratif",
      "Retinopati atau kerusakan saraf optik",
      "Faktor genetik dan keturunan",
      "Infeksi prenatal (rubella, toksoplasma)",
    ],
    analisa:
      "Siswa dengan hambatan penglihatan sering mengalami keterlambatan akademis bukan karena kemampuan kognitif yang rendah, melainkan karena akses informasi visual yang terbatas. Deteksi dini dan penyediaan alat bantu optik yang tepat dapat meningkatkan partisipasi belajar secara signifikan.",
    intervensi: [
      "Sediakan alat bantu: kacamata, kaca pembesar, atau buku braille",
      "Tempatkan siswa di posisi terdepan dan dekat papan tulis",
      "Gunakan materi cetak berukuran besar atau audio book",
      "Koordinasi dengan GPK untuk pembelajaran adaptif",
      "Rujukan rutin ke dokter mata dan optometris",
    ],
  },
  "Kesulitan Pendengaran": {
    label: "Kesulitan Pendengaran",
    icon: "🦻",
    warna: "#f59e0b",
    definisi:
      "Hambatan dalam mempersepsi bunyi/suara, mulai dari gangguan pendengaran ringan (suara lemah sulit didengar) hingga tuli total (tunarungu), yang berdampak pada kemampuan komunikasi verbal dan perkembangan bahasa.",
    penyebab: [
      "Infeksi telinga tengah yang tidak ditangani (otitis media)",
      "Paparan kebisingan ekstrem dalam waktu lama",
      "Faktor genetik atau sindrom bawaan",
      "Komplikasi saat kelahiran (asfiksia)",
      "Obat-obatan ototoksik pada masa bayi",
    ],
    analisa:
      "Keterlambatan bahasa akibat gangguan pendengaran sering disalahartikan sebagai hambatan kognitif. Skrining pendengaran sejak dini dan pemberian alat bantu dengar (hearing aid) terbukti meningkatkan capaian literasi dan komunikasi. Penempatan guru di posisi yang mudah dilihat siswa sangat membantu.",
    intervensi: [
      "Pasangkan hearing aid dan pantau kondisinya secara rutin",
      "Gunakan bahasa isyarat (SIBI/Bisindo) sebagai pengantar",
      "Minimalisir kebisingan di dalam kelas",
      "Sediakan teks tertulis atau subtitle untuk konten audio",
      "Latihan membaca gerak bibir (lip reading)",
    ],
  },
  "Kesulitan Motorik Kasar": {
    label: "Kesulitan Motorik Kasar",
    icon: "🦽",
    warna: "#10b981",
    definisi:
      "Keterbatasan dalam melakukan gerakan otot-otot besar tubuh seperti berjalan, berlari, keseimbangan, atau berpindah tempat. Kondisi ini mencakup cerebral palsy, kelumpuhan anggota gerak, dan kondisi muskuloskeletal.",
    penyebab: [
      "Cerebral palsy akibat cedera otak prenatal/perinatal",
      "Spina bifida atau kelainan tulang belakang bawaan",
      "Distrofi otot (Muscular Dystrophy)",
      "Cedera sumsum tulang belakang",
      "Komplikasi medis pasca infeksi (polio, meningitis)",
    ],
    analisa:
      "Hambatan motorik kasar lebih berdampak pada aksesibilitas fisik sekolah daripada kemampuan belajar itu sendiri. Banyak siswa dengan hambatan ini memiliki kecerdasan rata-rata atau di atas rata-rata. Fokus intervensi seharusnya pada adaptasi lingkungan fisik, bukan penyederhanaan kurikulum.",
    intervensi: [
      "Pastikan sekolah aksesibel (ramp, toilet khusus, jalur kursi roda)",
      "Sediakan kursi roda atau walker sesuai kebutuhan",
      "Modifikasi aktivitas olahraga agar inklusif",
      "Terapi fisik (fisioterapi) secara berkala",
      "Posisi duduk ergonomis untuk mendukung aktivitas belajar",
    ],
  },
  "Kesulitan Gerak dan Koordinasi Jari": {
    label: "Kesulitan Gerak & Koordinasi Jari",
    icon: "✋",
    warna: "#8b5cf6",
    definisi:
      "Gangguan pada motorik halus yang mempengaruhi kemampuan mengontrol gerakan jari dan tangan secara presisi, berdampak pada aktivitas menulis, menggambar, menggunting, dan memanipulasi benda-benda kecil.",
    penyebab: [
      "Dyspraxia (gangguan koordinasi perkembangan)",
      "Kondisi neurologis ringan (cerebral palsy tipe tertentu)",
      "Artritis juvenil atau kelainan sendi",
      "Cedera tangan atau amputasi",
      "Gangguan persepsi sensorik tangan",
    ],
    analisa:
      "Siswa dengan hambatan ini sering frustrasi karena tidak dapat menulis secepat teman-temannya, yang berujung pada rendahnya kepercayaan diri dan motivasi belajar. Penting untuk membedakan antara kesulitan motorik halus dan kemampuan intelektual agar penilaian akademik tidak bias.",
    intervensi: [
      "Sediakan adaptor pensil atau pen grip khusus",
      "Izinkan penggunaan tablet/keyboard sebagai alternatif menulis",
      "Terapi okupasi untuk melatih koordinasi tangan",
      "Berikan waktu ujian tambahan",
      "Latihan motorik halus: meronce, plastisin, puzzle",
    ],
  },
  "Kesulitan Berbicara": {
    label: "Kesulitan Berbicara",
    icon: "🗣️",
    warna: "#ec4899",
    definisi:
      "Hambatan dalam memproduksi suara, kata, atau kalimat yang dapat dipahami orang lain secara verbal. Mencakup gagap (stuttering), disartria, afasia, atau ketidakmampuan berbicara (mutisme).",
    penyebab: [
      "Kelainan anatomi organ bicara (langit-langit sumbing)",
      "Gangguan neurologis yang memengaruhi kontrol otot bicara",
      "Gangguan perkembangan bahasa",
      "Trauma psikologis (mutisme selektif)",
      "Gangguan pendengaran yang tidak tertangani",
    ],
    analisa:
      "Hambatan bicara sering menyebabkan siswa menghindari partisipasi kelas karena takut ditertawakan. Lingkungan kelas yang aman dan suportif adalah kunci keberhasilan intervensi. Terapi wicara yang konsisten terbukti memberikan perbaikan signifikan dalam jangka panjang.",
    intervensi: [
      "Rujukan ke terapis wicara (speech therapist) secara rutin",
      "Ciptakan lingkungan kelas yang menghargai dan tidak mengejek",
      "Izinkan komunikasi alternatif (AAC, papan gambar, aplikasi)",
      "Beri waktu berbicara yang cukup tanpa tekanan",
      "Latihan pernapasan dan artikulasi secara bertahap",
    ],
  },
  "Kesulitan Kemampuan Fungsi Intelektual": {
    label: "Hambatan Intelektual",
    icon: "🧠",
    warna: "#f97316",
    definisi:
      "Keterbatasan signifikan dalam fungsi intelektual (IQ di bawah 70) dan perilaku adaptif sehari-hari, yang muncul sebelum usia 18 tahun. Dikenal juga sebagai tunagrahita atau intellectual disability.",
    penyebab: [
      "Sindrom Down dan kelainan kromosom lainnya",
      "Kekurangan iodin/nutrisi berat saat kehamilan",
      "Cedera otak akibat kekurangan oksigen saat lahir",
      "Infeksi prenatal (sitomegalovirus, rubella)",
      "Paparan toksin (alkohol, timbal) selama janin berkembang",
    ],
    analisa:
      "Siswa dengan hambatan intelektual memiliki gaya dan kecepatan belajar yang berbeda, bukan berarti tidak dapat belajar. Pendekatan kurikulum fungsional dan pembelajaran berbasis pengalaman konkret terbukti lebih efektif daripada pendekatan akademik abstrak.",
    intervensi: [
      "Terapkan kurikulum modifikasi (IEP – Individual Education Plan)",
      "Gunakan metode pembelajaran konkret, visual, dan berulang",
      "Libatkan GPK dalam setiap sesi pembelajaran",
      "Berikan tugas bertahap dari sederhana ke kompleks",
      "Dorong kemandirian melalui keterampilan hidup (life skills)",
    ],
  },
  "Kesulitan Membaca Diseleksia": {
    label: "Disleksia",
    icon: "📖",
    warna: "#06b6d4",
    definisi:
      "Gangguan belajar spesifik berbasis neurologis yang ditandai oleh kesulitan membaca secara akurat dan/atau fasih serta kemampuan mengeja yang buruk, meskipun kecerdasan umum siswa normal atau di atas rata-rata.",
    penyebab: [
      "Perbedaan struktur dan fungsi otak di area pemrosesan bahasa",
      "Faktor genetik dan keturunan (80% kasus bersifat herediter)",
      "Gangguan pemrosesan fonologis (bunyi bahasa)",
      "Keterlambatan perkembangan bahasa di usia dini",
      "Faktor lingkungan: kurangnya stimulasi literasi dini",
    ],
    analisa:
      "Disleksia bukan cerminan kecerdasan. Banyak individu berbakat dunia (Einstein, da Vinci) diduga memiliki disleksia. Di Lombok Barat, siswa disleksia sering terlambat teridentifikasi sehingga dianggap malas atau bodoh. Identifikasi dini dan metode membaca multisensori (Orton-Gillingham) terbukti sangat efektif.",
    intervensi: [
      "Gunakan metode fonik dan multisensori dalam pengajaran membaca",
      "Izinkan audio book dan rekaman pelajaran sebagai alternatif",
      "Berikan font khusus disleksia (OpenDyslexic) pada materi cetak",
      "Perpanjang waktu ujian dan izinkan ujian lisan",
      "Hindari membaca keras di depan kelas tanpa persiapan",
    ],
  },
  "Kesulitan Perilaku Sosialisasi": {
    label: "Hambatan Sosialisasi",
    icon: "🤝",
    warna: "#84cc16",
    definisi:
      "Hambatan dalam memahami norma sosial, membangun hubungan pertemanan, atau berinteraksi dengan lingkungan secara timbal balik. Kondisi ini mencakup Gangguan Spektrum Autisme (ASD) dan gangguan perilaku sosial lainnya.",
    penyebab: [
      "Autism Spectrum Disorder (ASD) dengan dasar neurologis",
      "Gangguan perkembangan pervasif (PDD)",
      "Trauma sosial atau pengabaian di masa kanak-kanak",
      "Faktor genetik dan perbedaan konektivitas otak",
      "Sindrom Asperger (kini bagian dari ASD tingkat tinggi)",
    ],
    analisa:
      "Siswa dengan hambatan sosialisasi tidak 'tidak mau' bergaul, melainkan 'tidak tahu caranya' dalam konteks sosial yang kompleks. Sekolah inklusif yang mengajarkan keterampilan sosial secara eksplisit (social skill training) terbukti meningkatkan adaptasi dan partisipasi mereka di kelas.",
    intervensi: [
      "Terapkan social skill training secara terstruktur",
      "Buat jadwal rutin dan visual yang dapat diprediksi siswa",
      "Minimalisir stimulus berlebih di kelas (cahaya, suara)",
      "Latih teman sebaya sebagai buddy/peer support",
      "Konsultasi dengan psikolog anak secara berkala",
    ],
  },
  "Kesulitan Atensi": {
    label: "Hambatan Atensi (ADHD)",
    icon: "⚡",
    warna: "#eab308",
    definisi:
      "Kesulitan kronis dalam memusatkan perhatian, mengatur impuls, dan/atau mengendalikan aktivitas motorik berlebih. Kondisi ini dikenal sebagai ADHD (Attention Deficit Hyperactivity Disorder) dan bersifat neurologis.",
    penyebab: [
      "Perbedaan fungsi neurotransmiter (dopamin, norepinefrin) di otak",
      "Faktor genetik kuat (herediter ~75%)",
      "Paparan tembakau atau alkohol saat dalam kandungan",
      "Kelahiran prematur atau berat badan lahir rendah",
      "Paparan timbal atau toksin lingkungan pada masa bayi",
    ],
    analisa:
      "ADHD bukan masalah disiplin atau pola asuh yang buruk — ini adalah kondisi neurologis nyata. Siswa ADHD sering berpotensi tinggi namun underperform karena sistem sekolah tradisional kurang ramah terhadap gaya belajar mereka. Strategi pembelajaran aktif dan pengelolaan kelas yang fleksibel sangat membantu.",
    intervensi: [
      "Pecah tugas panjang menjadi segmen-segmen pendek",
      "Izinkan istirahat gerak singkat (movement breaks) setiap 20 menit",
      "Tempatkan siswa di posisi strategis jauh dari distraksi",
      "Gunakan fidget tools atau kursi bergoyang jika diperlukan",
      "Konsultasi medis untuk pertimbangan terapi atau medikasi",
    ],
  },
  "Kesulitan Emosi": {
    label: "Hambatan Emosi",
    icon: "💚",
    warna: "#14b8a6",
    definisi:
      "Gangguan dalam meregulasi, mengekspresikan, atau mengelola emosi yang berdampak signifikan pada fungsi sosial dan akademis. Mencakup kecemasan, depresi anak, gangguan mood, dan ledakan emosi yang sulit dikendalikan.",
    penyebab: [
      "Trauma masa kecil (ACES – Adverse Childhood Experiences)",
      "Gangguan kecemasan umum atau fobia sosial",
      "Lingkungan keluarga tidak stabil atau penuh konflik",
      "Faktor biologis dan ketidakseimbangan hormon/neurokimia",
      "Bullying atau pengalaman dikucilkan di sekolah",
    ],
    analisa:
      "Hambatan emosi sering menjadi akar dari masalah akademis dan perilaku di sekolah. Siswa dengan hambatan ini membutuhkan rasa aman dan keterhubungan terlebih dahulu sebelum dapat belajar efektif. Pendekatan trauma-informed dan relasi guru-siswa yang hangat adalah fondasi utama pemulihan.",
    intervensi: [
      "Terapkan pendekatan trauma-informed care di sekolah",
      "Sediakan akses ke konselor atau psikolog sekolah",
      "Bangun rutinitas kelas yang aman, konsisten, dan dapat diprediksi",
      "Latih regulasi emosi melalui teknik mindfulness sederhana",
      "Libatkan orang tua dalam program dukungan bersama",
    ],
  },
};
