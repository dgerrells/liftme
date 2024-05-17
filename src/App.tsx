import { useEffect, useRef, useState } from "react";
import "./App.css";
import {
  AllowedFilters,
  AllowedStatFields,
  DataRow,
  getChartConfig,
  loadData,
} from "./dataUtils";
import { Bar } from "react-chartjs-2";
import Button from "@mui/material/Button";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";

function App() {
  const [filters, setFilters] = useState<AllowedFilters>();
  const [rawData, setRawData] = useState<DataRow[]>();
  const [selectedFilters, setSelectedFilters] = useState<any>({});
  const [chartConfig, setChartConfig] = useState<any>();
  const [selectedField, setSelectedField] =
    useState<AllowedStatFields>("Best3BenchKg");

  const allowedStatFields: AllowedStatFields[] = [
    "Best3BenchKg",
    "Best3DeadliftKg",
    "Best3SquatKg",
  ];

  const loadAllData = async () => {
    const { filters, rawData } = await loadData();
    setFilters(filters);
    setRawData(rawData);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (!rawData) return;

    const doIt = async () => {
      const chartConfig = await getChartConfig(rawData, {
        field: selectedField,
        filterConfig: selectedFilters,
      });
      setChartConfig(chartConfig);
    };
    doIt();
  }, [rawData, selectedFilters, selectedField]);

  const onFilterChange = async (e: any, key: string) => {
    const newFilters = { ...selectedFilters, [key]: e.target.value };
    setSelectedFilters(newFilters);
  };

  return (
    <>
      <Box
        sx={{
          fontSize: "2rem",
        }}
      >
        POWER LIFT STATS
      </Box>
      <Box
        sx={{
          my: 4,
          justifyContent: "center",
          alignItems: "center",
          display: "flex",
        }}
      >
        {filters && (
          <Card
            sx={{
              maxWidth: "600px",
            }}
          >
            <Typography pt={2} variant="h6" component="div">
              Filters
            </Typography>
            <Box
              sx={{
                p: 2,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <FormControl sx={{ m: 1, width: "160px" }} size="small">
                <InputLabel id={`filter-label-statfield`}>
                  Lift Fields
                </InputLabel>
                <Select
                  autoWidth
                  labelId={`filter-label-statfield`}
                  id={`filter-lift`}
                  label={"Lift Fields"}
                  value={selectedField}
                  onChange={(e) => setSelectedField(e.target.value)}
                >
                  {allowedStatFields.map((v) => (
                    <MenuItem value={v}>{v}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {Object.entries(filters).map(([key, val]) => (
                <FormControl sx={{ m: 1, width: "160px" }} size="small">
                  <InputLabel id={`filter-label-${key}`}>{key}</InputLabel>
                  <Select
                    autoWidth
                    labelId={`filter-label-${key}`}
                    id={`filter-${key}`}
                    label={key}
                    onChange={(e) => onFilterChange(e, key)}
                    name={key}
                    value={selectedFilters[key] || ""}
                  >
                    <MenuItem key={1} value="">
                      <em>None</em>
                    </MenuItem>
                    {[...val].map((v) => (
                      <MenuItem value={v}>{v}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ))}
              {chartConfig && (
                <Box
                  mt={2}
                  sx={{ color: "#0008", width: "100%", display: "flex" }}
                >
                  <Typography mr={2} sx={{}}>
                    Mean: <strong>{chartConfig.mean.toFixed(1)}kg</strong>
                  </Typography>
                  <Typography>
                    Std: <strong>{chartConfig.std.toFixed(1)}kg</strong>
                  </Typography>
                </Box>
              )}
            </Box>
          </Card>
        )}
      </Box>
      {chartConfig && (
        <Bar
          style={{ width: "100vw", maxWidth: "1200px" }}
          data={chartConfig.chartData}
          options={chartConfig.chartOptions}
        />
      )}
    </>
  );
}

export default App;
