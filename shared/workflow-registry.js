(function (global) {
  "use strict";

  const registry = {
    "pdf-merger": {
      label: "PDFs zusammenfuegen",
      shortLabel: "Zusammenfuegen",
      accepts: ["application/pdf"],
      outputs: ["application/pdf"],
      mode: "multi",
      keywords: [
        "zusammen", "zusammenfuegen", "zusammenfugen", "merge", "mergen", "kombinieren",
        "eine pdf", "alles in eine datei", "anlagenpaket", "paket", "beilegen"
      ],
      problem: "Mehrere PDFs werden eine saubere Datei.",
      nextTools: ["pdf-compress", "pdf-sign", "pdf-redact", "pdf-watermark"],
      priority: 92
    },
    "pdf-splitter": {
      label: "PDF teilen",
      shortLabel: "Teilen",
      accepts: ["application/pdf"],
      outputs: ["application/pdf"],
      mode: "single",
      keywords: [
        "teilen", "splitten", "seiten", "einzelseiten", "trennen", "rausziehen",
        "seite heraus", "nur seite", "einzelne seiten"
      ],
      problem: "Eine PDF wird in einzelne Seiten oder Bereiche getrennt.",
      nextTools: ["pdf-merger", "pdf-compress", "pdf-sign"],
      priority: 78
    },
    "pdf-compress": {
      label: "PDF kleiner machen",
      shortLabel: "Kleiner machen",
      accepts: ["application/pdf"],
      outputs: ["application/pdf"],
      mode: "single-or-multi",
      keywords: [
        "kleiner", "komprimieren", "komprimier", "mail", "email", "e-mail", "whatsapp",
        "zu gross", "zu groß", "groesse", "größe", "mb", "runter", "runter machen",
        "runtermachen", "runter rechnen", "runterrechnen", "datei kleiner", "speicher sparen"
      ],
      problem: "PDF wird mailtauglich kleiner.",
      nextTools: ["pdf-sign", "pdf-redact", "pdf-watermark"],
      priority: 88
    },
    "pdf-redact": {
      label: "PDF schwaerzen",
      shortLabel: "Schwaerzen",
      accepts: ["application/pdf"],
      outputs: ["application/pdf"],
      mode: "single",
      keywords: [
        "schwaerzen", "schwarzen", "schwärzen", "zensieren", "anonym", "anonymisieren",
        "daten weg", "verbergen", "unkenntlich", "adresse weg", "iban weg", "namen weg",
        "sensible daten", "datenschutz"
      ],
      problem: "Sensible Stellen dauerhaft unkenntlich machen.",
      nextTools: ["pdf-compress", "pdf-sign", "pdf-watermark"],
      priority: 86
    },
    "pdf-watermark": {
      label: "Wasserzeichen setzen",
      shortLabel: "Wasserzeichen",
      accepts: ["application/pdf"],
      outputs: ["application/pdf"],
      mode: "single-or-multi",
      keywords: [
        "wasserzeichen", "vertraulich", "draft", "entwurf", "logo drauf", "stempel",
        "markieren", "kennzeichnen", "kopie"
      ],
      problem: "Jede Seite bekommt sichtbare Kennzeichnung.",
      nextTools: ["pdf-compress", "pdf-sign"],
      priority: 74
    },
    "pdf-sign": {
      label: "PDF signieren",
      shortLabel: "Signieren",
      accepts: ["application/pdf"],
      outputs: ["application/pdf"],
      mode: "single",
      keywords: [
        "signieren", "unterschrift", "unterschreiben", "signatur", "unterschrieben",
        "datum setzen", "gegenzeichnen", "vertrag unterschreiben"
      ],
      problem: "Unterschrift auf PDF platzieren.",
      nextTools: ["pdf-compress", "pdf-redact", "pdf-watermark", "pdf-ocr"],
      priority: 82
    },
    "pdf-ocr": {
      label: "PDF auslesen",
      shortLabel: "Auslesen",
      accepts: ["application/pdf"],
      outputs: ["application/pdf", "text/plain"],
      mode: "single",
      keywords: [
        "ocr", "durchsuchbar", "text erkennen", "text auslesen", "auslesen",
        "rauslesen", "herauslesen", "inhalt auslesen", "daten auslesen", "scan lesen",
        "scan auslesen", "kopieren", "suchbar", "woerter", "wörter", "text raus",
        "aus pdf lesen", "pdf lesen", "brief auslesen", "rechnung auslesen"
      ],
      problem: "Scans und PDFs werden lesbar, suchbar und kopierbar.",
      nextTools: ["pdf-to-word", "pdf-redact", "exif-rename", "pdf-compress"],
      priority: 91
    },
    "pdf-to-word": {
      label: "PDF zu Word",
      shortLabel: "Zu Word",
      accepts: ["application/pdf"],
      outputs: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
      mode: "single",
      keywords: [
        "word", "bearbeiten", "docx", "text raus", "in word", "als word",
        "weiterbearbeiten", "editierbar"
      ],
      problem: "PDF-Inhalt in bearbeitbares Word holen.",
      nextTools: ["docx-zu-pdf"],
      priority: 70
    },
    "heic-zu-jpg": {
      label: "iPhone-Foto zu JPG",
      shortLabel: "HEIC zu JPG",
      accepts: ["image/*"],
      outputs: ["image/jpeg"],
      mode: "single-or-multi",
      keywords: [
        "iphone", "heic", "heif", "jpg", "jpeg", "foto umwandeln", "bild umwandeln",
        "nicht oeffnen", "nicht öffnen"
      ],
      problem: "iPhone-Bilder lesbar weitergeben.",
      nextTools: ["images-compress", "images-to-pdf", "exif-strip"],
      priority: 84
    },
    "images-compress": {
      label: "Bilder kleiner machen",
      shortLabel: "Bilder kleiner",
      accepts: ["image/*"],
      outputs: ["image/jpeg", "image/webp", "image/png"],
      mode: "single-or-multi",
      keywords: [
        "bilder kleiner", "bild kleiner", "foto kleiner", "fotos kleiner", "komprimieren",
        "mail", "whatsapp", "bild groesse", "bildgröße", "runter", "kleiner machen"
      ],
      problem: "Viele Bilder werden leichter versendbar.",
      nextTools: ["images-to-pdf", "exif-strip"],
      priority: 82
    },
    "images-to-pdf": {
      label: "Bilder zu PDF",
      shortLabel: "Bilder zu PDF",
      accepts: ["image/jpeg", "image/png", "image/webp"],
      outputs: ["application/pdf"],
      mode: "single-or-multi",
      keywords: [
        "bilder zu pdf", "bild zu pdf", "scan pdf", "fotos pdf", "belege pdf",
        "als pdf", "beleg", "scanner", "einscannen"
      ],
      problem: "Fotos oder Scans werden eine PDF.",
      nextTools: ["pdf-compress", "pdf-ocr", "pdf-redact"],
      priority: 72
    },
    "exif-strip": {
      label: "Foto-Daten entfernen",
      shortLabel: "Metadaten weg",
      accepts: ["image/*"],
      outputs: ["image/jpeg", "image/png", "image/webp"],
      mode: "single-or-multi",
      keywords: [
        "metadaten", "standort", "exif", "gps", "daten entfernen", "ort entfernen",
        "privat", "kamera daten", "fotodaten"
      ],
      problem: "Standort und Kameradaten vor Upload entfernen.",
      nextTools: ["images-compress", "images-to-pdf"],
      priority: 76
    },
    "exif-rename": {
      label: "Dateien umbenennen",
      shortLabel: "Umbenennen",
      accepts: ["*/*"],
      outputs: ["*/*"],
      mode: "single-or-multi",
      keywords: [
        "umbenennen", "nummerieren", "durchnummerieren", "sortieren", "dateinamen",
        "bulk rename", "saubere namen", "nach datum", "rechnung umbenennen"
      ],
      problem: "Viele Dateien bekommen saubere Namen.",
      nextTools: [],
      priority: 68
    },
    "docx-zu-pdf": {
      label: "Word zu PDF",
      shortLabel: "Word zu PDF",
      accepts: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
      outputs: ["application/pdf"],
      mode: "single",
      keywords: [
        "word zu pdf", "docx zu pdf", "dokument pdf", "als pdf speichern", "word umwandeln"
      ],
      problem: "Word-Dokument wird PDF.",
      nextTools: ["pdf-compress", "pdf-sign", "pdf-redact"],
      priority: 66
    },
    "csv-edit": {
      label: "Tabelle bearbeiten",
      shortLabel: "Tabelle",
      accepts: ["text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
      outputs: ["text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
      mode: "single-or-multi",
      keywords: [
        "csv", "excel", "xlsx", "tabelle", "liste", "sortieren", "filtern",
        "listen abgleichen", "vergleichen", "doppelte", "fehlende", "spalten"
      ],
      problem: "Tabellen schnell pruefen, sortieren und bereinigen.",
      nextTools: [],
      priority: 64
    },
    "video-compress": {
      label: "Video kleiner machen",
      shortLabel: "Video kleiner",
      accepts: ["video/*"],
      outputs: ["video/mp4"],
      mode: "single",
      keywords: [
        "video kleiner", "video komprimieren", "mp4 kleiner", "whatsapp video",
        "video runter", "video runterrechnen", "datei zu gross"
      ],
      problem: "Video wird versendbar kleiner.",
      nextTools: ["video-zu-gif"],
      priority: 72
    },
    "video-zu-gif": {
      label: "Video zu GIF",
      shortLabel: "GIF",
      accepts: ["video/*"],
      outputs: ["image/gif"],
      mode: "single",
      keywords: [
        "gif", "video zu gif", "bewegtes bild", "animation", "kurzer clip"
      ],
      problem: "Kurzer Clip wird GIF.",
      nextTools: [],
      priority: 58
    },
    "bg-remove": {
      label: "Hintergrund entfernen",
      shortLabel: "Freistellen",
      accepts: ["image/*"],
      outputs: ["image/png"],
      mode: "single",
      keywords: [
        "hintergrund", "freistellen", "background", "objekt freistellen",
        "person freistellen", "motiv freistellen"
      ],
      problem: "Motiv freistellen und weiterverwenden.",
      nextTools: ["images-compress", "images-to-pdf"],
      priority: 62
    },
    "qr-code": {
      label: "QR-Code erstellen",
      shortLabel: "QR-Code",
      accepts: [],
      outputs: ["image/png", "image/svg+xml"],
      mode: "no-file",
      keywords: ["qr", "qr code", "link als qr", "wifi qr", "wlan qr", "vcard"],
      problem: "Aus Link, Kontakt oder WLAN wird ein QR-Code.",
      nextTools: [],
      priority: 52
    }
  };

  global.CLAWBUIS_WORKFLOW_REGISTRY = registry;
})(window);

