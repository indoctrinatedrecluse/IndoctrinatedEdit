import { SnippetDefinition } from '../extensionTypes'

export const GDSCRIPT_CORE_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'gd-character-body-2d',
    detail: 'GDScript 4: 2D Character Body with Velocity, Gravity & Jump',
    documentation: 'Godot 4.x CharacterBody2D controller with movement, jumping, and move_and_slide()',
    insertText: 'extends CharacterBody2D\n\n@export var speed: float = 300.0\n@export var jump_velocity: float = -400.0\n\n# Get the gravity from the project settings to be in sync with RigidBody nodes.\nvar gravity = ProjectSettings.get_setting("physics/2d/default_gravity")\n\nfunc _physics_process(delta: float) -> void:\n\t# Add gravity\n\tif not is_on_floor():\n\t\tvelocity.y += gravity * delta\n\n\t# Handle Jump\n\tif Input.is_action_just_pressed("ui_accept") and is_on_floor():\n\t\tvelocity.y = jump_velocity\n\n\t# Get input direction\n\tvar direction := Input.get_axis("ui_left", "ui_right")\n\tif direction:\n\t\tvelocity.x = direction * speed\n\telse:\n\t\tvelocity.x = move_toward(velocity.x, 0, speed)\n\n\tmove_and_slide()\n$0',
  },
  {
    label: 'gd-signals-eventbus',
    detail: 'GDScript 4: Custom Signals & Global Event Bus',
    documentation: 'Godot 4 typed signal declarations and emission with payload arguments',
    insertText: 'signal player_damaged(current_health: int, max_health: int)\nsignal level_completed(score: int, elapsed_time: float)\n\nfunc take_damage(amount: int) -> void:\n\thealth = max(0, health - amount)\n\tplayer_damaged.emit(health, max_health)\n\tif health == 0:\n\t\tdie()\n$0',
  },
  {
    label: 'gd-custom-resource',
    detail: 'GDScript 4: Custom Data Resource Class (@export)',
    documentation: 'Custom data container Resource class for items, weapons, and stats in Godot 4',
    insertText: 'class_name ${1:ItemData}\nextends Resource\n\n@export var id: String = "item_01"\n@export var name: String = "Glass Relic"\n@export var icon: Texture2D\n@export var base_damage: float = 25.0\n@export_multiline var description: String = "A crystalline relic infused with liquid glass energy."\n$0',
  },
  {
    label: 'gd-state-machine',
    detail: 'GDScript 4: Finite State Machine (FSM) Node Base',
    documentation: 'Modular state machine architecture for Godot 4 characters and enemies',
    insertText: 'class_name State\nextends Node\n\n@warning_ignore("unused_signal")\nsignal transitioned(state: State, new_state_name: String)\n\nfunc enter() -> void:\n\tpass\n\nfunc exit() -> void:\n\tpass\n\nfunc update(_delta: float) -> void:\n\tpass\n\nfunc physics_update(_delta: float) -> void:\n\tpass\n$0',
  },
]

export const gdscriptSnippets: SnippetDefinition[] = [...GDSCRIPT_CORE_SNIPPETS]
