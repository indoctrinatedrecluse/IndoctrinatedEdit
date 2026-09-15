import { SnippetDefinition } from '../extensionTypes'

export const rustSnippets: SnippetDefinition[] = [
  // --- Core Rust Constructs ---
  {
    label: 'fn',
    detail: 'Rust: Function Declaration',
    documentation: 'Declare a standard Rust function',
    insertText: 'pub fn ${1:function_name}(${2:params}) -> ${3:Result<(), Box<dyn std::error::Error>>} {\n\t${0:Ok(())}\n}',
  },
  {
    label: 'afn',
    detail: 'Rust: Async Function Declaration',
    documentation: 'Declare an asynchronous Rust function',
    insertText: 'pub async fn ${1:function_name}(${2:params}) -> ${3:Result<(), Box<dyn std::error::Error>>} {\n\t${0:Ok(())}\n}',
  },
  {
    label: 'struct',
    detail: 'Rust: Struct with Common Derives',
    documentation: 'Declare a typed struct with Debug, Clone, Serialize, Deserialize',
    insertText: '#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]\npub struct ${1:TypeName} {\n\tpub id: String,\n\tpub name: String,\n\t${0}\n}',
  },
  {
    label: 'enum',
    detail: 'Rust: Enum with Variants',
    documentation: 'Declare a Rust enum with data-carrying variants',
    insertText: '#[derive(Debug, Clone, PartialEq, Eq)]\npub enum ${1:State} {\n\t${2:Pending},\n\t${3:Active(String)},\n\t${4:Failed(String)},\n}\n$0',
  },
  {
    label: 'impl',
    detail: 'Rust: Implementation Block',
    documentation: 'Implement methods for a struct',
    insertText: 'impl ${1:TypeName} {\n\tpub fn new(${2:params}) -> Self {\n\t\tSelf {\n\t\t\t${0}\n\t\t}\n\t}\n}',
  },
  {
    label: 'trait',
    detail: 'Rust: Trait Definition',
    documentation: 'Define a Rust trait with associated methods',
    insertText: 'pub trait ${1:Service} {\n\ttype Error;\n\tfn execute(&self, req: ${2:Request}) -> Result<${3:Response}, Self::Error>;\n}\n$0',
  },
  {
    label: 'testmod',
    detail: 'Rust: Unit Test Module',
    documentation: 'Standard #[cfg(test)] module with unit test harness',
    insertText: '#[cfg(test)]\nmod tests {\n\tuse super::*;\n\n\t#[test]\n\tfn test_${1:feature}() {\n\t\tlet result = ${2:42};\n\t\tassert_eq!(result, ${3:42});\n\t}\n}\n$0',
  },

  // --- Tokio Async Runtime ---
  {
    label: 'tokio-main',
    detail: 'Tokio: Async Main Function',
    documentation: 'Bootstrap an async main function with the Tokio multi-thread runtime',
    insertText: '#[tokio::main]\nasync fn main() -> Result<(), Box<dyn std::error::Error>> {\n\tprintln!("✨ IndoctrinatedEdit Rust Tokio Runtime active!");\n\t${0}\n\tOk(())\n}\n',
  },
  {
    label: 'tokio-spawn',
    detail: 'Tokio: Spawn Async Task',
    documentation: 'Spawn a concurrent green thread with tokio::spawn',
    insertText: 'tokio::spawn(async move {\n\t${1:// concurrent async task}\n});\n$0',
  },

  // --- Axum Framework ---
  {
    label: 'axum-server',
    detail: 'Axum: High-Performance Web Service',
    documentation: 'Bootstrap an Axum async HTTP service with routing and state',
    insertText: 'use axum::{routing::get, response::Json, Router};\nuse std::net::SocketAddr;\n\n#[tokio::main]\nasync fn main() {\n\tlet app = Router::new()\n\t\t.route("/health", get(health_check))\n\t\t.route("/api/v1/${1:resource}", get(${2:get_resource}));\n\n\tlet addr = SocketAddr::from(([127, 0, 0, 1], ${3:3000}));\n\tlet listener = tokio::net::TcpListener::bind(addr).await.unwrap();\n\taxum::serve(listener, app).await.unwrap();\n}\n\nasync fn health_check() -> Json<serde_json::Value> {\n\tJson(serde_json::json!({ "status": "ok", "service": "IndoctrinatedEdit Rust Backend" }))\n}\n$0',
  },

  // --- Actix Web Framework ---
  {
    label: 'actix-main',
    detail: 'Actix-Web: Async Web Server',
    documentation: 'Bootstrap an Actix-Web HTTP server',
    insertText: 'use actix_web::{get, web, App, HttpServer, HttpResponse, Responder};\n\n#[get("/health")]\nasync fn health() -> impl Responder {\n\tHttpResponse::Ok().json(serde_json::json!({ "status": "healthy" }))\n}\n\n#[actix_web::main]\nasync fn main() -> std::io::Result<()> {\n\tHttpServer::new(|| {\n\t\tApp::new().service(health)\n\t})\n\t.bind(("127.0.0.1", ${1:8080}))?\n\t.run()\n\t.await\n}\n$0',
  },

  // --- Clap CLI Framework ---
  {
    label: 'clap-cli',
    detail: 'Clap: CLI Argument Parser (Derive)',
    documentation: 'Define CLI flags, options, and commands with Clap derive macros',
    insertText: 'use clap::{Parser, Subcommand};\n\n#[derive(Parser, Debug)]\n#[command(author, version, about, long_about = None)]\npub struct Cli {\n\t#[arg(short, long, default_value_t = 8080)]\n\tpub port: u16,\n\n\t#[command(subcommand)]\n\tpub command: Option<Commands>,\n}\n\n#[derive(Subcommand, Debug)]\npub enum Commands {\n\t${1:Serve} { #[arg(short, long)] debug: bool },\n}\n$0',
  },
]
