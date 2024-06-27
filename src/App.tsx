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

import {
  Box,
  Card,
  CardContent,
  CardHeader,
  FormControl,
  CircularProgress,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<AllowedFilters>();
  const [selectedFilters, setSelectedFilters] = useState<any>({});
  const [chartConfig, setChartConfig] = useState<any>();
  const [selectedField, setSelectedField] =
    useState<AllowedStatFields>("Bench");

  const allowedStatFields: AllowedStatFields[] = ["Bench", "Squat", "Deadlift"];

  const loadAllData = async () => {
    try {
      setIsLoading(true);
      const { filters } = await loadData();
      setFilters(filters);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const doIt = async () => {
      const chartConfig = await getChartConfig({
        field: selectedField,
        filterConfig: selectedFilters,
      });
      setChartConfig(chartConfig);
    };
    doIt();
  }, [selectedFilters, selectedField, isLoading]);

  const onFilterChange = async (e: any, key: string) => {
    const newFilters = { ...selectedFilters, [key]: e.target.value };
    setSelectedFilters(newFilters);
  };

  const isChartDataEmpty = !chartConfig || chartConfig?.std === 0;

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
        {isLoading && (
          <Box sx={{ display: "flex" }}>
            <CircularProgress />
          </Box>
        )}
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
                p: [1, 2],
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <FormControl
                sx={{ m: [0.5, 1], width: ["150px", "160px"] }}
                size="small"
              >
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
                  {allowedStatFields.sort().map((v) => (
                    <MenuItem value={v}>{v}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {Object.entries(filters).map(([key, val]) => (
                <FormControl
                  sx={{ m: [0.5, 1], width: ["150px", "160px"] }}
                  size="small"
                >
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
                    {key === "WeightClassKg" &&
                      [...val]
                        .sort((a: any, b: any) => a - b)
                        .map((v) => (
                          <MenuItem value={v}>
                            {`${v}` === "145" ? "140+" : v}
                          </MenuItem>
                        ))}
                    {key !== "WeightClassKg" &&
                      [...val]
                        .sort()
                        .map((v) => <MenuItem value={v}>{v}</MenuItem>)}
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
      {isChartDataEmpty && !isLoading && (
        <>
          <Typography>No data</Typography>
        </>
      )}
      {!isChartDataEmpty && (
        <Bar
          style={{
            width: "100vw",
            maxWidth: "1200px",
            marginLeft: "-1rem",
            marginRight: "-1rem",
          }}
          data={chartConfig.chartData}
          options={chartConfig.chartOptions}
        />
      )}
    </>
  );
}

export default App;
