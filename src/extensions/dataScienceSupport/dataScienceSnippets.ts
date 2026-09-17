import { SnippetDefinition } from '../extensionTypes'

// 1. R Snippets
export const R_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'r-shiny-app',
    detail: 'R: Shiny Reactive Web Dashboard (bslib glass UI)',
    documentation: 'R Shiny application with modern bslib UI and reactive server calculations',
    insertText: 'library(shiny)\nlibrary(bslib)\nlibrary(ggplot2)\nlibrary(dplyr)\n\nui <- page_sidebar(\n  theme = bs_theme(version = 5, bootswatch = "darkly"),\n  title = "✨ IndoctrinatedEdit R Analytics",\n  sidebar = sidebar(\n    sliderInput("n_points", "Sample Size:", min = 50, max = 1000, value = 250),\n    selectInput("color_palette", "Color Theme:", choices = c("viridis", "plasma", "magma"))\n  ),\n  card(\n    card_header("Throughput & Specular Velocity Distribution"),\n    plotOutput("main_plot")\n  )\n)\n\nserver <- function(input, output, session) {\n  data_reactive <- reactive({\n    tibble(\n      x = rnorm(input$n_points),\n      y = rnorm(input$n_points) + 2\n    )\n  })\n\n  output$main_plot <- renderPlot({\n    ggplot(data_reactive(), aes(x = x, y = y)) +\n      geom_point(alpha = 0.7, size = 3, color = "#0A84FF") +\n      geom_density_2d(color = "#30D158") +\n      theme_minimal() +\n      labs(title = "Liquid Glass R Simulation", x = "Metric Alpha", y = "Metric Beta")\n  })\n}\n\nshinyApp(ui, server)\n$0',
  },
  {
    label: 'r-tidyverse-pipeline',
    detail: 'R: Tidyverse Data Transformation Pipeline (dplyr / tidyr)',
    documentation: 'Idiomatic dplyr data manipulation using pipe operator |>',
    insertText: 'library(dplyr)\nlibrary(tidyr)\nlibrary(readr)\n\nprocess_dataset <- function(file_path) {\n  read_csv(file_path, show_col_types = FALSE) |>\n    filter(!is.na(metric_value)) |>\n    group_by(category) |>\n    summarise(\n      mean_score = mean(metric_value),\n      median_score = median(metric_value),\n      total_count = n(),\n      .groups = "drop"\n    ) |>\n    arrange(desc(mean_score))\n}\n$0',
  },
]

// 2. Scala Snippets
export const SCALA_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'scala3-spark-pipeline',
    detail: 'Scala 3: Apache Spark Dataset ETL Pipeline',
    documentation: 'SparkSession initialization and typed Dataset transformations in Scala 3',
    insertText: 'package com.indoctrinated.editor.analytics\n\nimport org.apache.spark.sql.{SparkSession, Dataset}\nimport org.apache.spark.sql.functions.*\n\ncase class TelemetryRecord(id: String, metricValue: Double, timestamp: Long)\ncase class AggregatedMetric(id: String, avgMetric: Double, sampleCount: Long)\n\nobject TelemetryPipeline:\n  def main(args: Array[String]): Unit = {\n    val spark = SparkSession.builder()\n      .appName("LiquidGlassAnalytics")\n      .master("local[*]")\n      .getOrCreate()\n\n    import spark.implicits.*\n\n    val records: Dataset[TelemetryRecord] = spark.read\n      .parquet("data/input.parquet")\n      .as[TelemetryRecord]\n\n    val aggregated = records\n      .groupBy("id")\n      .agg(avg("metricValue").as("avgMetric"), count("id").as("sampleCount"))\n      .as[AggregatedMetric]\n\n    aggregated.write.mode("overwrite").json("data/output.json")\n    spark.stop()\n  }\n$0',
  },
]

// 3. MATLAB / Octave Snippets
export const MATLAB_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'matlab-matrix-simulation',
    detail: 'MATLAB / Octave: Vectorized Numerical Matrix Simulation',
    documentation: 'Vectorized mathematical function computation and 3D surface mesh visualization',
    insertText: '% IndoctrinatedEdit Numerical Matrix Simulation\nclc;\nclear;\nclose all;\n\n[X, Y] = meshgrid(-3:0.1:3, -3:0.1:3);\nR = sqrt(X.^2 + Y.^2) + eps;\nZ = sin(R) ./ R;\n\nfigure(\'Color\', [0.05, 0.05, 0.08]);\ns = surf(X, Y, Z);\ns.EdgeColor = \'none\';\ncolormap(turbo);\ncolorbar;\ntitle(\'Liquid Glass Specular Wave Dispersion\', \'Color\', \'w\');\nxlabel(\'X Spatial (mm)\', \'Color\', \'w\');\nylabel(\'Y Spatial (mm)\', \'Color\', \'w\');\nzlabel(\'Amplitude (dB)\', \'Color\', \'w\');\nset(gca, \'Color\', [0.08, 0.08, 0.12], \'XColor\', \'w\', \'YColor\', \'w\', \'ZColor\', \'w\');\n$0',
  },
]

export const DATASCIENCE_SNIPPETS: SnippetDefinition[] = [
  ...R_SNIPPETS,
  ...SCALA_SNIPPETS,
  ...MATLAB_SNIPPETS,
]

export const dataScienceSnippets = DATASCIENCE_SNIPPETS
