import { SnippetDefinition } from '../extensionTypes'

export const JULIA_CORE_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'julia-multiple-dispatch',
    detail: 'Julia: Abstract Types & Multiple Dispatch Methods',
    documentation: 'Idiomatic Julia type hierarchy with multiple dispatch method specialization',
    insertText: 'abstract type AbstractParticle end\n\nstruct Photon <: AbstractParticle\n    energy::Float64\n    wavelength::Float64\nend\n\nstruct Electron <: AbstractParticle\n    mass::Float64\n    velocity::Float64\nend\n\n# Multiple dispatch specialization\nmomentum(p::Photon) = p.energy / 3e8\nmomentum(e::Electron) = e.mass * e.velocity\n\nprintln("✨ Photon momentum: ", momentum(Photon(1.6e-19, 500e-9)))\n$0',
  },
  {
    label: 'julia-flux-model',
    detail: 'Julia / Flux.jl: Neural Network Model & Training Step',
    documentation: 'Deep learning neural network architecture with Flux.jl and Adam optimizer',
    insertText: 'using Flux\n\n# Construct multi-layer perceptron\nmodel = Chain(\n    Dense(${1:784} => ${2:128}, relu),\n    Dropout(0.2),\n    Dense(${2:128} => ${3:10}),\n    softmax\n)\n\nloss(model, x, y) = Flux.Losses.logitcrossentropy(model(x), y)\nopt_state = Flux.setup(Adam(0.001), model)\n\nprintln("✨ Flux Neural Network initialized: ", model)\n$0',
  },
  {
    label: 'julia-diffeq-ode',
    detail: 'Julia / DifferentialEquations.jl: ODE System Problem & Solve',
    documentation: 'Numerical ODE integration using DifferentialEquations.jl (Tsit5 solver)',
    insertText: 'using DifferentialEquations\n\n# Lorenz Attractor system\nfunction lorenz!(du, u, p, t)\n    du[1] = 10.0 * (u[2] - u[1])\n    du[2] = u[1] * (28.0 - u[3]) - u[2]\n    du[3] = u[1] * u[2] - (8/3) * u[3]\nend\n\nu0 = [1.0, 0.0, 0.0]\ntspan = (0.0, 100.0)\nprob = ODEProblem(lorenz!, u0, tspan)\nsol = solve(prob, Tsit5(), saveat=0.01)\n\nprintln("✨ ODE solved with $(length(sol)) time points")\n$0',
  },
  {
    label: 'julia-dataframes-etl',
    detail: 'Julia / DataFrames.jl: Tabular Data Query & Grouping',
    documentation: 'High-performance tabular data processing with DataFrames and Queryverse in Julia',
    insertText: 'using DataFrames, Statistics\n\ndf = DataFrame(\n    department = ["Engineering", "Design", "Engineering", "Design", "Research"],\n    salary = [120000, 95000, 135000, 105000, 140000],\n    experience = [4, 3, 7, 5, 8]\n)\n\nsummary_df = combine(groupby(df, :department),\n    :salary => mean => :avg_salary,\n    :experience => mean => :avg_experience,\n    nrow => :headcount\n)\n\nprintln(summary_df)\n$0',
  },
]

export const juliaSnippets: SnippetDefinition[] = [...JULIA_CORE_SNIPPETS]
