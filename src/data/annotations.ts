import { ComponentAnnotation, FaultScenario } from '../types/paSystem';

export const COMPONENT_ANNOTATIONS: Record<string, ComponentAnnotation> = {
  // ==========================================
  // MODUL 1: MIKROFON PENGUMUMAN (PA MICROPHONE)
  // ==========================================
  'mic-windshield': {
    id: 'mic-windshield',
    device: 'microphone',
    nameId: 'Windshield (Peredam Angin)',
    nameEn: 'Acoustic Foam Pop Filter / Windshield',
    layerType: 'external',
    category: 'Proteksi Akustik',
    descId:
      'Busa poliuretan sel terbuka yang meredam energi kinetik hembusan napas dan letupan konsonan plosif (huruf P dan B) sebelum mencapai membran kapsul mikrofon. Melepas komponen ini memicu pop noise berfrekuensi rendah.',
    specs: ['Redaman Plosif: 12–18 dB (<150 Hz)', 'Material: Open-Cell Acoustic Foam', 'Status: Dapat Dilepas-Pasang'],
  },
  'mic-capsule': {
    id: 'mic-capsule',
    device: 'microphone',
    nameId: 'Kapsul Mikrofon (Transduser)',
    nameEn: 'Electret / Dynamic Microphone Capsule',
    layerType: 'internal',
    category: 'Transduser Input',
    descId:
      'Mengubah gelombang tekanan udara (energi akustik) menjadi sinyal tegangan listrik AC beramplitudo sangat kecil (orde milivolt). Getaran membran menginduksi variasi kapasitansi atau medan elektromagnetik.',
    specs: ['Pola Tangkap: Cardioid (Unidirectional)', 'Sensitivitas: -52 dBV/Pa (~2.5 mV)', 'Impedansi: 600 Ω Balanced'],
  },
  'mic-gooseneck': {
    id: 'mic-gooseneck',
    device: 'microphone',
    nameId: 'Gooseneck Fleksibel & Kabel Internal',
    nameEn: 'Flexible Gooseneck & Balanced Triad Wires',
    layerType: 'external',
    category: 'Mekanik Pengarah & Konduktor',
    descId:
      'Tangkai logam berulir fleksibel untuk mengarahkan kapsul tepat ke sumber suara (mengoptimalkan rasio sinyal terhadap jarak). Di dalamnya terdapat konektor berulir serta kabel merah (Hot/+), putih (Cold/-), dan hitam (Ground/Shield).',
    specs: ['Panjang Efektif: 380 mm', 'Konduktor Internal: Merah (+), Putih (-), Hitam (GND)', 'Pengaruh Jarak: Hukum Kuadrat Terbalik'],
  },
  'mic-ptt': {
    id: 'mic-ptt',
    device: 'microphone',
    nameId: 'Tombol Push to Talk (PTT)',
    nameEn: 'Push-to-Talk Latch/Momentary Switch',
    layerType: 'external',
    category: 'Kontrol Jalur Sinyal',
    descId:
      'Saklar mekanik merah yang membuka atau memutus jalur sinyal audio dari kapsul menuju output XLR, sekaligus memicu nada panggil (chime) pengumuman pada speaker monitor lokal.',
    specs: ['Tipe Kontak: DPDT Audio Mute + Chime Trigger', 'Fungsi: Mencegah kebisingan ruang kontrol masuk ke terminal'],
  },
  'mic-monitor-speaker': {
    id: 'mic-monitor-speaker',
    device: 'microphone',
    nameId: 'Speaker Monitor Lokal & Magnet',
    nameEn: 'Local Monitor Speaker & Permanent Magnet',
    layerType: 'internal',
    category: 'Monitor Audio Lokal',
    descId:
      'Driver mini di dalam bodi dudukan yang memutar nada panggil (chime) dan umpan balik audio lokal saat tombol PTT aktif, dilengkapi magnet permanen di bagian belakang konus.',
    specs: ['Diameter: 45 mm', 'Impedansi: 8 Ω', 'Daya Monitor: 1.5 W RMS'],
  },
  'mic-pcb': {
    id: 'mic-pcb',
    device: 'microphone',
    nameId: 'PCB Pengolah Sinyal (SMD)',
    nameEn: 'Signal Conditioning SMD PCB',
    layerType: 'internal',
    category: 'Rangkaian Elektronik',
    descId:
      'Papan sirkuit cetak berisi komponen Surface Mount Device (SMD) untuk penyesuaian impedansi, penyaringan interferensi frekuensi radio (RFI), pembangkit nada chime, dan penyeimbang sinyal balanced.',
    specs: ['Komponen: SMD Resistor, MLCC, Op-Amp Buffer', 'Topologi: Balanced Differential Driver'],
  },
  'mic-base-xlr': {
    id: 'mic-base-xlr',
    device: 'microphone',
    nameId: 'Housing Base & Konektor XLR 3-Pin',
    nameEn: 'Weighted Base & 3-Pin XLR Output Connector',
    layerType: 'external',
    category: 'Struktur & Antarmuka Balanced',
    descId:
      'Dudukan pemberat anti-getar dengan port XLR 3-pin di panel belakang (Pin 1: Ground/Shield, Pin 2: Signal +, Pin 3: Signal -) untuk menyalurkan sinyal bebas derau menuju Pre-Amplifier.',
    specs: ['Pinout XLR: 1-GND, 2-Hot (+), 3-Cold (-)', 'Redaman Noise: Common-Mode Rejection (CMRR)'],
  },

  // ==========================================
  // MODUL 2: PRE-AMPLIFIER (PENGUAT AWAL)
  // ==========================================
  'preamp-power-switch': {
    id: 'preamp-power-switch',
    device: 'preamp',
    nameId: 'Saklar Daya (Rocker I / O)',
    nameEn: 'Main Power Rocker Switch (I / O)',
    layerType: 'external',
    category: 'Kontrol Catu Daya',
    descId:
      'Saklar rocker utama dengan simbol I (ON) dan O (OFF) untuk menghubungkan atau memutus suplai tegangan DC ke rangkaian penguat transistor pada Pre-Amplifier.',
    specs: ['Tegangan Operasi: +12V / +24V DC Regulated', 'Posisi I: Aktif', 'Posisi O: Terputus'],
  },
  'preamp-led': {
    id: 'preamp-led',
    device: 'preamp',
    nameId: 'Indikator Power LED Hijau',
    nameEn: 'Green Power Status LED',
    layerType: 'external',
    category: 'Indikator Status',
    descId:
      'Dioda pemancar cahaya hijau yang menyala secara dinamis hanya ketika saklar daya berada pada posisi I dan catu daya aktif menstabilkan bias transistor.',
    specs: ['Tegangan Maju: 2.1 V', 'Arus Bias LED: 12 mA melalui Resistor Pembatas'],
  },
  'preamp-bnc-in': {
    id: 'preamp-bnc-in',
    device: 'preamp',
    nameId: 'Konektor Input Koaksial (BNC Kiri)',
    nameEn: 'Shielded Coaxial BNC Input Jack',
    layerType: 'external',
    category: 'Antarmuka Input Milivolt',
    descId:
      'Soket logam berpelindung tipe BNC di sisi kiri panel untuk menerima sinyal audio lemah bertegangan milivolt (1–15 mV) dari Mikrofon Pengumuman tanpa interferensi elektromagnetik.',
    specs: ['Level Nominal Input: -50 dBu (~2.5 mV RMS)', 'Pelindung: Coaxial Ground Shield'],
  },
  'preamp-bnc-out': {
    id: 'preamp-bnc-out',
    device: 'preamp',
    nameId: 'Konektor Output Koaksial (BNC Kanan)',
    nameEn: 'Shielded Coaxial BNC Output Jack',
    layerType: 'external',
    category: 'Antarmuka Output Line-Level',
    descId:
      'Soket logam tipe BNC di sisi kanan panel yang menyalurkan sinyal hasil penguatan ke level baris (line-level ~0.775V–1.2V) menuju Power Amplifier / jalur distribusi 70V-100V.',
    specs: ['Level Nominal Output: 0 dBu – +4 dBu (0.775 – 1.23 V)', 'Impedansi Output: 100 Ω'],
  },
  'preamp-gain-knob': {
    id: 'preamp-gain-knob',
    device: 'preamp',
    nameId: 'Kenop Pengatur Gain & Potensiometer',
    nameEn: 'Gain Rotary Knob & Mechanical Potentiometer',
    layerType: 'external',
    category: 'Kalibrasi Penguatan',
    descId:
      'Kenop putar kontinu dari skala MIN hingga MAX yang terhubung secara mekanis ke poros potensiometer di atas PCB. Gain berlebih menyebabkan distorsi kliping (gelombang terpotong datar); terlalu rendah membuat sinyal tenggelam dalam noise.',
    specs: ['Rentang Penguatan: +10 dB hingga +56 dB', 'Zona Optimal: 45% – 65% (~1.0 V Line-Level)'],
  },
  'preamp-pcb-transistor': {
    id: 'preamp-pcb-transistor',
    device: 'preamp',
    nameId: 'Transistor NPN (Penguat Utama)',
    nameEn: 'Discrete NPN Bipolar Junction Transistor',
    layerType: 'internal',
    category: 'Komponen Aktif PCB',
    descId:
      'Komponen semikonduktor aktif (konfigurasi Common-Emitter) yang menguatkan arus dan tegangan sinyal milivolt dari basis (B) menjadi sinyal berdaya lebih besar pada kolektor (C).',
    specs: ['Tipe: Low-Noise Audio NPN (hFE ~250)', 'Terminal: Emitter (E), Base (B), Collector (C)'],
  },
  'preamp-pcb-passive': {
    id: 'preamp-pcb-passive',
    device: 'preamp',
    nameId: 'Resistor Gelang Warna & Kapasitor Elco/Keramik',
    nameEn: 'Color-Coded Bias Resistors & Coupling Capacitors',
    layerType: 'internal',
    category: 'Biasing & Coupling Filter',
    descId:
      'Resistor berkode warna menetapkan titik kerja bias DC dan faktor penguatan stabil. Kapasitor elektrolit (Elco) memblokir tegangan DC agar sinyal AC audio mengalir bersih antar-tahap, sementara kapasitor keramik meredam osilasi frekuensi tinggi.',
    specs: ['Resistor: Pembagi Tegangan Basis & Kolektor', 'Kapasitor Elco: 10 µF – 47 µF DC Blocking', 'Keramik: 100 pF HF Bypass'],
  },

  // ==========================================
  // MODUL 3: CEILING SPEAKER (PENGERAS SUARA PLAFON)
  // ==========================================
  'spk-grille': {
    id: 'spk-grille',
    device: 'speaker',
    nameId: 'Grille Penutup Depan',
    nameEn: 'Perforated Acoustic Metal Grille',
    layerType: 'external',
    category: 'Proteksi & Dispersi',
    descId:
      'Jaring baja berlubang heksagonal di bagian depan speaker yang melindungi konus dari debu dan benturan fisik sambil menjaga transparansi akustik suara ke ruangan.',
    specs: ['Rasio Bukaan Akustik: >68%', 'Material: Powder-Coated Perforated Steel'],
  },
  'spk-clamp': {
    id: 'spk-clamp',
    device: 'speaker',
    nameId: 'Frame & Dog-Ear Mounting Clamp',
    nameEn: 'ABS Baffle Frame & Screw-Driven Dog-Ear Clamp',
    layerType: 'external',
    category: 'Mekanisme Instalasi Plafon',
    descId:
      'Rangka dudukan dengan tiga klip penjepit (dog-ear clamp). Memutar sekrup pengunci membuat klip berputar keluar 90° dan turun menjepit papan plafon secara otomatis dan kokoh.',
    specs: ['Ketebalan Plafon Didukung: 5–28 mm', 'Jumlah Penjepit: 3 Titik Simetris 120°'],
  },
  'spk-cone': {
    id: 'spk-cone',
    device: 'speaker',
    nameId: 'Cone / Diaphragm (Konus Speaker)',
    nameEn: 'Acoustic Cone & Suspension Surround',
    layerType: 'internal',
    category: 'Membran Radiasi Suara',
    descId:
      'Membran berbentuk kerucut ringan yang bergetar maju-mundur mengikuti gaya Lorentz pada voice coil, mendorong molekul udara untuk membentuk gelombang tekanan akustik (suara) ke seluruh ruangan.',
    specs: ['Diameter Konus: 6.5 Inci (165 mm)', 'Sensitivitas: 92 dB (1W / 1m)', 'Dispersi: 120° Conical'],
  },
  'spk-voice-coil': {
    id: 'spk-voice-coil',
    device: 'speaker',
    nameId: 'Voice Coil & Magnet Permanen',
    nameEn: 'Copper Voice Coil & Permanent Ferrite Magnet',
    layerType: 'internal',
    category: 'Motor Elektromagnetik',
    descId:
      'Arus bolak-balik sinyal audio mengalir melalui kumparan tembaga (Voice Coil) di celah udara Magnet Permanen. Interaksi kedua medan magnet menghasilkan gaya gerak maju-mundur secara presisi.',
    specs: ['Kawat Kumparan: Tembaga Berenamel (Enameled Cu)', 'Fluks Magnet: ~1.1 Tesla pada Celah Udara'],
  },
  'spk-crossover': {
    id: 'spk-crossover',
    device: 'speaker',
    nameId: 'Jaringan Filter Crossover (1-Way / 2-Way)',
    nameEn: 'Passive Crossover Filter Network (RLC)',
    layerType: 'internal',
    category: 'Pemilah Spektrum Frekuensi',
    descId:
      'Opsi konfigurasi jalur filter: mode 1-Way (Full Range) menyalurkan seluruh spektrum langsung ke driver tunggal, sedangkan mode 2-Way menggunakan induktor, kapasitor, dan resistor pasif untuk memisahkan frekuensi vokal dan treble.',
    specs: ['1-Way: Direct Full-Range 120 Hz – 14 kHz', '2-Way: 12 dB/oct Passive Filter (L + C + R)'],
  },
  'spk-backcan': {
    id: 'spk-backcan',
    device: 'speaker',
    nameId: 'Back Can / Housing Pelindung Belakang',
    nameEn: 'Fire-Rated Acoustic Back Can Enclosure',
    layerType: 'external',
    category: 'Ruang Akustik & Proteksi Api',
    descId:
      'Tabung baja tertutup di bagian belakang speaker yang mencegah kebocoran suara ke rongga atas plafon, menjaga kepatuhan tahan api, serta meredam resonansi berlebih pada frekuensi rendah.',
    specs: ['Volume Internal: 4.2 Liter Sealed', 'Redaman Resonansi: -6 dB pada puncak 220 Hz'],
  },
  'spk-terminal': {
    id: 'spk-terminal',
    device: 'speaker',
    nameId: 'Terminal Input (+/-) & Kabel Internal',
    nameEn: '70V/100V Input Terminal Block (+/-) & Internal Leads',
    layerType: 'external',
    category: 'Terminasi Jalur Amplifier',
    descId:
      'Blok terminal sambungan jalur 70V/100V atau output amplifier dengan penanda polaritas positif (merah) dan negatif (hitam). Polaritas terbalik atau kabel lepas menyebabkan penurunan fasa atau speaker mati.',
    specs: ['Jalur Distribusi: 70V / 100V Line atau 8 Ω', 'Polaritas: Merah (+), Hitam (-)'],
  },

  // ==========================================
  // SENSOR VIRTUAL 3D (PRD v1.4 TELEMETRY)
  // ==========================================
  'sensor-spl-probe': {
    id: 'sensor-spl-probe',
    device: 'sensors',
    nameId: 'Sensor Suara (Modul LM393 & Virtual SPL Probe dBA/dBC)',
    nameEn: 'LM393 Electret Sound Sensor & SPL Calibration Probe',
    layerType: 'external',
    category: 'Sensor Akustik Ruangan',
    descId:
      'Modul sensor suara kondensor electret dengan komparator LM393, potensiometer pengatur sensitivitas (biru), LED indikator daya/trigger, dan pin OUT/GND/VCC. Mengukur tekanan suara (dBA/dBC), ambient noise, SNR, dan ambang kliping.',
    specs: ['Modul: LM393 Electret Condenser', 'Rentang Ukur: 30 – 120 dBA / dBC', 'Deteksi: SNR, Kliping, & Ambang Feedback'],
  },
  'sensor-thermal-preamp': {
    id: 'sensor-thermal-preamp',
    device: 'sensors',
    nameId: 'Sensor Suhu PCB / Transistor Pre-Amp (DHT11)',
    nameEn: 'DHT11 & NTC Thermal Probe (Pre-Amplifier Stage)',
    layerType: 'internal',
    category: 'Sensor Termal Komponen',
    descId:
      'Modul sensor suhu DHT11 (casing grid biru, LED indikator, pin VCC/DATA/GND) dan termistor NTC pada Transistor NPN (Q1) untuk memantau panas akibat arus bias, kliping berkepanjangan, atau beban hubung singkat. Memicu thermal throttling di atas 72 °C.',
    specs: ['Modul: DHT11 Breakout + NTC Q1', 'Suhu Nominal: 30 – 55 °C', 'Ambang Peringatan: > 72 °C (Thermal Throttling)'],
  },
  'sensor-thermal-speaker': {
    id: 'sensor-thermal-speaker',
    device: 'sensors',
    nameId: 'Sensor Suhu Voice Coil & Back Can (DHT11)',
    nameEn: 'DHT11 & Voice Coil Thermal Sensor',
    layerType: 'internal',
    category: 'Sensor Termal Transduser',
    descId:
      'Modul sensor suhu DHT11 pada Back Can serta probe termal pada kumparan Voice Coil untuk mendeteksi pemanasan akibat daya tinggi, kliping DC, atau ventilasi ruang plafon tertutup. Di atas 95 °C berisiko merusak lapisan enamel.',
    specs: ['Modul: DHT11 Breakout + Voice Coil', 'Suhu Nominal: 28 – 68 °C', 'Ambang Kritis: > 95 °C (Ventilasi Plafon)'],
  },
  'sensor-current-preamp': {
    id: 'sensor-current-preamp',
    device: 'sensors',
    nameId: 'Sensor Arus Jalur Daya Pre-Amp (ACS712)',
    nameEn: 'ACS712 Hall-Effect DC Current Sensor Module',
    layerType: 'internal',
    category: 'Sensor Arus Seri',
    descId:
      'Modul sensor arus efek Hall seri ACS712 (terminal blok 2-pin hijau, IC ACS712T, filter C1/C2, dan pin VCC/OUT/GND) pada jalur catu daya Pre-Amplifier untuk memantau arus bias diam dan arus sinyal aktif (mA).',
    specs: ['Modul: ACS712T ELC-20A Breakout', 'Arus Diam (Idle): ~42 mA', 'Arus Aktif: 45 – 140 mA (0 mA saat OFF)'],
  },
  'sensor-current-speaker': {
    id: 'sensor-current-speaker',
    device: 'sensors',
    nameId: 'Sensor Arus Jalur Speaker (ACS712 / 8 Ω & 70V-100V)',
    nameEn: 'ACS712 Speaker Load Line Current Sensor',
    layerType: 'external',
    category: 'Sensor Arus Beban',
    descId:
      'Modul sensor arus ACS712 seri pada terminal keluaran menuju Ceiling Speaker. Mampu membedakan gain terlalu kecil (< 30 mA), jalur kabel terputus (0 mA), dengan korsleting impedansi rendah (lonjakan > 1500 mA).',
    specs: ['Modul: ACS712T + Clamp Terminal', 'Beban Normal: 80 – 650 mA', 'Beban Putus: 0 mA | Korsleting: > 1500 mA'],
  },
};

export const FAULT_SCENARIOS: FaultScenario[] = [
  {
    id: 'fault-hum',
    titleId: 'Kasus 1: Suara Berdengung (50Hz Ground Hum)',
    symptomId: 'Ketika PTT ditekan, terdengar dengungan frekuensi rendah (50 Hz) yang mengganggu pengumuman.',
    hintId: 'Periksa kekencangan kabel antara Output Mikrofon dan Input BNC Pre-Amplifier pada panel Pengkabelan.',
    targetExplanationId:
      'Kabel koaksial/XLR yang longgar menyebabkan hilangnya referensi Ground/Shield sehingga medan listrik AC 50 Hz menginduksi dengungan ke jalur input milivolt yang sangat sensitif.',
    initialOverrides: {
      mode: 'troubleshooting',
      focusTarget: 'system',
      preampPowerOn: true,
      pttActive: true,
      preampGain: 55,
      windshieldAttached: true,
      cableMicToPreamp: 'loose',
      cablePreampToSpeaker: 'connected',
      speakerPolarityReversed: false,
      ceilingMountProgress: 1,
      distributionMode: '70v-100v',
      plenumVentilationPoor: false,
      ambientNoiseDb: 45,
      showSensorProbes: true,
      audioPlaying: true,
    },
    isResolved: (state, metrics) =>
      state.cableMicToPreamp === 'connected' &&
      state.cablePreampToSpeaker === 'connected' &&
      !metrics.isHumPresent &&
      metrics.isSignalActive &&
      !metrics.isClipping,
  },
  {
    id: 'fault-clipping',
    titleId: 'Kasus 2: Suara Pecah & Distorsi Kliping',
    symptomId: 'Pengumuman terdengar sangat keras namun pecah/terpotong pada gelombang output osiloskop.',
    hintId: 'Amati grafik Output pada Osiloskop, lalu turunkan kenop Gain Pre-Amplifier ke zona kalibrasi optimal (40%–68%).',
    targetExplanationId:
      'Gain Pre-Amplifier yang disetel mendekati MAX membuat tegangan output melebihi batas headroom suplai transistor, sehingga puncak gelombang terpotong datar (clipping distortion).',
    initialOverrides: {
      mode: 'troubleshooting',
      focusTarget: 'preamp',
      preampPowerOn: true,
      pttActive: true,
      preampGain: 94,
      windshieldAttached: true,
      cableMicToPreamp: 'connected',
      cablePreampToSpeaker: 'connected',
      speakerPolarityReversed: false,
      ceilingMountProgress: 1,
      distributionMode: '8ohm',
      plenumVentilationPoor: false,
      ambientNoiseDb: 45,
      showSensorProbes: true,
      audioPlaying: true,
      showOscilloscope: true,
    },
    isResolved: (state, metrics) =>
      state.preampPowerOn &&
      state.pttActive &&
      !metrics.isClipping &&
      !metrics.isLowSnr &&
      metrics.isSignalActive &&
      state.preampGain >= 38 &&
      state.preampGain <= 70,
  },
  {
    id: 'fault-silent',
    titleId: 'Kasus 3: Speaker Mati Total (Cek Sensor Arus 0 mA)',
    symptomId: 'PTT sudah aktif, namun speaker mati. Gunakan Sensor Arus untuk membedakan gain kecil vs jalur terputus.',
    hintId: 'Amati pembacaan arus Pre-Amp dan Speaker: nyalakan Saklar Daya (I), sambungkan kabel speaker, dan normalkan polaritas (+/-).',
    targetExplanationId:
      'Sensor arus menunjukkan 0 mA pada jalur daya saat Saklar O (OFF) dan 0 mA pada terminal speaker saat kabel putus—berbeda dari kasus gain rendah yang tetap mengalirkan arus bias.',
    initialOverrides: {
      mode: 'troubleshooting',
      focusTarget: 'system',
      preampPowerOn: false,
      pttActive: true,
      preampGain: 55,
      windshieldAttached: true,
      cableMicToPreamp: 'connected',
      cablePreampToSpeaker: 'disconnected',
      speakerPolarityReversed: true,
      ceilingMountProgress: 1,
      distributionMode: '70v-100v',
      plenumVentilationPoor: false,
      ambientNoiseDb: 45,
      showSensorProbes: true,
      showOscilloscope: true,
      audioPlaying: true,
    },
    isResolved: (state, metrics) =>
      state.preampPowerOn &&
      state.cablePreampToSpeaker === 'connected' &&
      !state.speakerPolarityReversed &&
      metrics.current_speaker_ma > 30 &&
      metrics.isSignalActive &&
      !metrics.isClipping,
  },
  {
    id: 'fault-pop',
    titleId: 'Kasus 4: Letupan Angin (Pop Noise) & SNR Rendah',
    symptomId: 'Suara pengumuman tenggelam dalam kebisingan ruang tunggu dan mengalami letupan berat pada huruf P/B.',
    hintId: 'Pasang Windshield pada kapsul, dekatkan jarak Gooseneck (< 45 cm), dan sesuaikan Gain agar SNR di atas 20 dB.',
    targetExplanationId:
      'Tanpa Windshield, hembusan plosif menabrak membran secara langsung. Jarak gooseneck yang terlalu jauh menurunkan sinyal input sehingga kalah dari ambient noise ruangan pada probe SPL.',
    initialOverrides: {
      mode: 'troubleshooting',
      focusTarget: 'microphone',
      preampPowerOn: true,
      pttActive: true,
      preampGain: 55,
      windshieldAttached: false,
      gooseneckDistance: 0.9,
      gooseneckAngle: 30,
      cableMicToPreamp: 'connected',
      cablePreampToSpeaker: 'connected',
      speakerPolarityReversed: false,
      ceilingMountProgress: 1,
      distributionMode: '70v-100v',
      plenumVentilationPoor: false,
      ambientNoiseDb: 62,
      showSensorProbes: true,
      audioPlaying: true,
      audioSourceMode: 'plosive-test',
    },
    isResolved: (state, metrics) =>
      state.windshieldAttached &&
      state.gooseneckDistance <= 0.45 &&
      !metrics.isPopNoiseActive &&
      metrics.snrDb >= 20 &&
      metrics.isSignalActive,
  },
  {
    id: 'fault-thermal-overcurrent',
    titleId: 'Kasus 5: Overheat & Arus Beban Berlebih (Overload)',
    symptomId: 'Sensor Suhu menunjukkan hotspot tinggi pada Transistor & Voice Coil disertai lonjakan arus (> 1500 mA).',
    hintId: 'Buka tab Sensor & Beban: ganti jalur beban dari Korsleting ke 70V/100V Line (atau 8 Ω), buka Ventilasi Plafon, dan turunkan Gain ke zona aman.',
    targetExplanationId:
      'Impedansi beban yang terlalu rendah/korsleting menarik arus sangat besar (Hukum Ohm I = V/Z), memanaskan transistor Pre-Amp dan kumparan Voice Coil hingga memicu thermal throttling.',
    initialOverrides: {
      mode: 'troubleshooting',
      focusTarget: 'speaker',
      preampPowerOn: true,
      pttActive: true,
      preampGain: 88,
      windshieldAttached: true,
      cableMicToPreamp: 'connected',
      cablePreampToSpeaker: 'connected',
      speakerPolarityReversed: false,
      ceilingMountProgress: 1,
      distributionMode: 'short-fault',
      plenumVentilationPoor: true,
      ambientNoiseDb: 48,
      showSensorProbes: true,
      showOscilloscope: true,
      cutAwayActive: true,
      audioPlaying: true,
    },
    isResolved: (state, metrics) =>
      state.distributionMode !== 'short-fault' &&
      !state.plenumVentilationPoor &&
      state.preampGain <= 70 &&
      !metrics.isOvercurrent &&
      !metrics.isClipping &&
      metrics.isSignalActive,
  },
];
