import { splitCsvLine } from "@/lib/csv/split";
import { roundTo } from "@/lib/format";

export type MfpDay = {
  date: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  meals: number;
};

const MONTHS: Record<string, string> = {
  january: "01",
  jan: "01",
  february: "02",
  feb: "02",
  march: "03",
  mar: "03",
  april: "04",
  apr: "04",
  may: "05",
  june: "06",
  jun: "06",
  july: "07",
  jul: "07",
  august: "08",
  aug: "08",
  september: "09",
  sep: "09",
  sept: "09",
  october: "10",
  oct: "10",
  november: "11",
  nov: "11",
  december: "12",
  dec: "12",
};

export function normalizeCalendarDate(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(value);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (slash) return `${slash[3]}-${slash[1].padStart(2, "0")}-${slash[2].padStart(2, "0")}`;
  const named = /^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/.exec(value);
  if (named) {
    const month = MONTHS[named[1].toLowerCase()];
    if (!month) return null;
    return `${named[3]}-${month}-${named[2].padStart(2, "0")}`;
  }
  return null;
}

function parseNumber(raw: string | undefined): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[",]/g, "").trim();
  if (!cleaned) return 0;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : 0;
}

export function parseMfpCsv(text: string): { days: MfpDay[]; error?: string } {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  const headerIndex = lines.findIndex((line) => {
    const columns = splitCsvLine(line).map((cell) => cell.trim().toLowerCase());
    return columns.includes("date") && columns.some((cell) => cell.startsWith("calor"));
  });
  if (headerIndex < 0) {
    return {
      days: [],
      error: "Could not find a Nutrition Summary header. Expected Date, Meal, Calories, Fat (g), Carbohydrates (g), and Protein (g).",
    };
  }

  const header = splitCsvLine(lines[headerIndex]).map((cell) => cell.trim().toLowerCase());
  const find = (predicate: (column: string) => boolean) => header.findIndex(predicate);
  const dateIndex = find((column) => column === "date");
  const calorieIndex = find((column) => column === "calories" || column.startsWith("calorie"));
  const fatIndex = find((column) => column.startsWith("fat"));
  const carbIndex = find((column) => column.startsWith("carb"));
  const proteinIndex = find((column) => column.startsWith("protein"));
  if (dateIndex < 0 || calorieIndex < 0) {
    return { days: [], error: "CSV is missing Date or Calories columns." };
  }

  const byDate = new Map<string, MfpDay>();
  for (const line of lines.slice(headerIndex + 1)) {
    const columns = splitCsvLine(line);
    if (columns.every((cell) => cell.trim() === "")) continue;
    const date = normalizeCalendarDate(columns[dateIndex] ?? "");
    if (!date) continue;
    const current = byDate.get(date) ?? { date, kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, meals: 0 };
    current.kcal += parseNumber(columns[calorieIndex]);
    current.fatG += fatIndex >= 0 ? parseNumber(columns[fatIndex]) : 0;
    current.carbsG += carbIndex >= 0 ? parseNumber(columns[carbIndex]) : 0;
    current.proteinG += proteinIndex >= 0 ? parseNumber(columns[proteinIndex]) : 0;
    current.meals += 1;
    byDate.set(date, current);
  }

  const days = [...byDate.values()]
    .map((day) => ({
      ...day,
      kcal: roundTo(day.kcal, 1),
      proteinG: roundTo(day.proteinG, 1),
      carbsG: roundTo(day.carbsG, 1),
      fatG: roundTo(day.fatG, 1),
    }))
    .sort((left, right) => left.date.localeCompare(right.date));

  if (days.length === 0) {
    return { days: [], error: "No nutrition rows found in that CSV." };
  }
  return { days };
}
