import React, { useState, useRef, useEffect } from "react";

// --- KONFIGURASI TEMA ---
const THEMES = {
  beach: {
    id: "beach",
    name: "🌊 Pantai",
    bg: "bg-blue-50",
    border: "border-cyan-500",
    text: "text-cyan-800",
    accent: "bg-cyan-600",
    // Lokasi file yang baru saja Anda siapkan
    frameImage: "/frames/beach-bg.png",
    charImage: "/characters/beach-char.png",
    frameColor: "#E0F7FA", // Fallback color
  },
  coffee: {
    id: "coffee",
    name: "☕ Kafe Senja",
    bg: "bg-orange-50",
    border: "border-amber-700",
    text: "text-amber-900",
    accent: "bg-amber-800",
    // Pastikan file ini ada jika ingin tema kopi jalan, atau kosongkan dulu
    frameImage: "/frames/cafe-bg.png",
    charImage: "/characters/cafe-char.png",
    frameColor: "#EFEBE9",
  },
};

const FILTERS = [
  { id: "none", name: "Normal", css: "grayscale(0)" },
  { id: "bw", name: "BnW", css: "grayscale(1)" },
  { id: "sepia", name: "Sepia", css: "sepia(1)" },
  { id: "warm", name: "Warm", css: "sepia(0.4) contrast(1.1)" },
];

export default function App() {
  const [step, setStep] = useState("landing");
  const [userName, setUserName] = useState("");
  const [theme, setTheme] = useState(THEMES.beach);

  const [photos, setPhotos] = useState([null, null, null, null]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const [countdown, setCountdown] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState(FILTERS[0]);

  const videoRef = useRef(null);
  const finalCanvasRef = useRef(null);

  // --- KAMERA ---
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: "user",
        },
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("Gagal akses kamera. Pastikan izin diberikan!");
    }
  };

  useEffect(() => {
    if (step === "camera") startCamera();
  }, [step]);

  // --- SEQUENCE FOTO ---
  const startCaptureSequence = (indexOverride = null) => {
    const targetIndex = indexOverride !== null ? indexOverride : 0;
    if (indexOverride === null) {
      setPhotos([null, null, null, null]);
      setCurrentPhotoIndex(0);
    } else {
      setCurrentPhotoIndex(targetIndex);
    }
    setStep("camera");
    runCountdown(targetIndex, indexOverride !== null);
  };

  const runCountdown = (index, isSingleMode) => {
    let timer = 3;
    setCountdown(timer);

    const interval = setInterval(() => {
      timer -= 1;
      setCountdown(timer);
      if (timer === 0) {
        clearInterval(interval);
        capturePhoto(index);
        setCountdown(null);

        if (!isSingleMode && index < 3) {
          setTimeout(() => {
            setCurrentPhotoIndex(index + 1);
            runCountdown(index + 1, false);
          }, 1000);
        } else {
          setTimeout(() => setStep("review"), 500);
        }
      }
    }, 1000);
  };

  const capturePhoto = (index) => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");

    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imgData = canvas.toDataURL("image/jpeg", 0.9);

    setPhotos((prev) => {
      const newPhotos = [...prev];
      newPhotos[index] = imgData;
      return newPhotos;
    });
  };

  // --- LOGIKA GENERATE GAMBAR AKHIR ---
  const handleDownload = () => {
    const canvas = finalCanvasRef.current;
    const ctx = canvas.getContext("2d");

    const width = 600;
    const height = 1800;
    canvas.width = width;
    canvas.height = height;

    // 1. Load Background Frame
    const framePromise = new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => {
        console.warn("Frame tidak ditemukan, pakai warna solid");
        resolve(null);
      };
      img.src = theme.frameImage;
    });

    // 2. Load Character Overlay
    const charPromise = new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null); // Jika tidak ada karakter, lanjut saja
      img.src = theme.charImage;
    });

    // 3. Load 4 Foto User
    const photoPromises = photos.map((src) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.src = src;
      });
    });

    Promise.all([framePromise, charPromise, ...photoPromises]).then(
      ([frameImg, charImg, ...userPhotos]) => {
        // A. Layer Dasar (Background)
        if (frameImg) {
          ctx.drawImage(frameImg, 0, 0, width, height);
        } else {
          ctx.fillStyle = theme.frameColor || "#fff";
          ctx.fillRect(0, 0, width, height);
        }

        // B. Header Text
        ctx.fillStyle = "#1a1a1a";
        ctx.font = "bold 40px Courier New";
        ctx.textAlign = "center";
        // Shadow tipis biar teks kebaca di background apapun
        ctx.shadowColor = "white";
        ctx.shadowBlur = 5;
        ctx.fillText("BILDSCHÖN", width / 2, 80);
        ctx.shadowBlur = 0; // Reset shadow

        ctx.font = "24px Courier New";
        ctx.fillText(
          theme.name.replace(/[^a-zA-Z ]/g, "").trim(),
          width / 2,
          120
        );

        // C. Foto User (Looping)
        userPhotos.forEach((img, i) => {
          ctx.filter = selectedFilter.css;
          const yPos = 160 + i * 380;

          // Border Putih Foto
          ctx.fillStyle = "white";
          ctx.fillRect(40, yPos, 520, 360);

          // Gambar Foto
          ctx.drawImage(img, 50, yPos + 10, 500, 340);

          ctx.filter = "none";
        });

        // D. Character Overlay (Menumpuk Foto ke-4)
        if (charImg) {
          // Ukuran karakter
          const charW = 220;
          const charH = 220; // Sesuaikan aspek rasio jika perlu

          // Posisi: Pojok Kanan Bawah area foto
          // X = Lebar kanvas - Lebar Karakter - Margin Kanan
          const charX = width - charW - 20;
          // Y = Posisi agar menutupi sebagian foto terakhir
          const charY = 1480;

          // Efek bayangan drop shadow pada karakter agar terlihat 'pop up'
          ctx.shadowColor = "rgba(0,0,0,0.3)";
          ctx.shadowBlur = 10;
          ctx.drawImage(charImg, charX, charY, charW, charH);
          ctx.shadowBlur = 0;
        }

        // E. Footer Text (Nama & Tanggal)
        ctx.fillStyle = "#333";
        ctx.font = "bold 30px Courier New";
        ctx.fillText(
          userName.toUpperCase().substring(0, 15),
          width / 2,
          height - 80
        );

        ctx.font = "20px Courier New";
        const date = new Date().toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        ctx.fillText(date, width / 2, height - 40);

        // F. Download
        const link = document.createElement("a");
        const themeSuffix = theme.id === "beach" ? "PANTAI" : "KAFE";
        link.download = `${userName
          .replace(/\s+/g, "_")
          .toUpperCase()}_BILDSCHÖN_${themeSuffix}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      }
    );
  };

  // ================= UI =================

  // 1. Landing
  if (step === "landing") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-900 text-white p-4 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-widest font-mono">
          BILDSCHÖN
        </h1>
        <p className="text-gray-400 mb-8 text-sm md:text-base max-w-md">
          Frame the fleeting moment.
        </p>
        <button
          onClick={() => setStep("name")}
          className="bg-white text-black rounded-full w-16 h-16 md:w-20 md:h-20 flex items-center justify-center hover:scale-110 transition duration-300 shadow-[0_0_20px_rgba(255,255,255,0.4)]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 24 24"
            className="w-8 h-8 md:w-10 md:h-10 ml-1"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      </div>
    );
  }

  // 2. Input Nama
  if (step === "name") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl text-center">
          <h2 className="text-xl md:text-2xl font-bold mb-6 text-gray-800">
            Siapa namamu?
          </h2>
          <input
            type="text"
            placeholder="Tulis nama panggilan..."
            className="w-full border-b-2 border-gray-300 focus:border-black outline-none text-center text-lg md:text-xl p-2 mb-8 bg-transparent"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            maxLength={15}
          />
          <button
            disabled={!userName}
            onClick={() => setStep("theme")}
            className="w-full bg-black text-white py-3 md:py-4 rounded-xl font-bold disabled:opacity-50 hover:bg-gray-800 transition shadow-lg"
          >
            LANJUT
          </button>
        </div>
      </div>
    );
  }

  // 3. Pilih Tema
  if (step === "theme") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-8">
        <h2 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800">
          Pilih Suasana
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl mb-8">
          {Object.values(THEMES).map((t) => (
            <div
              key={t.id}
              onClick={() => {
                setTheme(t);
              }}
              className={`cursor-pointer border-4 ${
                theme.id === t.id
                  ? "border-black transform scale-[1.02]"
                  : "border-transparent"
              } hover:scale-[1.02] transition-all duration-300 rounded-2xl overflow-hidden shadow-lg relative h-48 md:h-64`}
            >
              {/* Preview Background menggunakan gambar frame */}
              <div
                className="absolute inset-0 bg-cover bg-center opacity-60 transition-opacity group-hover:opacity-80"
                style={{ backgroundImage: `url(${t.frameImage})` }}
              ></div>
              <div
                className={`absolute inset-0 ${t.bg} mix-blend-multiply opacity-30`}
              ></div>

              <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-4 bg-black/20">
                <span className="text-4xl md:text-5xl mb-2">
                  {t.id === "beach" ? "🏖️" : "☕"}
                </span>
                <h3 className="text-xl md:text-2xl font-bold text-white drop-shadow-lg">
                  {t.name}
                </h3>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => startCaptureSequence(null)}
          className="w-full max-w-xs py-4 bg-black text-white rounded-full text-lg font-bold hover:shadow-xl transition flex items-center justify-center gap-2"
        >
          <span>📸</span> MULAI FOTO
        </button>
      </div>
    );
  }

  // 4. Kamera
  if (step === "camera") {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center p-4 ${theme.bg}`}
      >
        <div
          className={`relative w-full max-w-5xl aspect-video border-4 md:border-8 ${theme.border} rounded-xl overflow-hidden shadow-2xl bg-black`}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
          {countdown && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-20">
              <span className="text-8xl md:text-9xl font-bold text-white animate-ping">
                {countdown}
              </span>
            </div>
          )}
          <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm md:text-base font-mono z-10 backdrop-blur-md">
            {currentPhotoIndex + 1} / 4
          </div>
        </div>
        <p
          className={`mt-6 text-lg md:text-xl font-bold ${theme.text} animate-pulse text-center`}
        >
          {countdown ? "Tahan posisi..." : "Bersiap..."}
        </p>
      </div>
    );
  }

  // 5. Review
  if (step === "review") {
    return (
      <div
        className={`min-h-screen py-8 px-4 flex flex-col items-center ${theme.bg}`}
      >
        <h2
          className={`text-2xl md:text-3xl font-bold mb-6 ${theme.text} text-center`}
        >
          Cek Hasil Foto
        </h2>
        <div className="grid grid-cols-2 gap-3 md:gap-6 max-w-3xl w-full mb-8">
          {photos.map((img, idx) => (
            <div
              key={idx}
              className="relative group rounded-lg overflow-hidden shadow-md aspect-video bg-gray-200"
            >
              {img && (
                <img
                  src={img}
                  className="w-full h-full object-cover scale-x-[-1]"
                  alt={`hasil ${idx}`}
                />
              )}
              <div
                className="absolute inset-0 bg-black/40 md:bg-black/60 flex items-center justify-center 
                              opacity-100 md:opacity-0 md:group-hover:opacity-100 transition duration-300"
              >
                <button
                  onClick={() => startCaptureSequence(idx)}
                  className="bg-white/90 text-black px-3 py-1 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-bold hover:bg-white shadow-lg flex items-center gap-1"
                >
                  🔄 <span className="hidden md:inline">Retake</span>
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col md:flex-row gap-3 w-full max-w-md md:max-w-2xl">
          <button
            onClick={() => startCaptureSequence(null)}
            className="flex-1 py-3 border-2 border-red-500 text-red-600 font-bold rounded-xl hover:bg-red-50 transition"
          >
            Ulang Semua
          </button>
          <button
            onClick={() => setStep("editing")}
            className={`flex-1 py-3 ${theme.accent} text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition`}
          >
            LANJUT EDITING
          </button>
        </div>
      </div>
    );
  }

  // 6. Editing & Download
  if (step === "editing") {
    return (
      <div
        className={`min-h-screen py-8 px-4 flex flex-col items-center ${theme.bg}`}
      >
        <h2 className={`text-2xl md:text-3xl font-bold mb-2 ${theme.text}`}>
          Sentuhan Terakhir
        </h2>
        <p className="mb-6 text-sm text-gray-600 text-center">
          Geser filter di bawah ini
        </p>

        {/* Preview Strip */}
        <div className="w-full flex justify-center mb-6 overflow-hidden">
          <div className="bg-white p-1 md:p-2 shadow-2xl rounded-sm transform scale-90 md:scale-100 origin-top">
            <div
              className="flex flex-col gap-2 p-3 w-[260px] md:w-[300px] bg-cover bg-center relative"
              style={{ backgroundImage: `url(${theme.frameImage})` }}
            >
              <div className="text-center font-mono text-sm font-bold pt-2 text-white/70">
                BILDSCHÖN
              </div>

              {photos.map((img, i) => (
                <div
                  key={i}
                  className="rounded-sm bg-white p-1 shadow-sm relative z-10"
                >
                  <img
                    src={img}
                    className="w-full rounded-sm h-40 md:h-48 object-cover scale-x-[-1]"
                    style={{ filter: selectedFilter.css }}
                    alt="preview"
                  />
                </div>
              ))}

              {/* Preview Karakter Overlay */}
              {theme.charImage && (
                <img
                  src={theme.charImage}
                  alt="char overlay"
                  className="absolute bottom-1 left-1 h-40 object-contain z-20 drop-shadow-lg"
                />
              )}
            </div>
          </div>
        </div>

        <div className="w-full max-w-lg mb-8 mt-6">
          <div className="flex gap-3 overflow-x-auto pb-4 px-2 no-scrollbar justify-start md:justify-center">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFilter(f)}
                className={`flex-shrink-0 mt-2 px-5 py-2 rounded-full font-bold text-sm transition shadow-sm ${
                  selectedFilter.id === f.id
                    ? "bg-black text-white ring-2 ring-offset-2 ring-black"
                    : "bg-white text-gray-700 border"
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col-reverse md:flex-row gap-4 w-full max-w-md items-center">
          <button
            onClick={() => setStep("review")}
            className="text-gray-500 font-bold text-sm underline py-2"
          >
            Kembali
          </button>
          <button
            onClick={handleDownload}
            className={`w-full py-4 ${theme.accent} text-white font-bold rounded-full text-lg shadow-xl hover:scale-105 active:scale-95 transition flex items-center justify-center gap-2`}
          >
            <span>⬇️</span> Simpan Foto
          </button>
        </div>

        <canvas ref={finalCanvasRef} className="hidden"></canvas>
      </div>
    );
  }

  return null;
}
