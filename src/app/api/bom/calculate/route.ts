import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, handleApiError } from "@/lib/permissions";
import { calculateBatchBOM } from "@/lib/bom";
import { formatKg, formatMetres } from "@/lib/decimal";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bomCalculateSchema = z.object({
  widthMm: z.number().positive(),
  filmGsm: z.number().positive(),
  dryAdhesiveGsm: z.number().positive(),
  adhesiveSolidsPercent: z.number().gt(0).lte(100),
  rollLengthM: z.number().positive(),
  rolls: z.number().int().positive().default(1),
});

export async function POST(req: NextRequest) {
  try {
    await authenticateUser();
    const body = await req.json();
    const data = bomCalculateSchema.parse(body);

    const result = calculateBatchBOM(
      {
        widthMm: data.widthMm,
        filmGsm: data.filmGsm,
        dryAdhesiveGsm: data.dryAdhesiveGsm,
        adhesiveSolidsPercent: data.adhesiveSolidsPercent,
        rollLengthM: data.rollLengthM,
      },
      data.rolls
    );

    return NextResponse.json({
      success: true,
      rolls: data.rolls,
      summary: {
        areaTotalM2: formatMetres(result.areaTotalM2),
        filmTotalKg: formatKg(result.filmTotalKg),
        dryAdhesiveTotalKg: formatKg(result.dryAdhesiveTotalKg),
        liquidAdhesiveTotalKg: formatKg(result.liquidAdhesiveTotalKg),
        netTapeTotalKg: formatKg(result.netTapeTotalKg),
        coresTotal: result.coresTotal,
        lengthTotalM: formatMetres(result.lengthTotalM),
      },
      perRoll: {
        areaPerRollM2: formatMetres(result.perRoll.areaPerRollM2),
        filmKgPerRoll: formatKg(result.perRoll.filmKgPerRoll),
        dryAdhesiveKgPerRoll: formatKg(result.perRoll.dryAdhesiveKgPerRoll),
        liquidAdhesiveKgPerRoll: formatKg(result.perRoll.liquidAdhesiveKgPerRoll),
        netTapeKgPerRoll: formatKg(result.perRoll.netTapeKgPerRoll),
        coresPerRoll: result.perRoll.coresPerRoll,
        rollLengthM: formatMetres(result.perRoll.rollLengthM),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
