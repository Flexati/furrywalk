import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import { Platform } from "react-native";
import { Storage, type WalkRecord, type DogProfile } from "@/lib/services/storage";

export interface ExportOptions {
  format: "csv" | "pdf";
  maxWalks?: number; // Default: last 50 walks
}

/**
 * Format a date number (timestamp) to a readable format
 */
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("it-IT", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format duration in seconds to human readable format
 */
function formatDuration(sec: number): string {
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Generate CSV content from walks, dog profile, and owner info
 */
function generateCSVContent(
  dogProfile: DogProfile | null,
  walks: WalkRecord[],
): string {
  const headers = [
    "Data",
    "Durata",
    "Distanza (km)",
    "Calorie (kcal)",
    "Percorso",
    "Note",
    "Valutazione",
  ];

  const ownerInfo = dogProfile
    ? `Cane: ${dogProfile.name}\nRazza: ${dogProfile.breed || "Non specificata"}\nEtà: ${dogProfile.age || "Non specificata"}\n\n`
    : "";

  const csvRows = walks.map((walk) => {
    const pathSummary = walk.path?.length
      ? `${walk.path.length} punti GPS`
      : "N/D";

    // Escape commas and quotes in notes field
    const escapedNotes = walk.notes
      ? `"${walk.notes.replace(/"/g, '""')}"`
      : '""';

    return [
      formatDate(walk.startedAt),
      formatDuration(walk.durationSec),
      walk.distanceKm.toFixed(2),
      walk.caloriesKcal.toString(),
      pathSummary,
      escapedNotes,
      `${walk.rating}/5`,
    ].join(",");
  });

  return `${ownerInfo}${headers.join(",")}\n${csvRows.join("\n")}`;
}

/**
 * Generate HTML for PDF export with proper styling
 */
function generatePDFContent(
  dogProfile: DogProfile | null,
  walks: WalkRecord[],
): string {
  const totalDistance = walks.reduce((sum, w) => sum + w.distanceKm, 0);
  const totalTime = walks.reduce((sum, w) => sum + w.durationSec, 0);
  const totalCalories = walks.reduce((sum, w) => sum + w.caloriesKcal, 0);

  const dogInfoHtml = dogProfile
    ? `
      <div class="dog-info">
        <h2>${dogProfile.name}</h2>
        <p><strong>Razza:</strong> ${dogProfile.breed || "Non specificata"}</p>
        <p><strong>Età:</strong> ${dogProfile.age || "Non specificata"}</p>
        <p><strong>Energia:</strong> ${dogProfile.energy || "Non specificata"}</p>
      </div>
    `
    : '<p><em>Nessun profilo cane registrato</em></p>';

  const walksTableRows = walks
    .map(
      (walk) => `
      <tr>
        <td>${formatDate(walk.startedAt)}</td>
        <td>${formatDuration(walk.durationSec)}</td>
        <td>${walk.distanceKm.toFixed(2)} km</td>
        <td>${walk.caloriesKcal} kcal</td>
        <td>${walk.path?.length || 0} punti</td>
        <td>${walk.rating || 0}/5</td>
      </tr>
    `,
    )
    .join("");

  const totalsRow = `
    <tr style="border-top: 2px solid #2D5A3D; font-weight: bold;">
      <td colspan="2">TOTALE (${walks.length} passeggiate)</td>
      <td>${totalDistance.toFixed(2)} km</td>
      <td>${totalCalories} kcal</td>
      <td colspan="2">${formatDuration(totalTime)}</td>
    </tr>
  `;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            padding: 20px;
            color: #333;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #2D5A3D;
            padding-bottom: 15px;
            margin-bottom: 25px;
          }
          .header h1 {
            color: #2D5A3D;
            margin: 0;
            font-size: 24px;
          }
          .header p {
            margin: 5px 0 0 0;
            color: #666;
            font-size: 14px;
          }
          .dog-info {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .dog-info h2 {
            margin: 0 0 10px 0;
            color: #2D5A3D;
            font-size: 18px;
          }
          .dog-info p {
            margin: 5px 0;
            font-size: 14px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 12px;
          }
          th {
            background: #2D5A3D;
            color: white;
            padding: 10px;
            text-align: left;
            font-weight: 600;
          }
          td {
            padding: 8px;
            border-bottom: 1px solid #ddd;
          }
          tr:nth-child(even) {
            background: #f9f9f9;
          }
          tr:hover {
            background: #f0f0f0;
          }
          .totals {
            margin-top: 20px;
            padding: 15px;
            background: #e8f5e9;
            border-radius: 8px;
          }
          .totals p {
            margin: 5px 0;
            font-size: 14px;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            color: #999;
            font-size: 11px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🐾 Passeggiata Furba</h1>
          <p>Report Passeggiate per Veterinario</p>
          <p style="font-size: 12px;">Generato il: ${new Date().toLocaleString("it-IT")}</p>
        </div>

        ${dogInfoHtml}

        <h3 style="color: #2D5A3D; margin-bottom: 10px;">Ultime ${walks.length} Passeggiate</h3>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Durata</th>
              <th>Distanza</th>
              <th>Calorie</th>
              <th>Percorso</th>
              <th>Valutazione</th>
            </tr>
          </thead>
          <tbody>
            ${walksTableRows}
            ${totalsRow}
          </tbody>
        </table>

        <div class="totals">
          <p><strong>Riepilogo Attività:</strong></p>
          <p>Passeggiate totali: <strong>${walks.length}</strong></p>
          <p>Distanza totale: <strong>${totalDistance.toFixed(2)} km</strong></p>
          <p>Tempo totale: <strong>${formatDuration(totalTime)}</strong></p>
          <p>Calorie totali bruciate: <strong>${totalCalories} kcal</strong></p>
        </div>

        <div class="footer">
          <p>Report generato da Passeggiata Furba</p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Export walk history as CSV file
 */
export async function exportToCSV(options?: ExportOptions): Promise<void> {
  const dogProfile = await Storage.getDogProfile();
  const allWalks = await Storage.getWalks();
  const walksToExport = allWalks.slice(0, options?.maxWalks ?? 50);

  const csvContent = generateCSVContent(dogProfile, walksToExport);
  const fileName = `passeggiate_${dogProfile?.name?.toLowerCase().replace(/\s+/g, "_") || "cane"}_${new Date().getTime()}.csv`;

  const fileUri = `${FileSystem.documentDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  await Sharing.shareAsync(fileUri, {
    mimeType: "text/csv",
    dialogTitle: "Esporta CSV per Veterinario",
    UTI: "public.comma-separated-values-text",
  });
}

/**
 * Export walk history as PDF file
 */
export async function exportToPDF(options?: ExportOptions): Promise<void> {
  const dogProfile = await Storage.getDogProfile();
  const allWalks = await Storage.getWalks();
  const walksToExport = allWalks.slice(0, options?.maxWalks ?? 50);

  const htmlContent = generatePDFContent(dogProfile, walksToExport);

  // Generate PDF using expo-print
  const { uri } = await Print.printToFileAsync({
    html: htmlContent,
    base64: false,
  });

  // Share the generated PDF
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle: "Esporta PDF per Veterinario",
    UTI: "com.adobe.pdf",
  });
}

/**
 * Main export function - routes to CSV or PDF based on format
 */
export async function exportWalkHistory(options: ExportOptions): Promise<void> {
  try {
    if (options.format === "csv") {
      await exportToCSV(options);
    } else if (options.format === "pdf") {
      await exportToPDF(options);
    }
  } catch (error) {
    console.error("[export] Export failed:", error);
    throw new Error(
      "Esportazione fallita. Riprova o contatta il supporto se il problema persiste.",
    );
  }
}
