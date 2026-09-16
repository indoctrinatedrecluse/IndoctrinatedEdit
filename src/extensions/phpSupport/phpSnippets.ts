import { SnippetDefinition } from '../extensionTypes'

export const phpSnippets: SnippetDefinition[] = [
  // --- Modern PHP 8.2 / 8.3+ Core ---
  {
    label: 'php-class-readonly',
    detail: 'PHP 8.2+: Readonly Class with Constructor Property Promotion',
    documentation: 'Immutable data transfer object with typed constructor properties',
    insertText: '<?php\n\ndeclare(strict_types=1);\n\nnamespace App\\DTO;\n\nreadonly class ${1:UserData}\n{\n    public function __construct(\n        public string $id,\n        public string $name,\n        public string $email,\n        public array $roles = [],\n    ) {}\n}\n$0',
  },
  {
    label: 'php-enum',
    detail: 'PHP 8.1+: Backed Enum with Methods & Match',
    documentation: 'Type-safe string backed enum with behavior and match expressions',
    insertText: '<?php\n\ndeclare(strict_types=1);\n\nnamespace App\\Enums;\n\nenum ${1:OrderStatus}: string\n{\n    case PENDING = "pending";\n    case PROCESSING = "processing";\n    case COMPLETED = "completed";\n    case CANCELLED = "cancelled";\n\n    public function label(): string\n    {\n        return match($this) {\n            self::PENDING => "Awaiting Payment",\n            self::PROCESSING => "In Fulfillment",\n            self::COMPLETED => "Order Fulfilled",\n            self::CANCELLED => "Order Cancelled",\n        };\n    }\n}\n$0',
  },
  {
    label: 'php-match',
    detail: 'PHP 8+: Exhaustive Match Expression',
    documentation: 'Clean, expression-based pattern matching with return value',
    insertText: '$result = match (${1:$status}) {\n    "active", "online" => ${2:handleActive()},\n    "pending" => ${3:handlePending()},\n    default => throw new \\InvalidArgumentException("Unhandled status: {$1:$status}"),\n};\n$0',
  },

  // --- Laravel 11 / 12 Ecosystem ---
  {
    label: 'laravel-model',
    detail: 'Laravel: Eloquent Model with Casts & Relations',
    documentation: 'Modern Laravel Eloquent Model with casts method, fillables, and relationships',
    insertText: '<?php\n\nnamespace App\\Models;\n\nuse Illuminate\\Database\\Eloquent\\Model;\nuse Illuminate\\Database\\Eloquent\\Factories\\HasFactory;\nuse Illuminate\\Database\\Eloquent\\Relations\\HasMany;\nuse Illuminate\\Database\\Eloquent\\Relations\\BelongsTo;\n\nclass ${1:Article} extends Model\n{\n    use HasFactory;\n\n    protected $fillable = [\n        "title",\n        "slug",\n        "content",\n        "is_published",\n        "published_at",\n    ];\n\n    protected function casts(): array\n    {\n        return [\n            "is_published" => "boolean",\n            "published_at" => "datetime",\n        ];\n    }\n\n    public function user(): BelongsTo\n    {\n        return $this->belongsTo(User::class);\n    }\n}\n$0',
  },
  {
    label: 'laravel-api-controller',
    detail: 'Laravel: API Resource Controller with FormRequest',
    documentation: 'REST API Controller with validation and JsonResource response transformation',
    insertText: '<?php\n\nnamespace App\\Http\\Controllers\\Api;\n\nuse App\\Http\\Controllers\\Controller;\nuse App\\Http\\Requests\\${1:StoreArticleRequest};\nuse App\\Http\\Resources\\${2:ArticleResource};\nuse App\\Models\\${3:Article};\nuse Illuminate\\Http\\JsonResponse;\nuse Illuminate\\Http\\Resources\\Json\\AnonymousResourceCollection;\n\nclass ${3:Article}Controller extends Controller\n{\n    public function index(): AnonymousResourceCollection\n    {\n        return ${2:ArticleResource}::collection(${3:Article}::query()->latest()->paginate(15));\n    }\n\n    public function store(${1:StoreArticleRequest} $request): JsonResponse\n    {\n        $article = ${3:Article}::create($request->validated());\n        return (new ${2:ArticleResource}($article))\n            ->response()\n            ->setStatusCode(201);\n    }\n\n    public function show(${3:Article} $article): ${2:ArticleResource}\n    {\n        return new ${2:ArticleResource}($article);\n    }\n}\n$0',
  },
  {
    label: 'laravel-migration',
    detail: 'Laravel: Anonymous Migration Schema',
    documentation: 'Modern Laravel anonymous database migration with index and foreign keys',
    insertText: '<?php\n\nuse Illuminate\\Database\\Migrations\\Migration;\nuse Illuminate\\Database\\Schema\\Blueprint;\nuse Illuminate\\Support\\Facades\\Schema;\n\nreturn new class extends Migration\n{\n    public function up(): void\n    {\n        Schema::create("${1:articles}", function (Blueprint $table) {\n            $table->id();\n            $table->foreignId("user_id")->constrained()->cascadeOnDelete();\n            $table->string("title");\n            $table->string("slug")->unique();\n            $table->text("content");\n            $table->boolean("is_published")->default(false)->index();\n            $table->timestamp("published_at")->nullable();\n            $table->timestamps();\n        });\n    }\n\n    public function down(): void\n    {\n        Schema::dropIfExists("${1:articles}");\n    }\n};\n',
  },
  {
    label: 'laravel-routes',
    detail: 'Laravel: API Route Group with Middleware & Resource',
    documentation: 'Route group definition with auth:sanctum middleware and version prefix',
    insertText: 'use App\\Http\\Controllers\\Api\\${1:Article}Controller;\nuse Illuminate\\Support\\Facades\\Route;\n\nRoute::prefix("v1")->middleware(["api", "auth:sanctum"])->group(function () {\n    Route::apiResource("${2:articles}", ${1:Article}Controller::class);\n});\n$0',
  },
  {
    label: 'laravel-artisan-command',
    detail: 'Laravel: Console Artisan Command',
    documentation: 'Interactive Artisan CLI command with signature, description, and progress feedback',
    insertText: '<?php\n\nnamespace App\\Console\\Commands;\n\nuse Illuminate\\Console\\Command;\n\nclass ${1:SyncAssetsCommand} extends Command\n{\n    protected $signature = "app:${2:sync-assets} {--dry-run : Run without persisting}";\n    protected $description = "Synchronize assets across liquid glass microservices";\n\n    public function handle(): int\n    {\n        $isDryRun = $this->option("dry-run");\n        $this->info("✨ Starting asset sync [DryRun: " . ($isDryRun ? "YES" : "NO") . "]...");\n\n        ${0}\n\n        $this->info("✅ Sync completed successfully!");\n        return Command::SUCCESS;\n    }\n}\n',
  },
  {
    label: 'pest-test',
    detail: 'Pest PHP: Feature / Unit Test Spec',
    documentation: 'Elegant Pest PHP test definition with expectations',
    insertText: '<?php\n\nuse App\\Models\\User;\n\ntest("${1:can retrieve authenticated profile via api}", function () {\n    $user = User::factory()->create();\n\n    $response = $this->actingAs($user, "sanctum")\n        ->getJson("/api/v1/profile");\n\n    $response->assertOk()\n        ->assertJsonPath("data.email", $user->email);\n});\n$0',
  },
  {
    label: 'composer-json',
    detail: 'Composer: Modern composer.json Package Manifest',
    documentation: 'Standard composer.json with PHP 8.2+ requirements and PSR-4 autoloading',
    insertText: '{\n    "name": "indoctrinated/${1:app}",\n    "type": "project",\n    "description": "Liquid Glass PHP Application",\n    "require": {\n        "php": "^8.2",\n        "laravel/framework": "^11.0"\n    },\n    "require-dev": {\n        "pestphp/pest": "^2.0"\n    },\n    "autoload": {\n        "psr-4": {\n            "App\\\\": "app/"\n        }\n    }\n}\n',
  },
]
