import { SnippetDefinition } from '../extensionTypes'

export const cppSnippets: SnippetDefinition[] = [
  // --- Modern C++ Core (C++20 / C++23) ---
  {
    label: 'main-cpp',
    detail: 'C++: Modern main() with std::cout / std::println',
    documentation: 'Standard modern C++ executable entrypoint',
    insertText: '#include <iostream>\n#include <string_view>\n#include <vector>\n\nint main(int argc, char* argv[]) {\n\tstd::cout << "✨ IndoctrinatedEdit C++ Universal Engine Active!\\n";\n\t${0}\n\treturn 0;\n}\n',
  },
  {
    label: 'class-rule5',
    detail: 'C++: Class with Rule of 5',
    documentation: 'Idiomatic C++ class with custom destructor, copy/move constructors, and assignment operators',
    insertText: 'class ${1:ResourceHolder} {\npublic:\n\t${1:ResourceHolder}() = default;\n\tvirtual ~${1:ResourceHolder}() = default;\n\n\t// Copy semantics\n\t${1:ResourceHolder}(const ${1:ResourceHolder}& other) = default;\n\t${1:ResourceHolder}& operator=(const ${1:ResourceHolder}& other) = default;\n\n\t// Move semantics\n\t${1:ResourceHolder}(${1:ResourceHolder}&& other) noexcept = default;\n\t${1:ResourceHolder}& operator=(${1:ResourceHolder}&& other) noexcept = default;\n\nprivate:\n\t${0}\n};\n',
  },
  {
    label: 'concept',
    detail: 'C++20: Concept & Requires Clause',
    documentation: 'Define a modern C++20 type concept with semantic constraints',
    insertText: 'template <typename T>\nconcept ${1:Numeric} = requires(T a, T b) {\n\t{ a + b } -> std::convertible_to<T>;\n\t{ a * b } -> std::convertible_to<T>;\n};\n\ntemplate <${1:Numeric} T>\nT ${2:calculate}(T a, T b) {\n\treturn a * b;\n}\n$0',
  },
  {
    label: 'coroutine-task',
    detail: 'C++20: Coroutine Task Generator',
    documentation: 'C++20 co_yield / co_await coroutine definition with promise_type',
    insertText: '#include <coroutine>\n#include <optional>\n\ntemplate <typename T>\nstruct ${1:Generator} {\n\tstruct promise_type {\n\t\tstd::optional<T> current_value;\n\t\t${1:Generator} get_return_object() { return ${1:Generator}{std::coroutine_handle<promise_type>::from_promise(*this)}; }\n\t\tstd::suspend_always initial_suspend() noexcept { return {}; }\n\t\tstd::suspend_always final_suspend() noexcept { return {}; }\n\t\tstd::suspend_always yield_value(T value) noexcept {\n\t\t\tcurrent_value = value;\n\t\t\treturn {};\n\t\t}\n\t\tvoid return_void() noexcept {}\n\t\tvoid unhandled_exception() { std::terminate(); }\n\t};\n\n\tstd::coroutine_handle<promise_type> handle;\n};\n$0',
  },
  {
    label: 'ranges-pipeline',
    detail: 'C++20: std::ranges Views Pipeline',
    documentation: 'Transform and filter sequences with std::ranges::views',
    insertText: '#include <ranges>\n#include <vector>\n#include <iostream>\n\nvoid ${1:processData}(const std::vector<int>& numbers) {\n\tauto results = numbers\n\t\t| std::views::filter([](int n) { return n % 2 == 0; })\n\t\t| std::views::transform([](int n) { return n * n; });\n\n\tfor (int val : results) {\n\t\tstd::cout << val << " ";\n\t}\n\tstd::cout << "\\n";\n}\n$0',
  },
  {
    label: 'variant-visit',
    detail: 'C++17: std::variant & std::visit',
    documentation: 'Type-safe union pattern with template lambda visitor',
    insertText: '#include <variant>\n#include <string>\n#include <iostream>\n\nusing ${1:DataValue} = std::variant<int, double, std::string>;\n\ntemplate<class... Ts> struct overloads : Ts... { using Ts::operator()...; };\ntemplate<class... Ts> overloads(Ts...) -> overloads<Ts...>;\n\nvoid ${2:printValue}(const ${1:DataValue}& val) {\n\tstd::visit(overloads{\n\t\t[](int arg) { std::cout << "int: " << arg << "\\n"; },\n\t\t[](double arg) { std::cout << "double: " << arg << "\\n"; },\n\t\t[](const std::string& arg) { std::cout << "string: " << arg << "\\n"; }\n\t}, val);\n}\n$0',
  },

  // --- C Language Core (C99 / C11 / C23) ---
  {
    label: 'main-c',
    detail: 'C: Standard main() Function',
    documentation: 'Idiomatic C entry point with stdio.h and stdlib.h',
    insertText: '#include <stdio.h>\n#include <stdlib.h>\n#include <stdbool.h>\n\nint main(int argc, char* argv[]) {\n\tprintf("✨ IndoctrinatedEdit C Native Runtime\\n");\n\t${0}\n\treturn EXIT_SUCCESS;\n}\n',
  },
  {
    label: 'struct-typedef',
    detail: 'C: Typedef Struct & Lifecycle',
    documentation: 'C opaque struct pattern with alloc/free constructor & destructor',
    insertText: 'typedef struct ${1:Node} {\n\tuint64_t id;\n\tchar* name;\n\tstruct ${1:Node}* next;\n} ${1:Node};\n\n${1:Node}* ${1:Node}_create(uint64_t id, const char* name) {\n\t${1:Node}* node = (${1:Node}*)malloc(sizeof(${1:Node}));\n\tif (!node) return NULL;\n\tnode->id = id;\n\tnode->name = name ? strdup(name) : NULL;\n\tnode->next = NULL;\n\treturn node;\n}\n\nvoid ${1:Node}_destroy(${1:Node}* node) {\n\tif (node) {\n\t\tfree(node->name);\n\t\tfree(node);\n\t}\n}\n$0',
  },
  {
    label: 'pthreads-worker',
    detail: 'C/POSIX: pthreads Worker & Mutex',
    documentation: 'POSIX thread spawning with mutex locking',
    insertText: '#include <pthread.h>\n#include <stdio.h>\n#include <stdlib.h>\n\nstatic pthread_mutex_t lock = PTHREAD_MUTEX_INITIALIZER;\nstatic int counter = 0;\n\nvoid* ${1:worker_fn}(void* arg) {\n\tpthread_mutex_lock(&lock);\n\tcounter++;\n\tprintf("Worker thread executing, counter: %d\\n", counter);\n\tpthread_mutex_unlock(&lock);\n\treturn NULL;\n}\n$0',
  },

  // --- Systems & Embedded / Low-Level ---
  {
    label: 'simd-avx2',
    detail: 'C/C++: AVX2 SIMD Vectorization',
    documentation: 'Vectorized parallel float addition using Intel AVX2 intrinsics',
    insertText: '#include <immintrin.h>\n\nvoid ${1:vector_add_avx2}(const float* a, const float* b, float* c, size_t count) {\n\tsize_t i = 0;\n\tfor (; i + 8 <= count; i += 8) {\n\t\t__m256 va = _mm256_loadu_ps(&a[i]);\n\t\t__m256 vb = _mm256_loadu_ps(&b[i]);\n\t\t__m256 vc = _mm256_add_ps(va, vb);\n\t\t_mm256_storeu_ps(&c[i], vc);\n\t}\n\tfor (; i < count; ++i) {\n\t\tc[i] = a[i] + b[i];\n\t}\n}\n$0',
  },
  {
    label: 'mmap-io',
    detail: 'POSIX: Memory-Mapped File I/O',
    documentation: 'Zero-copy high throughput file read with mmap',
    insertText: '#include <sys/mman.h>\n#include <sys/stat.h>\n#include <fcntl.h>\n#include <unistd.h>\n#include <stdio.h>\n\nvoid ${1:read_mmap}(const char* filepath) {\n\tint fd = open(filepath, O_RDONLY);\n\tif (fd < 0) return;\n\n\tstruct stat sb;\n\tfstat(fd, &sb);\n\n\tchar* addr = (char*)mmap(NULL, sb.st_size, PROT_READ, MAP_PRIVATE, fd, 0);\n\tif (addr == MAP_FAILED) {\n\t\tclose(fd);\n\t\treturn;\n\t}\n\n\t// Use addr buffer directly\n\t${0}\n\n\tmunmap(addr, sb.st_size);\n\tclose(fd);\n}\n',
  },

  // --- Game Dev & Graphics ---
  {
    label: 'raylib-game',
    detail: 'Raylib: Modern Game Loop Setup',
    documentation: 'Bootstrap a 2D/3D Raylib desktop window and render loop',
    insertText: '#include "raylib.h"\n\nint main(void) {\n\tconst int screenWidth = 1280;\n\tconst int screenHeight = 720;\n\n\tSetConfigFlags(FLAG_WINDOW_RESIZABLE | FLAG_MSAA_4X_HINT);\n\tInitWindow(screenWidth, screenHeight, "IndoctrinatedEdit Game Engine");\n\tSetTargetFPS(60);\n\n\twhile (!WindowShouldClose()) {\n\t\t// Update logic\n\t\t${0}\n\n\t\t// Draw\n\t\tBeginDrawing();\n\t\tClearBackground((Color){ 10, 14, 24, 255 });\n\t\tDrawText("✨ Liquid Glass Game Engine", 20, 20, 24, RAYWHITE);\n\t\tEndDrawing();\n\t}\n\n\tCloseWindow();\n\treturn 0;\n}\n',
  },

  // --- Networking & Web Frameworks ---
  {
    label: 'crow-server',
    detail: 'Crow: C++ Microframework HTTP API',
    documentation: 'Bootstrap a Crow microservice HTTP API with JSON responses',
    insertText: '#include "crow.h"\n\nint main() {\n\tcrow::SimpleApp app;\n\n\tCROW_ROUTE(app, "/api/v1/health")([](){\n\t\tcrow::json::wvalue res;\n\t\tres["status"] = "active";\n\t\tres["engine"] = "IndoctrinatedEdit C++ Service";\n\t\treturn res;\n\t});\n\n\tCROW_ROUTE(app, "/api/v1/${1:resource}/<int>")\n\t([](int id){\n\t\treturn crow::response("Item ID: " + std::to_string(id));\n\t});\n\n\tapp.port(${2:18080}).multithreaded().run();\n}\n$0',
  },

  // --- GUI (Dear ImGui) ---
  {
    label: 'imgui-widget',
    detail: 'Dear ImGui: Immediate Mode UI Window',
    documentation: 'Render an interactive Dear ImGui window with controls and buttons',
    insertText: 'void ${1:RenderUI}() {\n\tImGui::Begin("Indoctrinated Glass Toolset", nullptr, ImGuiWindowFlags_AlwaysAutoResize);\n\tImGui::Text("Status: Connected to Microservice");\n\t\n\tstatic float value = 0.5f;\n\tImGui::SliderFloat("Specular Glow", &value, 0.0f, 1.0f);\n\n\tif (ImGui::Button("Execute Pipeline")) {\n\t\t${0:// trigger action}\n\t}\n\n\tImGui::End();\n}\n',
  },

  // --- Build Systems (Modern CMake) ---
  {
    label: 'cmake-project',
    detail: 'CMake: Modern Target-Based CMakeLists.txt',
    documentation: 'Idiomatic modern CMake 3.25+ project configuration',
    insertText: 'cmake_minimum_required(VERSION 3.25)\nproject(${1:MyProject} VERSION 1.0.0 LANGUAGES C CXX)\n\nset(CMAKE_CXX_STANDARD 23)\nset(CMAKE_CXX_STANDARD_REQUIRED ON)\nset(CMAKE_EXPORT_COMPILE_COMMANDS ON)\n\nadd_executable(${1:MyProject}\n\tsrc/main.cpp\n)\n\ntarget_include_directories(${1:MyProject} PRIVATE include)\ntarget_compile_features(${1:MyProject} PRIVATE cxx_std_23)\n\nif (MSVC)\n\ttarget_compile_options(${1:MyProject} PRIVATE /W4 /permissive-)\nelse()\n\ttarget_compile_options(${1:MyProject} PRIVATE -Wall -Wextra -Wpedantic)\nendif()\n$0',
  },
]
