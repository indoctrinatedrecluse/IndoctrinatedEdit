import { SnippetDefinition } from '../extensionTypes'

export const javaSnippets: SnippetDefinition[] = [
  // --- Modern Java Core (Java 17 / 21 LTS) ---
  {
    label: 'main-java',
    detail: 'Java: Standard Application Class with main()',
    documentation: 'Standard Java application entrypoint with formatted stdout',
    insertText: 'public class ${1:Main} {\n\tpublic static void main(String[] args) {\n\t\tSystem.out.println("✨ IndoctrinatedEdit Java & JVM Runtime Active!");\n\t\t${0}\n\t}\n}\n',
  },
  {
    label: 'record',
    detail: 'Java: Immutable Record (Java 16+)',
    documentation: 'Compact immutable data carrier record with validation constructor',
    insertText: 'public record ${1:UserDto}(String id, String username, String email) {\n\tpublic ${1:UserDto} {\n\t\tif (username == null || username.isBlank()) {\n\t\t\tthrow new IllegalArgumentException("Username cannot be blank");\n\t\t}\n\t}\n}\n$0',
  },
  {
    label: 'sealed-interface',
    detail: 'Java: Sealed Interface & Pattern Matching (Java 17+)',
    documentation: 'Exhaustive domain hierarchy with sealed interface and permits clause',
    insertText: 'public sealed interface ${1:PaymentEvent} permits ${1:PaymentEvent}.Initiated, ${1:PaymentEvent}.Completed, ${1:PaymentEvent}.Failed {\n\trecord Initiated(String transactionId, double amount) implements ${1:PaymentEvent} {}\n\trecord Completed(String transactionId, long timestamp) implements ${1:PaymentEvent} {}\n\trecord Failed(String transactionId, String reason) implements ${1:PaymentEvent} {}\n}\n$0',
  },
  {
    label: 'virtual-threads',
    detail: 'Java 21: Project Loom Virtual Thread Executor',
    documentation: 'High throughput concurrent task execution using Java 21 virtual threads',
    insertText: 'import java.util.concurrent.Executors;\nimport java.util.stream.IntStream;\n\npublic class ${1:VirtualThreadRunner} {\n\tpublic static void runTasks() {\n\t\ttry (var executor = Executors.newVirtualThreadPerTaskExecutor()) {\n\t\t\tIntStream.range(0, 1000).forEach(i -> executor.submit(() -> {\n\t\t\t\t// Concurrent task logic\n\t\t\t\treturn "Task result: " + i;\n\t\t\t}));\n\t\t}\n\t}\n}\n$0',
  },
  {
    label: 'stream-pipeline',
    detail: 'Java: Streams Filter, Map & GroupingBy Pipeline',
    documentation: 'Functional stream transformations, predicate filtering, and Map grouping collectors',
    insertText: 'import java.util.List;\nimport java.util.Map;\nimport java.util.stream.Collectors;\n\npublic class ${1:StreamProcessor} {\n\tpublic static Map<String, List<${2:Item}>> processItems(List<${2:Item}> items) {\n\t\treturn items.stream()\n\t\t\t.filter(item -> item.isActive())\n\t\t\t.collect(Collectors.groupingBy(${2:Item}::category));\n\t}\n}\n$0',
  },

  // --- Enterprise Web Frameworks (Spring Boot 3 / Quarkus / Micronaut) ---
  {
    label: 'spring-boot-app',
    detail: 'Spring Boot 3: Application Entry & RestController',
    documentation: 'Bootstrap a Spring Boot 3 microservice application with REST endpoints',
    insertText: 'package com.indoctrinated.${1:service};\n\nimport org.springframework.boot.SpringApplication;\nimport org.springframework.boot.autoconfigure.SpringBootApplication;\nimport org.springframework.web.bind.annotation.*;\nimport java.util.Map;\n\n@SpringBootApplication\n@RestController\n@RequestMapping("/api/v1")\npublic class ${2:Application} {\n\tpublic static void main(String[] args) {\n\t\tSpringApplication.run(${2:Application}.class, args);\n\t}\n\n\t@GetMapping("/health")\n\tpublic Map<String, String> healthCheck() {\n\t\treturn Map.of("status", "UP", "engine", "Spring Boot 3 on IndoctrinatedEdit");\n\t}\n\n\t@PostMapping("/items")\n\tpublic Map<String, Object> createItem(@RequestBody Map<String, Object> payload) {\n\t\treturn Map.of("created", true, "data", payload);\n\t}\n}\n',
  },
  {
    label: 'quarkus-resource',
    detail: 'Quarkus: Supersonic Reactive REST Endpoint',
    documentation: 'Bootstrap a Quarkus cloud-native reactive REST resource',
    insertText: 'package com.indoctrinated.${1:resource};\n\nimport jakarta.ws.rs.*;\nimport jakarta.ws.rs.core.MediaType;\nimport jakarta.ws.rs.core.Response;\nimport java.util.Map;\n\n@Path("/api/v1/quarkus")\n@Produces(MediaType.APPLICATION_JSON)\n@Consumes(MediaType.APPLICATION_JSON)\npublic class ${2:ProductResource} {\n\n\t@GET\n\tpublic Response getProducts() {\n\t\treturn Response.ok(Map.of("service", "Quarkus Native Microservice", "status", "ready")).build();\n\t}\n\n\t@GET\n\t@Path("/{id}")\n\tpublic Response getById(@PathParam("id") String id) {\n\t\treturn Response.ok(Map.of("id", id, "name", "Liquid Glass Asset")).build();\n\t}\n}\n',
  },
  {
    label: 'jpa-entity',
    detail: 'Jakarta Persistence (JPA): Entity with Auditing',
    documentation: 'Jakarta / Hibernate ORM entity with ID generation, validation, and table mapping',
    insertText: 'package com.indoctrinated.model;\n\nimport jakarta.persistence.*;\nimport java.time.Instant;\n\n@Entity\n@Table(name = "${1:users}")\npublic class ${2:UserEntity} {\n\t@Id\n\t@GeneratedValue(strategy = GenerationType.IDENTITY)\n\tprivate Long id;\n\n\t@Column(nullable = false, unique = true)\n\tprivate String username;\n\n\t@Column(nullable = false)\n\tprivate String email;\n\n\t@Column(name = "created_at", updatable = false)\n\tprivate Instant createdAt = Instant.now();\n\n\tpublic ${2:UserEntity}() {}\n\n\tpublic Long getId() { return id; }\n\tpublic String getUsername() { return username; }\n\tpublic void setUsername(String username) { this.username = username; }\n\tpublic String getEmail() { return email; }\n\tpublic void setEmail(String email) { this.email = email; }\n}\n',
  },

  // --- Testing & Build Configurations (JUnit 5 / Maven / Gradle) ---
  {
    label: 'junit5-test',
    detail: 'JUnit 5: Parameterized & DisplayName Test Suite',
    documentation: 'Idiomatic JUnit 5 test class with assertions and parameterized test cases',
    insertText: 'import org.junit.jupiter.api.DisplayName;\nimport org.junit.jupiter.api.Test;\nimport org.junit.jupiter.params.ParameterizedTest;\nimport org.junit.jupiter.params.provider.ValueSource;\nimport static org.junit.jupiter.api.Assertions.*;\n\nclass ${1:ServiceTest} {\n\n\t@Test\n\t@DisplayName("Should initialize component with default state")\n\tvoid testInitialization() {\n\t\tboolean isOnline = true;\n\t\tassertTrue(isOnline, "Component should be initialized online");\n\t}\n\n\t@ParameterizedTest\n\t@ValueSource(strings = { "alpha", "beta", "gamma" })\n\t@DisplayName("Should validate distinct token identifiers")\n\tvoid testTokens(String token) {\n\t\tassertNotNull(token);\n\t\tassertFalse(token.isBlank());\n\t}\n}\n',
  },
  {
    label: 'maven-pom',
    detail: 'Maven: Modern pom.xml with Java 21 LTS',
    documentation: 'Production-ready Maven Project Object Model configuration',
    insertText: '<?xml version="1.0" encoding="UTF-8"?>\n<project xmlns="http://maven.apache.org/POM/4.0.0"\n         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">\n    <modelVersion>4.0.0</modelVersion>\n\n    <groupId>com.indoctrinated</groupId>\n    <artifactId>${1:java-service}</artifactId>\n    <version>1.0.0</version>\n\n    <properties>\n        <java.version>21</java.version>\n        <maven.compiler.source>21</maven.compiler.source>\n        <maven.compiler.target>21</maven.compiler.target>\n        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>\n    </properties>\n\n    <dependencies>\n        <!-- Add dependencies here -->\n    </dependencies>\n</project>\n',
  },
  {
    label: 'gradle-build',
    detail: 'Gradle: Kotlin DSL build.gradle.kts with Java 21',
    documentation: 'Modern Gradle Kotlin DSL build script with JVM toolchain setup',
    insertText: 'plugins {\n    java\n    application\n}\n\ngroup = "com.indoctrinated"\nversion = "1.0.0"\n\nrepositories {\n    mavenCentral()\n}\n\njava {\n    toolchain {\n        languageVersion.set(JavaLanguageVersion.of(21))\n    }\n}\n\ndependencies {\n    testImplementation(platform("org.junit:junit-bom:5.10.2"))\n    testImplementation("org.junit.jupiter:junit-jupiter")\n}\n\ntasks.test {\n    useJUnitPlatform()\n}\n',
  },
]
