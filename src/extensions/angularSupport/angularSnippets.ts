import { SnippetDefinition } from '../extensionTypes'

export const angularSnippets: SnippetDefinition[] = [
  // --- Modern Angular 17 / 18+ Core & Standalone ---
  {
    label: 'ng-standalone-component',
    detail: 'Angular: Modern Standalone Component with Signals',
    documentation: 'Modern Angular standalone component with signal state, computed properties, and change detection',
    insertText: 'import { Component, ChangeDetectionStrategy, signal, computed, inject } from "@angular/core";\nimport { CommonModule } from "@angular/common";\n\n@Component({\n  selector: "app-${1:asset-card}",\n  standalone: true,\n  imports: [CommonModule],\n  template: `\n    <div class="glass-card">\n      <h3>{{ title() }}</h3>\n      <p>Count: {{ count() }} (Double: {{ doubleCount() }})</p>\n      <button (click)="increment()">Increment</button>\n    </div>\n  `,\n  styles: [`\n    .glass-card {\n      padding: 16px;\n      border-radius: 12px;\n      background: rgba(255, 255, 255, 0.05);\n      backdrop-filter: blur(16px);\n      border: 1px solid rgba(255, 255, 255, 0.12);\n    }\n  `],\n  changeDetection: ChangeDetectionStrategy.OnPush,\n})\nexport class ${2:AssetCardComponent} {\n  readonly title = signal("${1:Asset Card}");\n  readonly count = signal(0);\n  readonly doubleCount = computed(() => this.count() * 2);\n\n  increment(): void {\n    this.count.update((c) => c + 1);\n  }\n}\n$0',
  },
  {
    label: 'ng-signal-input-output',
    detail: 'Angular: Signal Inputs, Outputs & Model Signals',
    documentation: 'New Angular signal input() and output() properties replacing @Input/@Output decorators',
    insertText: 'import { Component, input, output, model } from "@angular/core";\n\n@Component({\n  selector: "app-${1:custom-slider}",\n  standalone: true,\n  template: `\n    <div class="slider-wrapper">\n      <label>{{ label() }}</label>\n      <input type="range" [value]="value()" (input)="onValueChange(\$event)" />\n    </div>\n  `,\n})\nexport class ${2:CustomSliderComponent} {\n  readonly label = input.required<string>();\n  readonly disabled = input<boolean>(false);\n  readonly value = model<number>(0);\n  readonly valueChanged = output<number>();\n\n  onValueChange(event: Event): void {\n    const val = Number((event.target as HTMLInputElement).value);\n    this.value.set(val);\n    this.valueChanged.emit(val);\n  }\n}\n$0',
  },
  {
    label: 'ng-control-flow',
    detail: 'Angular: Built-in Control Flow (@if, @for, @switch)',
    documentation: 'New Angular template control flow replacing *ngIf and *ngFor',
    insertText: '@if (${1:items}().length > 0) {\n  <ul class="item-list">\n    @for (item of ${1:items}(); track item.id) {\n      <li class="item-row">\n        <span>{{ item.name }}</span>\n        @switch (item.status) {\n          @case ("active") { <span class="badge active">Online</span> }\n          @case ("pending") { <span class="badge pending">Pending</span> }\n          @default { <span class="badge">Inactive</span> }\n        }\n      </li>\n    } @empty {\n      <li class="empty-state">No items available.</li>\n    }\n  </ul>\n} @else {\n  <div class="placeholder">Loading stream...</div>\n}\n$0',
  },
  {
    label: 'ng-http-service',
    detail: 'Angular: Injectable Service with HttpClient & Signals',
    documentation: 'Type-safe HTTP service utilizing modern inject() function and signal state management',
    insertText: 'import { Injectable, inject, signal } from "@angular/core";\nimport { HttpClient } from "@angular/common/http";\nimport { Observable, tap } from "rxjs";\n\nexport interface ${1:ItemDto} {\n  id: string;\n  name: string;\n  status: string;\n}\n\n@Injectable({ providedIn: "root" })\nexport class ${2:ItemService} {\n  private readonly http = inject(HttpClient);\n  private readonly baseUrl = "/api/v1/items";\n\n  readonly items = signal<${1:ItemDto}[]>([]);\n  readonly loading = signal<boolean>(false);\n\n  fetchItems(): Observable<${1:ItemDto}[]> {\n    this.loading.set(true);\n    return this.http.get<${1:ItemDto}[]>(this.baseUrl).pipe(\n      tap({\n        next: (data) => {\n          this.items.set(data);\n          this.loading.set(false);\n        },\n        error: () => this.loading.set(false),\n      })\n    );\n  }\n}\n$0',
  },
  {
    label: 'ng-reactive-form',
    detail: 'Angular: Typed Reactive Forms with FormBuilder',
    documentation: 'Strongly typed Angular Reactive Form with validation and submit handling',
    insertText: 'import { Component, inject } from "@angular/core";\nimport { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";\n\n@Component({\n  selector: "app-${1:auth-form}",\n  standalone: true,\n  imports: [ReactiveFormsModule],\n  template: `\n    <form [formGroup]="form" (ngSubmit)="onSubmit()">\n      <input formControlName="email" placeholder="Email" />\n      <input type="password" formControlName="password" placeholder="Password" />\n      <button type="submit" [disabled]="form.invalid">Sign In</button>\n    </form>\n  `,\n})\nexport class ${2:AuthFormComponent} {\n  private readonly fb = inject(FormBuilder);\n\n  readonly form = this.fb.nonNullable.group({\n    email: ["", [Validators.required, Validators.email]],\n    password: ["", [Validators.required, Validators.minLength(8)]],\n  });\n\n  onSubmit(): void {\n    if (this.form.valid) {\n      const raw = this.form.getRawValue();\n      console.log("Submitting form:", raw);\n    }\n  }\n}\n$0',
  },
  {
    label: 'ng-routes',
    detail: 'Angular: Application Routes with Lazy Loading',
    documentation: 'Modern Angular route definition with functional guards and loadComponent lazy loading',
    insertText: 'import { Routes } from "@angular/router";\n\nexport const routes: Routes = [\n  {\n    path: "",\n    pathMatch: "full",\n    redirectTo: "dashboard",\n  },\n  {\n    path: "dashboard",\n    loadComponent: () => import("./dashboard/dashboard.component").then((m) => m.DashboardComponent),\n  },\n  {\n    path: "settings",\n    loadComponent: () => import("./settings/settings.component").then((m) => m.SettingsComponent),\n  },\n];\n',
  },
  {
    label: 'ng-spec-test',
    detail: 'Angular: Component Unit Test Spec (Jasmine / TestBed)',
    documentation: 'Unit test setup using TestBed for standalone components',
    insertText: 'import { ComponentFixture, TestBed } from "@angular/core/testing";\nimport { ${1:AssetCardComponent} } from "./${2:asset-card}.component";\n\ndescribe("${1:AssetCardComponent}", () => {\n  let component: ${1:AssetCardComponent};\n  let fixture: ComponentFixture<${1:AssetCardComponent}>;\n\n  beforeEach(async () => {\n    await TestBed.configureTestingModule({\n      imports: [${1:AssetCardComponent}],\n    }).compileComponents();\n\n    fixture = TestBed.createComponent(${1:AssetCardComponent});\n    component = fixture.componentInstance;\n    fixture.detectChanges();\n  });\n\n  it("should create component instance", () => {\n    expect(component).toBeTruthy();\n  });\n\n  it("should increment counter signal", () => {\n    expect(component.count()).toBe(0);\n    component.increment();\n    expect(component.count()).toBe(1);\n    expect(component.doubleCount()).toBe(2);\n  });\n});\n',
  },
]
