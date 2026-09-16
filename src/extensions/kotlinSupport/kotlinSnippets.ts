import { SnippetDefinition } from '../extensionTypes'

// 1. Core Kotlin & Coroutines Snippets
export const KOTLIN_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'kotlin-viewmodel-coroutine',
    detail: 'Kotlin Android: ViewModel with StateFlow & viewModelScope',
    documentation: 'Architecture-compliant ViewModel exposing immutable StateFlow to Compose UI',
    insertText: 'package com.indoctrinated.editor.viewmodel\n\nimport androidx.lifecycle.ViewModel\nimport androidx.lifecycle.viewModelScope\nimport kotlinx.coroutines.flow.MutableStateFlow\nimport kotlinx.coroutines.flow.StateFlow\nimport kotlinx.coroutines.flow.asStateFlow\nimport kotlinx.coroutines.launch\n\nsealed interface UiState {\n    data object Loading : UiState\n    data class Success(val items: List<String>) : UiState\n    data class Error(val message: String) : UiState\n}\n\nclass ${1:AssetViewModel} : ViewModel() {\n    private val _uiState = MutableStateFlow<UiState>(UiState.Loading)\n    val uiState: StateFlow<UiState> = _uiState.asStateFlow()\n\n    fun loadData() {\n        viewModelScope.launch {\n            try {\n                _uiState.value = UiState.Success(listOf("Shader A", "Glass Blur B"))\n            } catch (e: Exception) {\n                _uiState.value = UiState.Error(e.message ?: "Unknown error")\n            }\n        }\n    }\n}\n$0',
  },
  {
    label: 'kmp-expect-actual',
    detail: 'Kotlin Multiplatform: expect/actual Platform Declaration',
    documentation: 'KMP expect declaration pattern for platform-specific hardware/system implementations',
    insertText: 'package com.indoctrinated.editor.platform\n\nexpect class ${1:PlatformDriver}() {\n    val platformName: String\n    fun getHardwareAcceleration(): Boolean\n}\n\nfun getEnvironmentGreeting(): String {\n    val driver = ${1:PlatformDriver}()\n    return "Running on ${driver.platformName} with HW-Accel=${driver.getHardwareAcceleration()}"\n}\n$0',
  },
  {
    label: 'kotlin-sealed-class',
    detail: 'Kotlin: Sealed Class Hierarchy with Pattern Matching',
    documentation: 'Exhaustive sealed class hierarchy for type-safe event modeling',
    insertText: 'sealed class ${1:EditorEvent} {\n    data class FileOpened(val path: String) : ${1:EditorEvent}()\n    data class FileSaved(val path: String, val timestamp: Long) : ${1:EditorEvent}()\n    data class SyntaxError(val line: Int, val message: String) : ${1:EditorEvent}()\n    data object Idle : ${1:EditorEvent}()\n}\n$0',
  },
  {
    label: 'kotlin-flow-transform',
    detail: 'Kotlin Flow: Cold Stream Transformation with map & debounce',
    documentation: 'Kotlin reactive Coroutine Flow pipeline with debouncing and error catching',
    insertText: 'import kotlinx.coroutines.flow.*\n\nfun <T> Flow<T>.filterAndDebounce(timeoutMs: Long = 300L): Flow<T> {\n    return this\n        .debounce(timeoutMs)\n        .distinctUntilChanged()\n        .catch { emit(handleError(it)) }\n}\n$0',
  },
  {
    label: 'kotlin-singleton-object',
    detail: 'Kotlin: Thread-Safe Singleton Object',
    documentation: 'Thread-safe Kotlin object declaration with lazy property initializers',
    insertText: 'object ${1:LiquidGlassConfig} {\n    val version: String = "1.3.0"\n    val defaultSheen: Double by lazy {\n        0.85\n    }\n    \n    fun calculateChromaticAberration(depth: Double): Double {\n        return depth * 0.015\n    }\n}\n$0',
  },
]

// 2. Jetpack Compose & Compose Multiplatform Snippets
export const COMPOSE_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'compose-widget',
    detail: 'Jetpack Compose: @Composable UI with Material3 & State',
    documentation: 'Modern Jetpack Compose composable component with remember, state, and glassmorphism styling',
    insertText: 'package com.indoctrinated.editor.ui\n\nimport androidx.compose.animation.AnimatedVisibility\nimport androidx.compose.foundation.background\nimport androidx.compose.foundation.layout.*\nimport androidx.compose.foundation.shape.RoundedCornerShape\nimport androidx.compose.material3.*\nimport androidx.compose.runtime.*\nimport androidx.compose.ui.Alignment\nimport androidx.compose.ui.Modifier\nimport androidx.compose.ui.graphics.Color\nimport androidx.compose.ui.unit.dp\n\n@Composable\nfun ${1:GlassCardComponent}(\n    title: String,\n    modifier: Modifier = Modifier\n) {\n    var isExpanded by remember { mutableStateOf(false) }\n\n    Card(\n        shape = RoundedCornerShape(16.dp),\n        colors = CardDefaults.cardColors(\n            containerColor = Color(0x1AFFFFFF)\n        ),\n        modifier = modifier.padding(12.dp)\n    ) {\n        Column(modifier = Modifier.padding(16.dp)) {\n            Text(text = title, style = MaterialTheme.typography.titleMedium, color = Color.White)\n            \n            AnimatedVisibility(visible = isExpanded) {\n                Text(\n                    text = "Dynamic liquid glass content rendered in Compose",\n                    style = MaterialTheme.typography.bodyMedium,\n                    color = Color.LightGray,\n                    modifier = Modifier.padding(top = 8.dp)\n                )\n            }\n            \n            Button(\n                onClick = { isExpanded = !isExpanded },\n                modifier = Modifier.padding(top = 12.dp)\n            ) {\n                Text(if (isExpanded) "Collapse" else "Expand")\n            }\n        }\n    }\n}\n$0',
  },
  {
    label: 'compose-screen',
    detail: 'Jetpack Compose: Scaffold Screen with TopAppBar & FloatingActionButton',
    documentation: 'Full Compose screen architecture with Scaffold, TopBar, and ViewModel binding',
    insertText: 'package com.indoctrinated.editor.ui\n\nimport androidx.compose.foundation.layout.*\nimport androidx.compose.material3.*\nimport androidx.compose.runtime.*\nimport androidx.compose.ui.Modifier\n\n@OptIn(ExperimentalMaterial3Api::class)\n@Composable\nfun ${1:EditorScreen}(\n    title: String,\n    onActionClick: () => Unit\n) {\n    Scaffold(\n        topBar = {\n            TopAppBar(\n                title = { Text(title) },\n                colors = TopAppBarDefaults.topAppBarColors(\n                    containerColor = MaterialTheme.colorScheme.surfaceVariant\n                )\n            )\n        }\n    ) { innerPadding ->\n        Box(modifier = Modifier.padding(innerPadding).fillMaxSize()) {\n            Text("IndoctrinatedEdit Compose Canvas")\n        }\n    }\n}\n$0',
  },
  {
    label: 'compose-remember-state',
    detail: 'Jetpack Compose: rememberSaveable Custom State Holder',
    documentation: 'State preservation across Android configuration changes using rememberSaveable',
    insertText: 'var textInput by rememberSaveable { mutableStateOf("${1:Initial value}") }\n$0',
  },
  {
    label: 'compose-modifier-glass',
    detail: 'Compose: Glassmorphic Blur & Border Modifier',
    documentation: 'Custom Compose modifier extension providing translucent blur background',
    insertText: 'fun Modifier.liquidGlassBackground(): Modifier = this\n    .background(\n        color = androidx.compose.ui.graphics.Color(0x1FFFFFFF),\n        shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp)\n    )\n    .border(\n        width = 1.dp,\n        color = androidx.compose.ui.graphics.Color(0x33FFFFFF),\n        shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp)\n    )\n$0',
  },
  {
    label: 'compose-animation-spring',
    detail: 'Compose: AnimatedContent with Spring Motion Physics',
    documentation: 'Smooth UI transitions with AnimatedContent and spring bounce specifications',
    insertText: 'AnimatedVisibility(\n    visible = ${1:isVisible},\n    enter = fadeIn() + expandVertically(animationSpec = spring(dampingRatio = 0.7f)),\n    exit = fadeOut() + shrinkVertically()\n) {\n    ${2:// Content to animate}\n}\n$0',
  },
]

// 3. Gradle Kotlin DSL (.gradle.kts) Snippets
export const GRADLE_KTS_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'gradle-kts-build',
    detail: 'Gradle Kotlin DSL: build.gradle.kts Module Configuration',
    documentation: 'Production build.gradle.kts with Compose Multiplatform & Coroutines dependencies',
    insertText: 'plugins {\n    alias(libs.plugins.kotlin.multiplatform)\n    alias(libs.plugins.android.application)\n    alias(libs.plugins.jetbrains.compose)\n    alias(libs.plugins.compose.compiler)\n}\n\nkotlin {\n    androidTarget()\n    jvm("desktop")\n    \n    sourceSets {\n        commonMain.dependencies {\n            implementation(compose.runtime)\n            implementation(compose.foundation)\n            implementation(compose.material3)\n            implementation(libs.kotlinx.coroutines.core)\n        }\n    }\n}\n$0',
  },
  {
    label: 'gradle-kts-dependencies',
    detail: 'Gradle Kotlin DSL: Version Catalogs (libs.versions.toml) dependency block',
    documentation: 'Version catalog type-safe dependency declarations in Kotlin DSL',
    insertText: 'dependencies {\n    implementation(libs.ktor.client.core)\n    implementation(libs.ktor.client.cio)\n    implementation(libs.kotlinx.serialization.json)\n    testImplementation(libs.kotlin.test)\n}\n$0',
  },
  {
    label: 'gradle-kts-task',
    detail: 'Gradle Kotlin DSL: Custom Task Registration with Input/Output',
    documentation: 'Register custom Gradle task with register<TaskType> in Kotlin DSL',
    insertText: 'tasks.register("${1:generateGlassShaders}") {\n    group = "build"\n    description = "Pre-compiles liquid glass GLSL/Metal shaders into binary buffers."\n    \n    doLast {\n        println("✨ [IndoctrinatedEdit] Pre-compiled shaders complete.")\n    }\n}\n$0',
  },
  {
    label: 'gradle-kts-android-block',
    detail: 'Gradle Kotlin DSL: android {} Application Block with CompileOptions',
    documentation: 'Android DSL block with compileSdk, defaultConfig, and Java 21 compatibility',
    insertText: 'android {\n    namespace = "com.indoctrinated.editor"\n    compileSdk = 35\n\n    defaultConfig {\n        applicationId = "com.indoctrinated.editor"\n        minSdk = 26\n        targetSdk = 35\n        versionCode = 1\n        versionName = "1.3.0"\n    }\n\n    compileOptions {\n        sourceCompatibility = JavaVersion.VERSION_21\n        targetCompatibility = JavaVersion.VERSION_21\n    }\n}\n$0',
  },
  {
    label: 'gradle-kts-publishing',
    detail: 'Gradle Kotlin DSL: MavenPublishing Plugin Configuration',
    documentation: 'Maven publication block for publishing KMP artifacts to MavenCentral',
    insertText: 'publishing {\n    publications {\n        create<MavenPublication>("mavenJava") {\n            from(components["java"])\n            groupId = "com.indoctrinated.editor"\n            artifactId = "liquid-glass-core"\n            version = "1.3.0"\n        }\n    }\n}\n$0',
  },
]

export const KOTLIN_SUITE_SNIPPETS: SnippetDefinition[] = [
  ...KOTLIN_SNIPPETS,
  ...COMPOSE_SNIPPETS,
  ...GRADLE_KTS_SNIPPETS,
]

export const kotlinSnippets = KOTLIN_SUITE_SNIPPETS
