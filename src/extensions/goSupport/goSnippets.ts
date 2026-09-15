import { SnippetDefinition } from '../extensionTypes'

export const goSnippets: SnippetDefinition[] = [
  // --- Core Go Constructs ---
  {
    label: 'main',
    detail: 'Go: package main & func main()',
    documentation: 'Standard executable Go entrypoint',
    insertText: 'package main\n\nimport (\n\t"fmt"\n)\n\nfunc main() {\n\tfmt.Println("${1:Hello, IndoctrinatedEdit!}")\n\t$0\n}\n',
  },
  {
    label: 'fn',
    detail: 'Go: Function declaration',
    documentation: 'Declare a standard Go function',
    insertText: 'func ${1:FunctionName}(${2:params}) ${3:error} {\n\t${0}\n\treturn nil\n}',
  },
  {
    label: 'mfn',
    detail: 'Go: Method with Receiver',
    documentation: 'Declare a method on a struct receiver',
    insertText: 'func (${1:r} *${2:ReceiverType}) ${3:MethodName}(${4:params}) ${5:error} {\n\t${0}\n\treturn nil\n}',
  },
  {
    label: 'errcheck',
    detail: 'Go: if err != nil check',
    documentation: 'Standard Go error check and return',
    insertText: 'if err != nil {\n\treturn ${1:fmt.Errorf("${2:failed to execute}: %w", err)}\n}\n$0',
  },
  {
    label: 'goroutine',
    detail: 'Go: Anonymous Goroutine',
    documentation: 'Spawn a concurrent goroutine',
    insertText: 'go func() {\n\t${1:// concurrent execution}\n}()\n$0',
  },
  {
    label: 'channel',
    detail: 'Go: Buffered / Unbuffered Channel',
    documentation: 'Initialize a new Go channel',
    insertText: '${1:ch} := make(chan ${2:string}, ${3:10})\n$0',
  },
  {
    label: 'select',
    detail: 'Go: Select Statement',
    documentation: 'Select over channel communications',
    insertText: 'select {\ncase ${1:msg} := <-${2:ch}:\n\t${3:// handle message}\ncase <-ctx.Done():\n\treturn ctx.Err()\ndefault:\n\t${4:// non-blocking fallback}\n}\n$0',
  },
  {
    label: 'struct',
    detail: 'Go: Struct Definition',
    documentation: 'Define a new struct with JSON/YAML tags',
    insertText: 'type ${1:ModelName} struct {\n\tID        string    `json:"id"`\n\tCreatedAt time.Time `json:"created_at"`\n\t${2:Name}      string    `json:"${3:name}"`\n}\n$0',
  },
  {
    label: 'interface',
    detail: 'Go: Interface Definition',
    documentation: 'Define a Go interface',
    insertText: 'type ${1:Service} interface {\n\t${2:Execute}(ctx context.Context, ${3:req} ${4:Request}) (${5:Response}, error)\n}\n$0',
  },
  {
    label: 'table-test',
    detail: 'Go: Table-Driven Unit Test',
    documentation: 'Idiomatic table-driven test template using testing.T',
    insertText: 'func Test_${1:FunctionName}(t *testing.T) {\n\ttests := []struct {\n\t\tname    string\n\t\tinput   ${2:string}\n\t\twant    ${3:string}\n\t\twantErr bool\n\t}{\n\t\t{\n\t\t\tname:    "${4:valid input}",\n\t\t\tinput:   ${5:"test"},\n\t\t\twant:    ${6:"test"},\n\t\t\twantErr: false,\n\t\t},\n\t}\n\tfor _, tt := range tests {\n\t\tt.Run(tt.name, func(t *testing.T) {\n\t\t\tgot, err := ${1:FunctionName}(tt.input)\n\t\t\tif (err != nil) != tt.wantErr {\n\t\t\t\tt.Errorf("${1:FunctionName}() error = %v, wantErr %v", err, tt.wantErr)\n\t\t\t\treturn\n\t\t\t}\n\t\t\tif got != tt.want {\n\t\t\t\tt.Errorf("${1:FunctionName}() = %v, want %v", got, tt.want)\n\t\t\t}\n\t\t})\n\t}\n}\n$0',
  },

  // --- Gin Framework Snippets ---
  {
    label: 'gin-server',
    detail: 'Gin: High-Performance Web Server',
    documentation: 'Bootstrap a production Gin engine with middleware and routes',
    insertText: 'package main\n\nimport (\n\t"net/http"\n\t"github.com/gin-gonic/gin"\n)\n\nfunc main() {\n\tr := gin.Default()\n\n\tr.GET("/health", func(c *gin.Context) {\n\t\tc.JSON(http.StatusOK, gin.H{"status": "ok", "service": "IndoctrinatedEdit backend"})\n\t})\n\n\tv1 := r.Group("/api/v1")\n\t{\n\t\tv1.GET("/${1:items}", func(c *gin.Context) {\n\t\t\tc.JSON(http.StatusOK, gin.H{"items": []string{${2:"one", "two"}}})\n\t\t})\n\t}\n\n\tr.Run(":${3:8080}")\n}\n$0',
  },
  {
    label: 'gin-handler',
    detail: 'Gin: Route Handler',
    documentation: 'Gin route handler function with JSON response',
    insertText: 'func ${1:HandleGet}(c *gin.Context) {\n\tid := c.Param("id")\n\tc.JSON(http.StatusOK, gin.H{\n\t\t"id": id,\n\t\t"status": "success",\n\t})\n}\n$0',
  },

  // --- Fiber Framework Snippets ---
  {
    label: 'fiber-app',
    detail: 'Fiber: Express-inspired Web Server',
    documentation: 'Bootstrap a Go Fiber HTTP server',
    insertText: 'package main\n\nimport (\n\t"log"\n\t"github.com/gofiber/fiber/v2"\n\t"github.com/gofiber/fiber/v2/middleware/logger"\n\t"github.com/gofiber/fiber/v2/middleware/recover"\n)\n\nfunc main() {\n\tapp := fiber.New()\n\tapp.Use(logger.New())\n\tapp.Use(recover.New())\n\n\tapp.Get("/api/v1/health", func(c *fiber.Ctx) error {\n\t\treturn c.JSON(fiber.Map{"status": "healthy"})\n\t})\n\n\tlog.Fatal(app.Listen(":${1:3000}"))\n}\n$0',
  },

  // --- GORM ORM Snippets ---
  {
    label: 'gorm-model',
    detail: 'GORM: Entity Model',
    documentation: 'Define a GORM database entity with hooks and fields',
    insertText: 'type ${1:User} struct {\n\tgorm.Model\n\tUUID      string `gorm:"type:uuid;default:gen_random_uuid();uniqueIndex" json:"uuid"`\n\tEmail     string `gorm:"uniqueIndex;not null" json:"email"`\n\tIsActive  bool   `gorm:"default:true" json:"is_active"`\n}\n$0',
  },

  // --- Cobra CLI Framework Snippets ---
  {
    label: 'cobra-cmd',
    detail: 'Cobra: CLI Subcommand',
    documentation: 'Create a Cobra command with flags and execution logic',
    insertText: 'var ${1:serveCmd} = &cobra.Command{\n\tUse:   "${2:serve}",\n\tShort: "${3:Start the microservice server}",\n\tRunE: func(cmd *cobra.Command, args []string) error {\n\t\t${0:// execution logic}\n\t\treturn nil\n\t},\n}\n\nfunc init() {\n\trootCmd.AddCommand(${1:serveCmd})\n\t${1:serveCmd}.Flags().IntP("port", "p", 8080, "Port to listen on")\n}\n',
  },
]
