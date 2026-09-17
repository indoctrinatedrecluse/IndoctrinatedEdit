import { SnippetDefinition } from '../extensionTypes'

// 1. Core Lua (5.1 - 5.4) & LuaJIT Snippets
export const CORE_LUA_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'lua-class',
    detail: 'Lua: OOP Class Template with Metatable and __index',
    documentation: 'Object-oriented class pattern in Lua with constructor (:new), methods, and prototype inheritance',
    insertText: 'local ${1:Player} = {}\n${1:Player}.__index = ${1:Player}\n\nfunction ${1:Player}:new(${2:name, health})\n    local self = setmetatable({}, ${1:Player})\n    self.name = ${2:name} or "Anonymous"\n    self.health = ${3:health} or 100\n    return self\nend\n\nfunction ${1:Player}:takeDamage(amount)\n    self.health = math.max(0, self.health - amount)\n    return self.health\nend\n\nreturn ${1:Player}\n$0',
  },
  {
    label: 'lua-coroutine',
    detail: 'Lua: Coroutine Producer-Consumer / Task Yield Loop',
    documentation: 'Lua coroutine wrapper using coroutine.create, coroutine.resume, and coroutine.yield',
    insertText: 'local function createWorker()\n    return coroutine.create(function(stepCount)\n        for i = 1, stepCount do\n            print("Worker processing step: " .. i)\n            coroutine.yield(i * 10)\n        end\n        return "complete"\n    end)\nend\n\nlocal co = createWorker()\nlocal success, val = coroutine.resume(co, 5)\n$0',
  },
  {
    label: 'lua-pcall-safe',
    detail: 'Lua: Protected Call (pcall) Error Handling Wrapper',
    documentation: 'Idiomatic Lua error handling catching exceptions with pcall and fallback message',
    insertText: 'local success, result = pcall(function()\n    ${1:-- Critical execution logic}\n    return "executed"\nend)\n\nif not success then\n    print("⚠️ [Lua Execution Error]: " .. tostring(result))\n    return nil, result\nend\n$0',
  },
  {
    label: 'lua-table-iterate',
    detail: 'Lua: Table Key-Value Pairs Iteration Loop',
    documentation: 'Iterate over all keys and values in a Lua dictionary or array table using pairs()',
    insertText: 'for ${1:key}, ${2:val} in pairs(${3:tbl}) do\n    print(string.format("[%s] => %s", tostring(${1:key}), tostring(${2:val})))\nend\n$0',
  },
]

// 2. LÖVE 2D (Love2D) Snippets
export const LOVE2D_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'love-lifecycle',
    detail: 'LÖVE 2D: Complete Game Lifecycle (load, update, draw, keypressed)',
    documentation: 'Full LÖVE2D game template with delta-time physics and liquid canvas drawing',
    insertText: 'function love.load()\n    love.window.setTitle("✨ IndoctrinatedEdit Love2D Game")\n    love.window.setMode(800, 600, { vsync = 1, resizable = true })\n    love.graphics.setBackgroundColor(0.06, 0.08, 0.12)\n\n    player = {\n        x = 400,\n        y = 300,\n        speed = 280,\n        radius = 24,\n    }\nend\n\nfunction love.update(dt)\n    if love.keyboard.isDown("right") or love.keyboard.isDown("d") then\n        player.x = player.x + player.speed * dt\n    end\n    if love.keyboard.isDown("left") or love.keyboard.isDown("a") then\n        player.x = player.x - player.speed * dt\n    end\n    if love.keyboard.isDown("down") or love.keyboard.isDown("s") then\n        player.y = player.y + player.speed * dt\n    end\n    if love.keyboard.isDown("up") or love.keyboard.isDown("w") then\n        player.y = player.y - player.speed * dt\n    end\nend\n\nfunction love.draw()\n    love.graphics.setColor(0.04, 0.52, 1.0, 0.9)\n    love.graphics.circle("fill", player.x, player.y, player.radius)\n    \n    love.graphics.setColor(1, 1, 1, 1)\n    love.graphics.print("Liquid Glass Engine - FPS: " .. love.timer.getFPS(), 16, 16)\nend\n\nfunction love.keypressed(key)\n    if key == "escape" then\n        love.event.quit()\n    end\nend\n$0',
  },
  {
    label: 'love-physics-world',
    detail: 'LÖVE 2D: Box2D Physics World, Dynamic Body & Fixture',
    documentation: 'Setup Box2D physics simulation world with gravity, dynamic bodies, and shapes in LÖVE',
    insertText: 'love.physics.setMeter(64)\nworld = love.physics.newWorld(0, 9.81 * 64, true)\n\n-- Create ground\nground = {}\nground.body = love.physics.newBody(world, 400, 580, "static")\nground.shape = love.physics.newRectangleShape(800, 40)\nground.fixture = love.physics.newFixture(ground.body, ground.shape)\n\n-- Create dynamic object\nball = {}\nball.body = love.physics.newBody(world, 400, 100, "dynamic")\nball.shape = love.physics.newCircleShape(20)\nball.fixture = love.physics.newFixture(ball.body, ball.shape, 1)\nball.fixture:setRestitution(0.75)\n$0',
  },
]

// 3. Roblox Luau Snippets
export const ROBLOX_LUAU_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'luau-strict-service',
    detail: 'Roblox Luau: Typed Service Module with Strict Typing',
    documentation: 'Strictly typed Roblox Luau module script with service injection and lifecycle init',
    insertText: '--!strict\nlocal Players = game:GetService("Players")\nlocal ReplicatedStorage = game:GetService("ReplicatedStorage")\nlocal TweenService = game:GetService("TweenService")\n\nlocal ${1:PlayerService} = {}\n${1:PlayerService}.__index = ${1:PlayerService}\n\nexport type ${1:PlayerService}Type = typeof(setmetatable({} :: {\n    activePlayers: { [Player]: boolean },\n}, ${1:PlayerService}))\n\nfunction ${1:PlayerService}.init(): ${1:PlayerService}Type\n    local self = setmetatable({\n        activePlayers = {},\n    }, ${1:PlayerService})\n\n    Players.PlayerAdded:Connect(function(player: Player)\n        self.activePlayers[player] = true\n        print(string.format("✨ [Luau] Player joined: %s (%d)", player.Name, player.UserId))\n    end)\n\n    return self\nend\n\nreturn ${1:PlayerService}\n$0',
  },
  {
    label: 'luau-tween',
    detail: 'Roblox Luau: TweenService GUI/Part Animation',
    documentation: 'Smooth property interpolation using Roblox TweenService and TweenInfo',
    insertText: 'local TweenService = game:GetService("TweenService")\nlocal tweenInfo = TweenInfo.new(\n    ${1:0.6}, -- Time\n    Enum.EasingStyle.Exponential,\n    Enum.EasingDirection.Out,\n    0, -- Repeat count\n    false, -- Reverses\n    0 -- Delay\n)\n\nlocal tween = TweenService:Create(${2:targetInstance}, tweenInfo, {\n    ${3:Position = UDim2.new(0.5, 0, 0.5, 0)},\n    ${4:BackgroundTransparency = 0.2},\n})\ntween:Play()\n$0',
  },
]

// 4. Neovim Lua Snippets
export const NEOVIM_LUA_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'nvim-plugin-spec',
    detail: 'Neovim: Lazy.nvim Plugin Specification Table',
    documentation: 'Neovim plugin configuration module for Lazy.nvim with keys, events, and opts',
    insertText: 'return {\n  "${1:author/plugin-name}",\n  event = "VeryLazy",\n  dependencies = {\n    "nvim-lua/plenary.nvim",\n  },\n  opts = {\n    enabled = true,\n    style = "glass",\n  },\n  config = function(_, opts)\n    require("${2:plugin}").setup(opts)\n    \n    vim.keymap.set("n", "<leader>${3:p}", function()\n      print("✨ Indoctrinated Neovim trigger")\n    end, { desc = "${4:Plugin Action}" })\n  end,\n}\n$0',
  },
  {
    label: 'nvim-autocmd',
    detail: 'Neovim: Auto Command and Group (nvim_create_autocmd)',
    documentation: 'Setup typed Neovim autocommands with dedicated augroup',
    insertText: 'local augroup = vim.api.nvim_create_augroup("${1:IndoctrinatedAutoGroup}", { clear = true })\n\nvim.api.nvim_create_autocmd({ "${2:BufWritePre}" }, {\n  group = augroup,\n  pattern = "${3:*}",\n  callback = function(args)\n    -- Clean whitespace or format on save\n  end,\n})\n$0',
  },
]

// 5. OpenResty / Nginx Lua Snippets
export const OPENRESTY_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'openresty-handler',
    detail: 'OpenResty: Nginx Content By Lua JSON Gateway Handler',
    documentation: 'High performance OpenResty HTTP API gateway handler with JSON response and ngx.req',
    insertText: 'local cjson = require("cjson.safe")\n\nngx.req.read_body()\nlocal body = ngx.req.get_body_data()\nlocal method = ngx.req.get_method()\n\nngx.header["Content-Type"] = "application/json; charset=utf-8"\nngx.header["X-Powered-By"] = "OpenResty-IndoctrinatedEdit"\n\nlocal response = {\n    status = "ok",\n    method = method,\n    timestamp = ngx.time(),\n    data = body and cjson.decode(body) or {},\n}\n\nngx.status = ngx.HTTP_OK\nngx.say(cjson.encode(response))\nreturn ngx.exit(ngx.HTTP_OK)\n$0',
  },
]

export const luaSnippets: SnippetDefinition[] = [
  ...CORE_LUA_SNIPPETS,
  ...LOVE2D_SNIPPETS,
  ...ROBLOX_LUAU_SNIPPETS,
  ...NEOVIM_LUA_SNIPPETS,
  ...OPENRESTY_SNIPPETS,
]
