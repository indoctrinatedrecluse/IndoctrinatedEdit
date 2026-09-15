import { SnippetDefinition } from '../extensionTypes'

export const pythonSnippets: SnippetDefinition[] = [
  // --- Modern Python Core (Python 3.11 / 3.12+) ---
  {
    label: 'main-py',
    detail: 'Python: Modern main() Entrypoint with Argparse',
    documentation: 'Standard Python CLI entrypoint with typed argument parsing',
    insertText: 'import argparse\nimport sys\nfrom typing import Sequence\n\ndef main(argv: Sequence[str] | None = None) -> int:\n\tparser = argparse.ArgumentParser(description="${1:Application description}")\n\tparser.add_argument("--name", "-n", default="world", help="Name to greet")\n\targs = parser.parse_args(argv)\n\n\tprint(f"✨ IndoctrinatedEdit Python Runtime: Hello {args.name}!")\n\t${0}\n\treturn 0\n\nif __name__ == "__main__":\n\tsys.exit(main())\n',
  },
  {
    label: 'dataclass',
    detail: 'Python: Modern Typed DataClass (slots & frozen)',
    documentation: 'High performance typed dataclass with slots and default factories',
    insertText: 'from dataclasses import dataclass, field\nfrom typing import List\n\n@dataclass(slots=True, frozen=True)\nclass ${1:UserProfile}:\n\tid: str\n\tusername: str\n\temail: str\n\ttags: List[str] = field(default_factory=list)\n\tis_active: bool = True\n$0',
  },
  {
    label: 'pydantic-model',
    detail: 'Pydantic V2: Validated Base Model & Field',
    documentation: 'Pydantic V2 schema with field constraints and model validation',
    insertText: 'from pydantic import BaseModel, Field, model_validator\nfrom typing import Optional\n\nclass ${1:ItemSchema}(BaseModel):\n\tid: str = Field(..., description="Unique item identifier")\n\tname: str = Field(..., min_length=1, max_length=100)\n\tprice: float = Field(..., gt=0.0)\n\tdescription: Optional[str] = None\n\n\t@model_validator(mode="after")\n\tdef check_validity(self) -> "${1:ItemSchema}":\n\t\t# Custom business rule validation\n\t\treturn self\n$0',
  },
  {
    label: 'async-taskgroup',
    detail: 'Python 3.11+: Async TaskGroup Concurrency',
    documentation: 'Structured async concurrency with asyncio.TaskGroup',
    insertText: 'import asyncio\nfrom typing import List\n\nasync def ${1:fetch_data}(task_id: int) -> str:\n\tawait asyncio.sleep(0.1)\n\treturn f"Result from task {task_id}"\n\nasync def run_pipeline() -> None:\n\tasync with asyncio.TaskGroup() as tg:\n\t\ttasks = [tg.create_task(${1:fetch_data}(i)) for i in range(5)]\n\n\tresults = [t.result() for t in tasks]\n\tprint(f"Aggregated results: {results}")\n\nif __name__ == "__main__":\n\tasyncio.run(run_pipeline())\n$0',
  },
  {
    label: 'context-mgr',
    detail: 'Python: Context Manager Generator',
    documentation: 'Safe resource setup and teardown with @contextmanager',
    insertText: 'from contextlib import contextmanager\nfrom typing import Generator\n\n@contextmanager\ndef ${1:managed_resource}() -> Generator[str, None, None]:\n\tprint("--> Initializing resource...")\n\tresource = "ActiveHandle"\n\ttry:\n\t\tyield resource\n\tfinally:\n\t\tprint("<-- Releasing resource...")\n$0',
  },
  {
    label: 'match-case',
    detail: 'Python: Structural Pattern Matching',
    documentation: 'Match-case pattern matching with guards and sequence extraction',
    insertText: 'def ${1:handle_command}(command: dict) -> None:\n\tmatch command:\n\t\tcase {"action": "create", "name": str(name)}:\n\t\t\tprint(f"Creating item {name}")\n\t\tcase {"action": "delete", "id": int(item_id)} if item_id > 0:\n\t\t\tprint(f"Deleting item {item_id}")\n\t\tcase _:\n\t\t\tprint("Unknown command format")\n$0',
  },

  // --- Web & Microservices (FastAPI / Flask / Django) ---
  {
    label: 'fastapi-app',
    detail: 'FastAPI: Modern Async REST API with Lifespan',
    documentation: 'Bootstrap a production-ready FastAPI application with CORS and Pydantic DTOs',
    insertText: 'from contextlib import asynccontextmanager\nfrom fastapi import FastAPI, HTTPException, status\nfrom fastapi.middleware.cors import CORSMiddleware\nfrom pydantic import BaseModel\n\nclass HealthResponse(BaseModel):\n\tstatus: str\n\tversion: str\n\n@asynccontextmanager\nasync def lifespan(app: FastAPI):\n\t# Startup logic (e.g. DB connection pool)\n\tyield\n\t# Shutdown logic\n\napp = FastAPI(title="${1:IndoctrinatedEdit Service}", version="1.0.0", lifespan=lifespan)\n\napp.add_middleware(\n\tCORSMiddleware,\n\tallow_origins=["*"],\n\tallow_credentials=True,\n\tallow_methods=["*"],\n\tallow_headers=["*"],\n)\n\n@app.get("/health", response_model=HealthResponse)\nasync def get_health():\n\treturn HealthResponse(status="healthy", version="1.0.0")\n\n@app.get("/api/v1/items/{item_id}")\nasync def get_item(item_id: int):\n\tif item_id <= 0:\n\t\traise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")\n\treturn {"item_id": item_id, "status": "active"}\n$0',
  },
  {
    label: 'flask-app',
    detail: 'Flask: Microframework Application & Blueprint',
    documentation: 'Bootstrap a lightweight Flask web application with JSON handlers',
    insertText: 'from flask import Flask, jsonify, request\n\napp = Flask(__name__)\n\n@app.route("/api/v1/status", methods=["GET"])\ndef api_status():\n\treturn jsonify({\n\t\t"status": "online",\n\t\t"server": "IndoctrinatedEdit Flask Runtime"\n\t})\n\n@app.route("/api/v1/echo", methods=["POST"])\ndef api_echo():\n\tdata = request.get_json() or {}\n\treturn jsonify({"received": data}), 200\n\nif __name__ == "__main__":\n\tapp.run(host="0.0.0.0", port=${1:5000}, debug=True)\n$0',
  },
  {
    label: 'django-view',
    detail: 'Django / DRF: Class-Based API View',
    documentation: 'Django REST Framework APIView with GET/POST handlers',
    insertText: 'from rest_framework.views import APIView\nfrom rest_framework.response import Response\nfrom rest_framework import status\n\nclass ${1:ItemListView}(APIView):\n\tdef get(self, request, format=None):\n\t\titems = [{"id": 1, "name": "Glass Specular Shader"}]\n\t\treturn Response(items, status=status.HTTP_200_OK)\n\n\tdef post(self, request, format=None):\n\t\tdata = request.data\n\t\treturn Response({"status": "created", "data": data}, status=status.HTTP_201_CREATED)\n$0',
  },

  // --- Data Science, Numerical & ML Subsidiaries (Pandas / NumPy / PyTorch / Scikit-Learn) ---
  {
    label: 'pandas-pipeline',
    detail: 'Pandas: Data Transformation & Aggregation Pipeline',
    documentation: 'Idiomatic Pandas DataFrame data processing and Parquet export',
    insertText: 'import pandas as pd\n\ndef ${1:process_dataset}(csv_path: str) -> pd.DataFrame:\n\tdf = pd.read_csv(csv_path)\n\n\t# Clean, filter, and transform pipeline\n\tcleaned = (\n\t\tdf.dropna(subset=["id"])\n\t\t.query("value > 0")\n\t\t.assign(normalized_val=lambda x: x["value"] / x["value"].max())\n\t\t.groupby("category")\n\t\t.agg(count=("id", "count"), avg_value=("value", "mean"))\n\t\t.reset_index()\n\t)\n\n\tcleaned.to_parquet("output_summary.parquet", index=False)\n\treturn cleaned\n$0',
  },
  {
    label: 'numpy-vectorized',
    detail: 'NumPy: Vectorized Array Math & Linear Algebra',
    documentation: 'Vectorized tensor operations and matrix manipulations with NumPy',
    insertText: 'import numpy as np\n\ndef ${1:vectorized_computation}(size: int = 1000) -> np.ndarray:\n\t# Generate random matrix and vector\n\tmatrix = np.random.randn(size, size).astype(np.float32)\n\tvector = np.random.randn(size).astype(np.float32)\n\n\t# Vectorized dot product and normalized softmax\n\toutput = np.dot(matrix, vector)\n\texp_out = np.exp(output - np.max(output))\n\tprobabilities = exp_out / np.sum(exp_out)\n\treturn probabilities\n$0',
  },
  {
    label: 'pytorch-model',
    detail: 'PyTorch: Deep Learning nn.Module & Training Loop',
    documentation: 'Bootstrap a PyTorch neural network layer architecture and optimizer loop',
    insertText: 'import torch\nimport torch.nn as nn\nimport torch.optim as optim\n\nclass ${1:NeuralClassifier}(nn.Module):\n\tdef __init__(self, in_features: int = 128, num_classes: int = 10):\n\t\tsuper().__init__()\n\t\tself.network = nn.Sequential(\n\t\t\tnn.Linear(in_features, 256),\n\t\t\tnn.BatchNorm1d(256),\n\t\t\tnn.ReLU(),\n\t\t\tnn.Dropout(0.2),\n\t\t\tnn.Linear(256, num_classes)\n\t\t)\n\n\tdef forward(self, x: torch.Tensor) -> torch.Tensor:\n\t\treturn self.network(x)\n\ndef train_step(model: nn.Module, x: torch.Tensor, y: torch.Tensor, optimizer: optim.Optimizer, criterion: nn.Module) -> float:\n\tmodel.train()\n\toptimizer.zero_grad()\n\toutputs = model(x)\n\tloss = criterion(outputs, y)\n\tloss.backward()\n\toptimizer.step()\n\treturn loss.item()\n$0',
  },
  {
    label: 'scikit-pipeline',
    detail: 'Scikit-Learn: ML Preprocessing & Estimator Pipeline',
    documentation: 'Train/test split, feature scaling, and classifier training pipeline',
    insertText: 'from sklearn.model_selection import train_test_split\nfrom sklearn.preprocessing import StandardScaler\nfrom sklearn.ensemble import RandomForestClassifier\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.metrics import classification_report\n\ndef train_model(X, y):\n\tX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\n\n\tpipeline = Pipeline([\n\t\t("scaler", StandardScaler()),\n\t\t("classifier", RandomForestClassifier(n_estimators=100, random_state=42))\n\t])\n\n\tpipeline.fit(X_train, y_train)\n\tpredictions = pipeline.predict(X_test)\n\tprint(classification_report(y_test, predictions))\n\treturn pipeline\n$0',
  },

  // --- Testing & CLI Subsidiaries (Pytest / Click) ---
  {
    label: 'pytest-fixture',
    detail: 'Pytest: Unit Test with Fixture & Parameterization',
    documentation: 'Idiomatic Pytest test suite with setup fixtures and parameterized test cases',
    insertText: 'import pytest\nfrom typing import Generator\n\n@pytest.fixture\ndef sample_client() -> Generator[dict, None, None]:\n\tclient = {"token": "test-sec-token", "connected": True}\n\tyield client\n\tclient["connected"] = False\n\n@pytest.mark.parametrize("input_val,expected", [\n\t(10, 20),\n\t(0, 0),\n\t(-5, -10),\n])\ndef test_${1:double_value}(sample_client: dict, input_val: int, expected: int) -> None:\n\tassert sample_client["connected"] is True\n\tresult = input_val * 2\n\tassert result == expected\n$0',
  },
  {
    label: 'click-cli',
    detail: 'Click: CLI Command Group & Arguments',
    documentation: 'Structured CLI tool with nested subcommands, options, and help text',
    insertText: 'import click\n\n@click.group()\n@click.version_option("1.0.0")\ndef cli():\n\t"""IndoctrinatedEdit Developer CLI Utility."""\n\tpass\n\n@cli.command()\n@click.argument("name")\n@click.option("--count", "-c", default=1, help="Number of iterations")\ndef run(name: str, count: int):\n\t"""Execute the batch process."""\n\tfor i in range(count):\n\t\tclick.echo(f"Processing item {name} [{i + 1}/{count}]...")\n\nif __name__ == "__main__":\n\tcli()\n$0',
  },
]
