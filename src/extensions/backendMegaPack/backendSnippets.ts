import { SnippetDefinition } from '../extensionTypes'

// 1. Node / JS Backend (Express / NestJS / Fastify / Koa / Hono)
export const EXPRESS_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'express-server',
    detail: 'Express 5: Application Bootstrap with Middleware & Routing',
    documentation: 'Modern Express application with json parser, cors, error handler, and graceful shutdown',
    insertText: 'import express, { Request, Response, NextFunction } from "express";\nimport cors from "cors";\n\nconst app = express();\n\napp.use(cors());\napp.use(express.json());\n\napp.get("/health", (req: Request, res: Response) => {\n  res.json({ status: "healthy", engine: "IndoctrinatedEdit Express" });\n});\n\napp.post("/api/v1/data", (req: Request, res: Response) => {\n  res.status(201).json({ success: true, payload: req.body });\n});\n\nconst PORT = process.env.PORT || 4000;\napp.listen(PORT, () => {\n  console.log(`✨ Express server running on port ${PORT}`);\n});\n$0',
  },
]

export const NESTJS_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'nestjs-controller',
    detail: 'NestJS: Controller with Dependency Injection & Swagger',
    documentation: 'NestJS REST controller with @Controller, @Get, @Post, and constructor injection',
    insertText: 'import { Controller, Get, Post, Body, Param, ParseIntPipe, HttpStatus, HttpCode } from "@nestjs/common";\n\n@Controller("api/v1/${1:assets}")\nexport class ${2:AssetController} {\n  constructor(private readonly ${3:assetService}: ${4:AssetService}) {}\n\n  @Get()\n  async findAll() {\n    return this.${3:assetService}.getAllAssets();\n  }\n\n  @Get(":id")\n  async findOne(@Param("id", ParseIntPipe) id: number) {\n    return this.${3:assetService}.getAssetById(id);\n  }\n\n  @Post()\n  @HttpCode(HttpStatus.CREATED)\n  async create(@Body() createDto: any) {\n    return this.${3:assetService}.createAsset(createDto);\n  }\n}\n$0',
  },
]

export const FASTIFY_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'fastify-server',
    detail: 'Fastify: High-Performance JSON Server with Schemas',
    documentation: 'Fastify server with JSON Schema validation and route declaration',
    insertText: 'import Fastify from "fastify";\n\nconst fastify = Fastify({ logger: true });\n\nfastify.get("/health", async (request, reply) => {\n  return { status: "ok", engine: "IndoctrinatedEdit Fastify" };\n});\n\nfastify.post("/api/v1/items", {\n  schema: {\n    body: {\n      type: "object",\n      required: ["name"],\n      properties: {\n        name: { type: "string" },\n      },\n    },\n  },\n}, async (request, reply) => {\n  reply.code(201).send({ created: true, body: request.body });\n});\n\nconst start = async () => {\n  try {\n    await fastify.listen({ port: 3000, host: "0.0.0.0" });\n  } catch (err) {\n    fastify.log.error(err);\n    process.exit(1);\n  }\n};\nstart();\n$0',
  },
]

export const HONO_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'hono-edge-app',
    detail: 'Hono: Ultrafast Multi-Runtime Web Framework',
    documentation: 'Hono framework routing suitable for Cloudflare Workers, Deno, Bun, and Node.js',
    insertText: 'import { Hono } from "hono";\nimport { cors } from "hono/cors";\nimport { logger } from "hono/logger";\n\nconst app = new Hono();\n\napp.use("*", logger());\napp.use("*", cors());\n\napp.get("/health", (c) => c.json({ status: "healthy", runtime: "IndoctrinatedEdit Hono" }));\n\napp.get("/api/v1/users/:id", (c) => {\n  const id = c.req.param("id");\n  return c.json({ id, name: "Liquid Glass User", status: "active" });\n});\n\nexport default app;\n$0',
  },
]

export const KOA_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'koa-server',
    detail: 'Koa: Middleware-Driven HTTP Server',
    documentation: 'Koa server with router and async/await cascading middleware',
    insertText: 'import Koa from "koa";\nimport Router from "@koa/router";\nimport bodyParser from "koa-bodyparser";\n\nconst app = new Koa();\nconst router = new Router();\n\napp.use(bodyParser());\n\nrouter.get("/health", (ctx) => {\n  ctx.body = { status: "online", engine: "IndoctrinatedEdit Koa" };\n});\n\napp.use(router.routes()).use(router.allowedMethods());\n\napp.listen(3000, () => console.log("Koa running on http://localhost:3000"));\n$0',
  },
]

// 2. Python Backend (Sanic / FastAPI WebSocket / Django Ninja / Flask)
export const SANIC_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'sanic-app',
    detail: 'Sanic: Async Python Web Server',
    documentation: 'Sanic high-performance async Python web framework with JSON responses',
    insertText: 'from sanic import Sanic, Request, json\nfrom sanic_cors import CORS\n\napp = Sanic("IndoctrinatedEditSanic")\nCORS(app)\n\n@app.get("/health")\nasync def health_check(request: Request):\n    return json({"status": "healthy", "framework": "Sanic"})\n\n@app.post("/api/v1/process")\nasync def process_task(request: Request):\n    payload = request.json\n    return json({"received": True, "data": payload}, status=201)\n\nif __name__ == "__main__":\n    app.run(host="0.0.0.0", port=8000, access_log=True)\n$0',
  },
]

export const FASTAPI_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'fastapi-ws-router',
    detail: 'FastAPI: Real-time WebSocket Endpoint & Lifespan',
    documentation: 'FastAPI async WebSocket streaming handler with connection management',
    insertText: 'from fastapi import FastAPI, WebSocket, WebSocketDisconnect\nfrom contextlib import asynccontextmanager\n\n@asynccontextmanager\nasync def lifespan(app: FastAPI):\n    print("✨ FastAPI Liquid Glass Engine Started")\n    yield\n    print("🛑 FastAPI Engine Shutdown")\n\napp = FastAPI(title="IndoctrinatedEdit Backend", lifespan=lifespan)\n\n@app.websocket("/ws/telemetry")\nasync def telemetry_websocket(websocket: WebSocket):\n    await websocket.accept()\n    try:\n        while True:\n            data = await websocket.receive_text()\n            await websocket.send_text(f"Echo [{data}] from FastAPI")\n    except WebSocketDisconnect:\n        print("Client disconnected.")\n$0',
  },
]

export const DJANGO_NINJA_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'django-ninja-api',
    detail: 'Django Ninja: Type-Safe Async REST API for Django',
    documentation: 'Django Ninja router with Pydantic schema validation and OpenAPI generator',
    insertText: 'from ninja import NinjaAPI, Schema\nfrom typing import List\n\napi = NinjaAPI(title="IndoctrinatedEdit Ninja API", version="1.0.0")\n\nclass ${1:ItemSchema}(Schema):\n    id: int\n    name: str\n    active: bool = True\n\n@api.get("/items", response=List[${1:ItemSchema}])\ndef list_items(request):\n    return [{"id": 1, "name": "Liquid Shader Specular", "active": True}]\n\n@api.post("/items", response=${1:ItemSchema})\ndef create_item(request, payload: ${1:ItemSchema}):\n    return payload\n$0',
  },
]

export const FLASK_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'flask-app',
    detail: 'Flask: REST Application Factory with Blueprints',
    documentation: 'Flask application factory with CORS and blueprint registration',
    insertText: 'from flask import Flask, jsonify, request\nfrom flask_cors import CORS\n\ndef create_app():\n    app = Flask(__name__)\n    CORS(app)\n\n    @app.route("/health")\n    def health():\n        return jsonify({"status": "healthy", "framework": "Flask"})\n\n    return app\n\nif __name__ == "__main__":\n    app = create_app()\n    app.run(debug=True, port=5000)\n$0',
  },
]

// 3. PHP Backend (Symfony 7 / CodeIgniter 4 / Slim 4)
export const SYMFONY_BACKEND_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'symfony-api-controller',
    detail: 'Symfony 7: API Platform & MapRequestPayload Controller',
    documentation: 'Symfony 7 controller with #[Route], #[MapRequestPayload], and JsonResponse',
    insertText: '<?php\n\nnamespace App\\Controller;\n\nuse Symfony\\Bundle\\FrameworkBundle\\Controller\\AbstractController;\nuse Symfony\\Component\\HttpFoundation\\JsonResponse;\nuse Symfony\\Component\\HttpFoundation\\Response;\nuse Symfony\\Component\\Routing\\Attribute\\Route;\nuse Symfony\\Component\\HttpKernel\\Attribute\\MapRequestPayload;\n\n#[Route("/api/v1/assets", name: "api_assets_")]\nclass ${1:AssetController} extends AbstractController\n{\n    #[Route("", methods: ["GET"])]\n    public function index(): JsonResponse\n    {\n        return $this->json([\n            "items" => [],\n            "engine" => "Symfony 7 Liquid Glass"\n        ]);\n    }\n}\n$0',
  },
]

export const CODEIGNITER_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'codeigniter-resource-controller',
    detail: 'CodeIgniter 4: RESTful Resource Controller',
    documentation: 'CodeIgniter 4 ResourceController with failNotFound and respondCreated',
    insertText: '<?php\n\nnamespace App\\Controllers;\n\nuse CodeIgniter\\RESTful\\ResourceController;\n\nclass ${1:Products} extends ResourceController\n{\n    protected $modelName = "App\\Models\\${1:Product}Model";\n    protected $format    = "json";\n\n    public function index()\n    {\n        return $this->respond($this->model->findAll());\n    }\n\n    public function show($id = null)\n    {\n        $data = $this->model->find($id);\n        if (!$data) return $this->failNotFound("Item not found");\n        return $this->respond($data);\n    }\n}\n$0',
  },
]

export const SLIM_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'slim-microservice',
    detail: 'Slim 4: PSR-7 Microservice with Routing & Middleware',
    documentation: 'Slim 4 PHP microframework setup with JSON response helper and CORS middleware',
    insertText: '<?php\n\nuse Psr\\Http\\Message\\ResponseInterface as Response;\nuse Psr\\Http\\Message\\ServerRequestInterface as Request;\nuse Slim\\Factory\\AppFactory;\n\nrequire __DIR__ . "/../vendor/autoload.php";\n\n$app = AppFactory::create();\n$app->addBodyParsingMiddleware();\n$app->addErrorMiddleware(true, true, true);\n\n$app->get("/health", function (Request $request, Response $response) {\n    $payload = json_encode(["status" => "healthy", "runtime" => "Slim 4"]);\n    $response->getBody()->write($payload);\n    return $response->withHeader("Content-Type", "application/json");\n});\n\n$app->run();\n$0',
  },
]

// 4. Ruby Backend (Sinatra / Hanami)
export const SINATRA_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'sinatra-app',
    detail: 'Sinatra: Lightweight REST API Service',
    documentation: 'Sinatra microframework API with JSON headers and before filter',
    insertText: '# frozen_string_literal: true\n\nrequire "sinatra"\nrequire "json"\n\nset :port, 4567\nset :bind, "0.0.0.0"\n\nbefore do\n  content_type :json\nend\n\nget "/health" do\n  { status: "ok", framework: "Sinatra" }.to_json\nend\n\npost "/api/v1/echo" do\n  payload = JSON.parse(request.body.read)\n  { success: true, echo: payload }.to_json\nend\n$0',
  },
]

export const HANAMI_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'hanami-action',
    detail: 'Hanami 2: Action Class with Parameter Validation',
    documentation: 'Hanami 2 Action with typed schema validation and HTTP responses',
    insertText: '# frozen_string_literal: true\n\nmodule ${1:MyApp}\n  module Actions\n    module Assets\n      class Index < ${1:MyApp}::Action\n        params do\n          optional(:page).filled(:integer)\n        end\n\n        def handle(request, response)\n          response.format = :json\n          response.body = { items: [], page: request.params[:page] || 1 }.to_json\n        end\n      end\n    end\n  end\nend\n$0',
  },
]

// 5. Java / Kotlin Backend (Ktor / Spring Boot / Micronaut / Quarkus)
export const KTOR_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'ktor-server-routing',
    detail: 'Ktor 3 (Kotlin): Async Coroutine Server with Netty & ContentNegotiation',
    documentation: 'Modern Ktor application module with JSON serialization and embedded Netty engine',
    insertText: 'import io.ktor.server.application.*\nimport io.ktor.server.engine.*\nimport io.ktor.server.netty.*\nimport io.ktor.server.response.*\nimport io.ktor.server.routing.*\nimport io.ktor.server.plugins.contentnegotiation.*\nimport io.ktor.serialization.kotlinx.json.*\nimport kotlinx.serialization.Serializable\n\n@Serializable\ndata class HealthStatus(val status: String, val runtime: String)\n\nfun Application.module() {\n    install(ContentNegotiation) {\n        json()\n    }\n    routing {\n        get("/health") {\n            call.respond(HealthStatus("healthy", "Ktor 3 Kotlin Async Engine"))\n        }\n    }\n}\n\nfun main() {\n    embeddedServer(Netty, port = 8080, module = Application::module).start(wait = true)\n}\n$0',
  },
]

export const SPRING_BOOT_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'spring-boot-reactive-controller',
    detail: 'Spring Boot 3: Reactive WebFlux REST Controller',
    documentation: 'Spring WebFlux reactive controller returning Mono and Flux streams',
    insertText: 'package com.indoctrinated.editor;\n\nimport org.springframework.web.bind.annotation.*;\nimport reactor.core.publisher.Flux;\nimport reactor.core.publisher.Mono;\nimport java.util.Map;\n\n@RestController\n@RequestMapping("/api/v1/reactive")\npublic class ${1:ReactiveController} {\n\n    @GetMapping("/health")\n    public Mono<Map<String, String>> health() {\n        return Mono.just(Map.of("status", "healthy", "engine", "Spring Boot 3 WebFlux"));\n    }\n\n    @GetMapping(value = "/stream", produces = "text/event-stream")\n    public Flux<String> eventStream() {\n        return Flux.interval(java.time.Duration.ofSeconds(1))\n                   .map(seq -> "Liquid Glass Frame " + seq);\n    }\n}\n$0',
  },
]

export const MICRONAUT_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'micronaut-controller',
    detail: 'Micronaut: Compile-Time AOT Controller',
    documentation: 'Micronaut ultra-fast controller with compile-time dependency injection',
    insertText: 'package com.indoctrinated.editor;\n\nimport io.micronaut.http.annotation.Controller;\nimport io.micronaut.http.annotation.Get;\nimport io.micronaut.http.annotation.Post;\nimport io.micronaut.http.HttpStatus;\nimport io.micronaut.http.HttpResponse;\nimport java.util.Map;\n\n@Controller("/api/v1/micronaut")\npublic class ${1:MicroController} {\n\n    @Get("/health")\n    public HttpResponse<Map<String, String>> health() {\n        return HttpResponse.ok(Map.of("status", "ok", "runtime", "Micronaut AOT"));\n    }\n}\n$0',
  },
]

export const QUARKUS_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'quarkus-reactive-resource',
    detail: 'Quarkus: Supersonic Subatomic Reactive JAX-RS Resource',
    documentation: 'Quarkus RESTEasy Reactive endpoint with Mutiny Uni asynchronous types',
    insertText: 'package com.indoctrinated.editor;\n\nimport jakarta.ws.rs.GET;\nimport jakarta.ws.rs.Path;\nimport jakarta.ws.rs.Produces;\nimport jakarta.ws.rs.core.MediaType;\nimport io.smallrye.mutiny.Uni;\nimport java.util.Map;\n\n@Path("/api/v1/quarkus")\npublic class ${1:QuarkusResource} {\n\n    @GET\n    @Path("/health")\n    @Produces(MediaType.APPLICATION_JSON)\n    public Uni<Map<String, String>> health() {\n        return Uni.createFrom().item(Map.of("status", "healthy", "runtime", "Quarkus GraalVM"));\n    }\n}\n$0',
  },
]

// 6. Go Backend (Gin / Fiber / Echo)
export const GIN_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'gin-router',
    detail: 'Gin (Go): High-Performance HTTP Engine with Middleware',
    documentation: 'Gin engine setup with recovery, logger, CORS, and JSON route groups',
    insertText: 'package main\n\nimport (\n\t"net/http"\n\t"github.com/gin-gonic/gin"\n)\n\nfunc main() {\n\tr := gin.Default()\n\n\tr.GET("/health", func(c *gin.Context) {\n\t\tc.JSON(http.StatusOK, gin.H{\n\t\t\t"status":  "healthy",\n\t\t\t"runtime": "Gin Web Framework (Go)",\n\t\t})\n\t})\n\n\tapi := r.Group("/api/v1")\n\t{\n\t\tapi.GET("/ping", func(c *gin.Context) {\n\t\t\tc.JSON(http.StatusOK, gin.H{"message": "pong"})\n\t\t})\n\t}\n\n\tr.Run(":8080")\n}\n$0',
  },
]

export const FIBER_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'fiber-app',
    detail: 'Fiber (Go): Fasthttp-Powered Express-Style Web Server',
    documentation: 'Fiber v2 app with zero memory allocation routing and JSON handlers',
    insertText: 'package main\n\nimport (\n\t"log"\n\t"github.com/gofiber/fiber/v2"\n\t"github.com/gofiber/fiber/v2/middleware/cors"\n\t"github.com/gofiber/fiber/v2/middleware/logger"\n)\n\nfunc main() {\n\tapp := fiber.New(fiber.Config{\n\t\tAppName: "IndoctrinatedEdit Fiber Engine",\n\t})\n\n\tapp.Use(logger.New())\n\tapp.Use(cors.New())\n\n\tapp.Get("/health", func(c *fiber.Ctx) error {\n\t\treturn c.JSON(fiber.Map{\n\t\t\t"status":  "healthy",\n\t\t\t"runtime": "Fiber Fasthttp Engine",\n\t\t})\n\t})\n\n\tlog.Fatal(app.Listen(":3000"))\n}\n$0',
  },
]

export const ECHO_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'echo-server',
    detail: 'Echo (Go): Minimalist Fast HTTP Router',
    documentation: 'Echo framework server with middleware and context rendering',
    insertText: 'package main\n\nimport (\n\t"net/http"\n\t"github.com/labstack/echo/v4"\n\t"github.com/labstack/echo/v4/middleware"\n)\n\nfunc main() {\n\te := echo.New()\n\te.Use(middleware.Logger())\n\te.Use(middleware.Recover())\n\n\te.GET("/health", func(c echo.Context) error {\n\t\treturn c.JSON(http.StatusOK, map[string]string{\n\t\t\t"status": "healthy",\n\t\t\t"engine": "Echo Go Router",\n\t\t})\n\t})\n\n\te.Logger.Fatal(e.Start(":1323"))\n}\n$0',
  },
]

// 7. .NET Backend (SignalR / Minimal APIs)
export const DOTNET_BACKEND_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'dotnet-signalr-hub',
    detail: 'ASP.NET Core: Real-Time SignalR Typed Hub',
    documentation: 'ASP.NET Core strongly-typed SignalR hub with client proxy interface',
    insertText: 'using Microsoft.AspNetCore.SignalR;\n\nnamespace Indoctrinated.Editor.Hubs;\n\npublic interface ITelemetryClient\n{\n    Task ReceiveUpdate(string topic, object payload);\n}\n\npublic class ${1:TelemetryHub} : Hub<ITelemetryClient>\n{\n    public async Task BroadcastStatus(string topic, string message)\n    {\n        await Clients.All.ReceiveUpdate(topic, new { Message = message, Timestamp = DateTime.UtcNow });\n    }\n}\n$0',
  },
]

// 8. Rust Backend (Actix-Web / Axum)
export const ACTIX_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'actix-web-server',
    detail: 'Actix-Web (Rust): Actor-Powered Multi-Threaded HTTP Server',
    documentation: 'Actix-web HTTP server with App state, json responders, and tokio runtime',
    insertText: 'use actix_web::{get, post, web, App, HttpResponse, HttpServer, Responder};\nuse serde::{Deserialize, Serialize};\n\n#[derive(Serialize)]\nstruct HealthResponse {\n    status: String,\n    engine: String,\n}\n\n#[get("/health")]\nasync fn health_check() -> impl Responder {\n    HttpResponse::Ok().json(HealthResponse {\n        status: "healthy".to_string(),\n        engine: "Actix-Web Rust Engine".to_string(),\n    })\n}\n\n#[actix_web::main]\nasync fn main() -> std::io::Result<()> {\n    println!("✨ Actix-Web server starting on 127.0.0.1:8080");\n    HttpServer::new(|| {\n        App::new()\n            .service(health_check)\n    })\n    .bind(("127.0.0.1", 8080))?\n    .run()\n    .await\n}\n$0',
  },
]

export const AXUM_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'axum-router',
    detail: 'Axum (Rust): Tokio-Backed Modular Async Web Router',
    documentation: 'Axum web router with tower layers, Json extractors, and graceful shutdown',
    insertText: 'use axum::{routing::get, Json, Router};\nuse serde_json::{json, Value};\nuse std::net::SocketAddr;\nuse tokio::net::TcpListener;\n\nasync fn health_handler() -> Json<Value> {\n    Json(json!({\n        "status": "healthy",\n        "framework": "Axum 0.7 (Rust/Tokio)"\n    }))\n}\n\n#[tokio::main]\nasync fn main() {\n    let app = Router::new().route("/health", get(health_handler));\n    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));\n    let listener = TcpListener::bind(addr).await.unwrap();\n    println!("✨ Axum running on {}", addr);\n    axum::serve(listener, app).await.unwrap();\n}\n$0',
  },
]

export const BACKEND_SNIPPETS: SnippetDefinition[] = [
  ...EXPRESS_SNIPPETS,
  ...NESTJS_SNIPPETS,
  ...FASTIFY_SNIPPETS,
  ...KOA_SNIPPETS,
  ...HONO_SNIPPETS,
  ...SANIC_SNIPPETS,
  ...FASTAPI_SNIPPETS,
  ...DJANGO_NINJA_SNIPPETS,
  ...FLASK_SNIPPETS,
  ...SYMFONY_BACKEND_SNIPPETS,
  ...CODEIGNITER_SNIPPETS,
  ...SLIM_SNIPPETS,
  ...SINATRA_SNIPPETS,
  ...HANAMI_SNIPPETS,
  ...KTOR_SNIPPETS,
  ...SPRING_BOOT_SNIPPETS,
  ...MICRONAUT_SNIPPETS,
  ...QUARKUS_SNIPPETS,
  ...GIN_SNIPPETS,
  ...FIBER_SNIPPETS,
  ...ECHO_SNIPPETS,
  ...DOTNET_BACKEND_SNIPPETS,
  ...ACTIX_SNIPPETS,
  ...AXUM_SNIPPETS,
]

export const backendSnippets = BACKEND_SNIPPETS
