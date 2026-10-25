import { describe, expect, it } from "vitest";
import { parseMfpCsv } from "@/lib/mfp/parse";

const sample = `Nutrition Summary
Date,Meal,Calories,Fat (g),Carbohydrates (g),Protein (g)
2026-10-24,Breakfast,620,18,70,42
2026-10-24,"Lunch, big",840,24,90,55
2026-10-24,Dinner,910,22,95,60
2026-10-24,Snacks,280,12,30,18
10/25/2026,Breakfast,540,14,62,38
"October 23, 2026",Dinner,"1,100",30,120,70
`;

describe("parseMfpCsv", () => {
  it("sums meals per date and accepts MFP date formats", () => {
    const parsed = parseMfpCsv(sample);
    expect(parsed.error).toBeUndefined();
    expect(parsed.days).toEqual([
      { date: "2026-10-23", kcal: 1100, proteinG: 70, carbsG: 120, fatG: 30, meals: 1 },
      { date: "2026-10-24", kcal: 2650, proteinG: 175, carbsG: 285, fatG: 76, meals: 4 },
      { date: "2026-10-25", kcal: 540, proteinG: 38, carbsG: 62, fatG: 14, meals: 1 },
    ]);
  });

  it("rejects a file that is not a nutrition summary", () => {
    const parsed = parseMfpCsv("name,value\nweight,80\n");
    expect(parsed.days).toHaveLength(0);
    expect(parsed.error).toMatch(/Nutrition Summary/i);
  });
});
