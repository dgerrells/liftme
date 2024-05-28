import Papa from "papaparse";
import { parquetMetadata, parquetRead  } from 'hyparquet'
import dataUrl from "./assets/lift-data.gz?url";
import dataUrlParquet from "./assets/lift-data.parquet?url";
import * as math from "mathjs";

export type DataRow = {
  Name: string;
  Sex: string;
  Event: string;
  Equipment: string;
  Age: number;
  AgeClass: string;
  BirthYearClass: string;
  Division: string;
  BodyweightKg: number;
  WeightClassKg: number;
  Squat1Kg: number;
  Squat2Kg: number;
  Squat3Kg: number;
  Squat4Kg: number;
  Best3SquatKg: number;
  Bench1Kg: number;
  Bench2Kg: number;
  Bench3Kg: number;
  Bench4Kg: number;
  Best3BenchKg: number;
  Deadlift1Kg: number;
  Deadlift2Kg: number;
  Deadlift3Kg: number;
  Deadlift4Kg: number;
  Best3DeadliftKg: number;
  TotalKg: number;
  Place: number;
  Dots: string;
  Wilks: number;
  Glossbrenner: string;
  Goodlift: number;
  Tested: string;
  Country: string;
  State: string;
  Federation: string;
  ParentFederation: string;
  Date: string;
  MeetCountry: string;
  MeetState: string;
  MeetTown: string;
  MeetName: string;
  Sanctioned: string;
};

export type AllowedFilters = {
  Sex: Set<string>;
  Equipment: Set<string>;
  BirthYearClass: Set<string>;
  // AgeClass: Set<string>;
  WeightClassKg: Set<string>;
  // State: Set<string>;
  Sanctioned: Set<string>;
};

export type AllowedStatFields = "Bench" | "Deadlift" | "Squat";

const filters: AllowedFilters = {
  Sex: new Set(),
  Equipment: new Set(),
  BirthYearClass: new Set(),
  // AgeClass: new Set(),
  WeightClassKg: new Set(),
  Sanctioned: new Set(),
};
const filterKeys = Object.keys(filters);

type CalcStdOptions = {
  filterConfig?: { [K in keyof AllowedFilters]: string | null | undefined };
  field: AllowedStatFields;
};

const fieldMap = {
  Bench: "Best3BenchKg",
  Squat: "Best3SquatKg",
  Deadlift: "Best3DeadliftKg",
};

let cachedLifts: { [key: string]: DataRow[] } = {
  Bench: [],
  Squat: [],
  Deadlift: [],
};

async function DecompressBlob(blob) {
  const ds = new DecompressionStream("gzip");
  const decompressedStream = blob.stream().pipeThrough(ds);
  return await new Response(decompressedStream).blob();
}

export const loadData = async () => {
  // const blob = await fetch(dataUrl).then((res) => res.blob());
  // const blobDecompress = await DecompressBlob(blob);
  // const text = await blobDecompress.text();

  // const papaResult = Papa.parse(text, {
  //   header: true,
  //   dynamicTyping: true,
  // });

  // const rawData = papaResult.data as DataRow[];
  const rawData: DataRow[] = [];
  const res = await fetch(dataUrlParquet);
  const arrayBuffer = await res.arrayBuffer();
  const metadata = parquetMetadata(arrayBuffer);

  await parquetRead({
    file: arrayBuffer,
    onComplete: data => {
      data.forEach(rawRow => {
        const row = {};
        metadata.schema.forEach((schema, i) => {
          if (!schema.type) return;
          row[schema.name] = rawRow[i-1];
        });
        rawData.push(row as DataRow);
      });
    }
  });

  rawData.map((row) => {
    // find all possible filter values
    filterKeys.map((key) => {
      // @ts-ignore
      if (row[key]) filters[key].add(row[key]);
    });
  });

  cachedLifts.Bench = rawData.filter(
    (row) => row[fieldMap["Bench"]] > 0 && row["MaxLift"] === "Bench"
  );
  cachedLifts.Squat = rawData.filter(
    (row) => row[fieldMap["Squat"]] > 0 && row["MaxLift"] === "Squat"
  );
  cachedLifts.Deadlift = rawData.filter(
    (row) => row[fieldMap["Deadlift"]] > 0 && row["MaxLift"] === "Deadlift"
  );

  return {
    filters,
    rawData,
  };
};

export const calcStdData = async (options: CalcStdOptions) => {
  // get all rows who match the filter
  const values = cachedLifts[options.field]
    .filter((row) => {
      for (const [key, value] of Object.entries(options.filterConfig || {})) {
        // @ts-ignore
        if (value && row[key] !== value) return false;
      }
      return true;
    })
    .map((row) => row[fieldMap[options.field]]);

  if (values.length === 0) {
    return {
      buckets: [],
      std: 0,
      variance: 0,
      mean: 0,
    };
  }

  const std = math.std(values) as any as number;
  const variance = math.variance(values) as any as number;
  const mean = math.mean(values);
  const buckets = bucketSort(values);

  return {
    buckets,
    std,
    variance,
    mean,
  };
};

export const getChartConfig = async (options: CalcStdOptions) => {
  const { buckets: data, std, mean } = await calcStdData(options);
  const chartData = {
    labels: data.map((bucket, i) => `${bucket.bucketSize * i}`),
    datasets: [
      {
        label: options.field,
        data: data.map((bucket) => bucket.count),
        backgroundColor: "rgba(54, 162, 235, 0.2)", // Bar color
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 1,
      },
    ],
  };

  const stdDevs = [-2, -1, 1, 2];
  const chartOptions = {
    scales: {
      y: {
        title: {
          text: "count people",
          display: true,
        },
      },
      x: {
        title: {
          text: "weight in kg",
          display: true,
        },
      },
    },
    plugins: {
      annotation: {
        annotations: [
          ...stdDevs.map((dev) => ({
            type: "line",
            // this shit is super ugly and complicated due to how labels work in chartjs
            // we have to manually find the scale based on the number of labels
            // and not the actual data. bucketsize is the same across all buckets
            xMin: (mean + std * dev) / data[0]?.bucketSize,
            xMax: (mean + std * dev) / data[0]?.bucketSize,
            borderColor: "rgba(255, 99, 132, 0.8)",
            borderWidth: 2,
            borderDash: [5, 2],
            label: {
              display: true,
              content: `${dev}α`,
              position: "end",
            },
          })),
          {
            type: "line",
            // this shit is super ugly and complicated due to how labels work in chartjs
            // we have to manually find the scale based on the number of labels
            // and not the actual data. bucketsize is the same across all buckets
            xMin: mean / data[0]?.bucketSize,
            xMax: mean / data[0]?.bucketSize,
            borderColor: "rgba(255, 250, 132, 0.8)",
            borderWidth: 2,
            borderDash: [5, 2],
            label: {
              display: true,
              content: `mean: ${mean.toFixed(0)}kg`,
              position: "middle",
            },
          },
        ],
      },
    },
  };

  return {
    chartData,
    chartOptions,
    std,
    mean,
  };
};

function bucketSort(numbers: number[], bucketCount: number = 32) {
  numbers.sort((a, b) => a - b);

  const minValue = 0;
  const maxValue = 520;
  const range = maxValue - minValue;
  const bucketSize = Math.floor(range / bucketCount);
  const buckets: number[][] = new Array(bucketCount).fill(null).map(() => []);

  numbers.forEach((num) => {
    const bucketIndex = Math.floor((num - minValue) / bucketSize);
    const bucket = buckets[bucketIndex];
    if (bucket) buckets[bucketIndex].push(num);
  });

  const results: Array<{
    min: number;
    max: number;
    count: number;
    mean: number;
    bucketSize: number;
  }> = [];
  buckets.forEach((bucket) => {
    const sorted = bucket.sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const mean = sorted.length > 0 ? math.mean(sorted) : 0;
    results.push({
      min,
      max,
      mean,
      count: sorted.length,
      bucketSize,
    });
  });

  return results;
}
