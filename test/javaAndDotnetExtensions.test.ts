import { describe, it, expect } from 'vitest'
import { extensionRegistry } from '../src/extensions/extensionRegistry'
import { javaExtensionManifest } from '../src/extensions/javaSupport/javaExtension'
import { javaSnippets } from '../src/extensions/javaSupport/javaSnippets'
import { dotnetExtensionManifest } from '../src/extensions/dotnetSupport/dotnetExtension'
import { dotnetSnippets } from '../src/extensions/dotnetSupport/dotnetSnippets'
import { toolchainService } from '../src/services/toolchainService'

describe('Java and .NET / C# Universal Extensions & Toolchain Detection', () => {
  it('registers Java extension in extensionRegistry with correct metadata', () => {
    const javaExt = extensionRegistry.get('indoctrinated.ext.java-pack')
    expect(javaExt).toBeDefined()
    expect(javaExt?.name).toBe('Java & JVM Universal Suite')
    expect(javaExt?.category).toBe('Languages')
    expect(javaExt?.status).toBe('Active')
  })

  it('registers .NET & C# extension in extensionRegistry with correct metadata', () => {
    const dotnetExt = extensionRegistry.get('indoctrinated.ext.dotnet-pack')
    expect(dotnetExt).toBeDefined()
    expect(dotnetExt?.name).toBe('.NET & C# Enterprise Suite')
    expect(dotnetExt?.category).toBe('Languages')
    expect(dotnetExt?.status).toBe('Active')
  })

  it('provides rich Java snippets across Java 17/21, Spring Boot, Quarkus, JPA, JUnit 5, and build tools', () => {
    const labels = javaSnippets.map((s) => s.label)
    expect(labels).toContain('main-java')
    expect(labels).toContain('record')
    expect(labels).toContain('sealed-interface')
    expect(labels).toContain('virtual-threads')
    expect(labels).toContain('stream-pipeline')
    expect(labels).toContain('spring-boot-app')
    expect(labels).toContain('quarkus-resource')
    expect(labels).toContain('jpa-entity')
    expect(labels).toContain('junit5-test')
    expect(labels).toContain('maven-pom')
    expect(labels).toContain('gradle-build')
  })

  it('provides rich .NET / C# snippets across modern C# 12/13, ASP.NET Core, EF Core, MassTransit, MVVM, and xUnit', () => {
    const labels = dotnetSnippets.map((s) => s.label)
    expect(labels).toContain('program-top-level')
    expect(labels).toContain('primary-ctor')
    expect(labels).toContain('record-class')
    expect(labels).toContain('pattern-matching')
    expect(labels).toContain('async-enumerable')
    expect(labels).toContain('minimal-api')
    expect(labels).toContain('controller-api')
    expect(labels).toContain('middleware')
    expect(labels).toContain('efcore-dbcontext')
    expect(labels).toContain('efcore-entity')
    expect(labels).toContain('masstransit-consumer')
    expect(labels).toContain('mvvm-viewmodel')
    expect(labels).toContain('xunit-test')
    expect(labels).toContain('csproj-modern')
  })

  it('contains language definitions with appropriate file extensions', () => {
    const javaLang = javaExtensionManifest.languages?.find((l) => l.id === 'java')
    expect(javaLang).toBeDefined()
    expect(javaLang?.extensions).toContain('.java')
    expect(javaLang?.extensions).toContain('.gradle')

    const csharpLang = dotnetExtensionManifest.languages?.find((l) => l.id === 'csharp')
    expect(csharpLang).toBeDefined()
    expect(csharpLang?.extensions).toContain('.cs')
    expect(csharpLang?.extensions).toContain('.csproj')
  })

  it('verifies toolchain definitions for Java and .NET in toolchainService', () => {
    const definitions = toolchainService.getDefinitions()

    const javaDef = definitions.find((d) => d.id === 'toolchain.java')
    expect(javaDef).toBeDefined()
    expect(javaDef?.binaryNames).toContain('javac')
    expect(javaDef?.binaryNames).toContain('java')

    const dotnetDef = definitions.find((d) => d.id === 'toolchain.dotnet')
    expect(dotnetDef).toBeDefined()
    expect(dotnetDef?.binaryNames).toContain('dotnet')
  })
})
