import { SnippetDefinition } from '../extensionTypes'

// 1. Prolog, Datalog & First-Order Predicate Logic (FOPL) Snippets
export const PROLOG_FOPL_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'prolog-kb-rules',
    detail: 'Prolog (FOPL): Knowledge Base with Horn Clauses & Recursion',
    documentation: 'First-order logic predicate declarations, facts, recursive transitive closure, and cut operator',
    insertText: '% -----------------------------------------------------------------------------\n% IndoctrinatedEdit First-Order Predicate Logic Knowledge Base\n% -----------------------------------------------------------------------------\n\n% --- Facts: Parent Relations ---\nparent(john, mary).\nparent(john, david).\nparent(mary, alice).\nparent(mary, bob).\nparent(david, cloe).\n\n% --- Horn Clauses: Transitive Ancestor Predicate ---\nancestor(X, Y) :-\n    parent(X, Y).\n\nancestor(X, Y) :-\n    parent(X, Z),\n    ancestor(Z, Y).\n\n% --- Sibling Predicate with Inequality Cut ---\nsibling(X, Y) :-\n    parent(Z, X),\n    parent(Z, Y),\n    X \\== Y.\n\n% --- Query Interface ---\nfind_all_descendants(Root, Descendants) :-\n    findall(D, ancestor(Root, D), Descendants).\n$0',
  },
  {
    label: 'prolog-dcg-grammar',
    detail: 'Prolog: Definite Clause Grammar (DCG) Expression Parser',
    documentation: 'DCG logic grammar rules compiling into difference lists for language syntax parsing',
    insertText: '% Definite Clause Grammar for Arithmetic Logic\nexpr(Z) --> term(X), "+", expr(Y), { Z is X + Y }.\nexpr(Z) --> term(X), "-", expr(Y), { Z is X - Y }.\nexpr(X) --> term(X).\n\nterm(Z) --> factor(X), "*", term(Y), { Z is X * Y }.\nterm(Z) --> factor(X), "/", term(Y), { Y \\= 0, Z is X / Y }.\nterm(X) --> factor(X).\n\nfactor(Val) --> number(Val).\nfactor(Val) --> "(", expr(Val), ")".\n\nnumber(D) --> [C], { char_type(C, digit), atom_number(C, D) }.\n$0',
  },
  {
    label: 'datalog-deductive-query',
    detail: 'Datalog: Deductive Database Reachability & Stratified Negation',
    documentation: 'Datalog recursive fixed-point reachability rules with safety constraints',
    insertText: '% Base Extensional Database (EDB)\nedge(node_a, node_b).\nedge(node_b, node_c).\nedge(node_c, node_d).\nedge(node_a, node_e).\n\n% Intensional Database (IDB) - Transitive Path\npath(X, Y) :- edge(X, Y).\npath(X, Y) :- edge(X, Z), path(Z, Y).\n\n% Stratified Negation - Unreachable Nodes\nunreachable(X, Y) :-\n    edge(X, _),\n    edge(_, Y),\n    not path(X, Y).\n$0',
  },
  {
    label: 'asp-clingo-choice-rule',
    detail: 'ASP (Answer Set Programming): Clingo Stable Model Program',
    documentation: 'Answer Set Programming choice rules, integrity constraints, and objective optimization',
    insertText: '% Nodes and capacity\nnode(1..6).\n{ in_subset(X) } :- node(X).\n\n% Integrity Constraint: No adjacent nodes in independent set\n:- in_subset(X), in_subset(Y), edge(X, Y).\n\n% Optimization: Maximize cardinality of independent set\n#maximize { 1,X : in_subset(X) }.\n\n#show in_subset/1.\n$0',
  },
]

// 2. Common Lisp & S-Expression Symbolic Computing Snippets
export const COMMON_LISP_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'lisp-defmacro-hygiene',
    detail: 'Common Lisp: Hygienic Defmacro with Gensym & Backquote',
    documentation: 'Hygienic macro template avoiding variable capture using gensym and backquote syntax',
    insertText: '(defmacro with-specular-glass ((surface &key (intensity 0.85) (roughness 0.12)) &body body)\n  "Binds a hardware-accelerated glass shader context and executes body."\n  (let ((g-surface (gensym "SURFACE-"))\n        (g-sheen   (gensym "SHEEN-")))\n    `(let* ((,g-surface ,surface)\n            (,g-sheen (* ,intensity (- 1.0 ,roughness))))\n       (format t "~&✨ [LISP] Entering Specular Context: ~A (Sheen: ~,2F)~%" ,g-surface ,g-sheen)\n       (unwind-protect\n            (progn ,@body)\n         (format t "~&✨ [LISP] Releasing Specular Context: ~A~%" ,g-surface)))))\n$0',
  },
  {
    label: 'lisp-clos-class-methods',
    detail: 'Common Lisp: CLOS Class Definition with Defmethod Multiple Dispatch',
    documentation: 'Common Lisp Object System (CLOS) class, slots, accessors, and generic method dispatch',
    insertText: '(defclass ${1:glass-shader-pipeline} ()\n  ((shader-id\n    :initarg :id\n    :accessor shader-id\n    :initform (string (gensym "SHADER-"))\n    :documentation "Unique pipeline identifier")\n   (specular-sheen\n    :initarg :sheen\n    :accessor specular-sheen\n    :initform 0.85\n    :type float)\n   (active-p\n    :initarg :active\n    :accessor active-p\n    :initform t))\n  (:documentation "Liquid Glass GPU Render Pipeline Descriptor"))\n\n(defgeneric render-pipeline (pipeline surface)\n  (:documentation "Dispatches shader execution onto target canvas surface."))\n\n(defmethod render-pipeline ((pipeline ${1:glass-shader-pipeline}) surface)\n  (when (active-p pipeline)\n    (format t "~&[CLOS] Rendering pipeline ~A on surface ~A with sheen ~,3F~%"\n            (shader-id pipeline) surface (specular-sheen pipeline))))\n$0',
  },
  {
    label: 'lisp-loop-advanced',
    detail: 'Common Lisp: Advanced LOOP Macro with Clauses & Accumulators',
    documentation: 'Full-featured LOOP macro with destructuring, conditionals, and multiple accumulators',
    insertText: '(defun analyze-telemetry-records (records)\n  "Analyzes telemetry records using idiomatically composed LOOP macro."\n  (loop for (id value valid-p) in records\n        when valid-p\n          collect id into valid-ids\n          and sum value into total-sheen\n          and count value into valid-count\n          and maximize value into peak-sheen\n        finally (return (values valid-ids total-sheen (float (/ total-sheen (max 1 valid-count))) peak-sheen))))\n$0',
  },
]

// 3. Scheme & Racket Snippets
export const SCHEME_RACKET_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'scheme-callcc-continuation',
    detail: 'Scheme / Racket: First-Class Continuations via call/cc',
    documentation: 'First-class continuation escape and non-local exit pattern with call-with-current-continuation',
    insertText: '#lang racket\n\n(define (find-first-positive-sheen lst)\n  (call/cc\n   (lambda (return)\n     (for-each\n      (lambda (x)\n        (when (> x 0)\n          (return (format "✨ First positive sheen found: ~a" x))))\n      lst)\n     "No positive sheen found")))\n\n(define (make-coroutine-generator proc)\n  (let ((saved-cont #f))\n    (lambda ()\n      (call/cc\n       (lambda (caller-cont)\n         (if saved-cont\n             (saved-cont caller-cont)\n             (proc (lambda (val)\n                     (call/cc (lambda (k)\n                                (set! saved-cont k)\n                                (caller-cont val)))))))))))\n$0',
  },
  {
    label: 'racket-syntax-rules-macro',
    detail: 'Racket / Scheme: define-syntax-rule Hygienic Pattern Macro',
    documentation: 'Pattern-matching hygienic macro in Racket with ellipsis expansion',
    insertText: '#lang racket\n(provide with-liquid-glass)\n\n(define-syntax-rule (with-liquid-glass (var val) body ...)\n  (let ([var val])\n    (printf "✨ Initializing Glass Scope for: ~a\\n" var)\n    (begin body ...)))\n$0',
  },
  {
    label: 'scheme-cps-recursion',
    detail: 'Scheme: Continuation-Passing Style (CPS) Tail-Recursive Filter',
    documentation: 'Continuation-Passing Style tail-call optimized recursive list transformation',
    insertText: '(define (filter-cps pred lst k)\n  (cond\n    [(null? lst) (k \'())]\n    [(pred (car lst))\n     (filter-cps pred (cdr lst) (lambda (rest)\n                                  (k (cons (car lst) rest))))]\n    [else\n     (filter-cps pred (cdr lst) k)]))\n$0',
  },
]

// 4. Pure Lambda Calculus & Combinators Snippets
export const LAMBDA_CALCULUS_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'lambda-church-numerals',
    detail: 'Lambda Calculus: Church Numerals, Successor & Arithmetic',
    documentation: 'Pure Church encodings for natural numbers and arithmetic operations in pure untyped lambda calculus',
    insertText: '; -----------------------------------------------------------------------------\n; Pure Untyped Lambda Calculus: Church Numerals & Arithmetic\n; -----------------------------------------------------------------------------\n\n; 0 := λf.λx. x\n(def zero (lambda (f) (lambda (x) x)))\n\n; 1 := λf.λx. f x\n(def one (lambda (f) (lambda (x) (f x))))\n\n; 2 := λf.λx. f (f x)\n(def two (lambda (f) (lambda (x) (f (f x)))))\n\n; SUCC := λn.λf.λx. f (n f x)\n(def succ (lambda (n) (lambda (f) (lambda (x) (f ((n f) x))))))\n\n; PLUS := λm.λn.λf.λx. m f (n f x)\n(def plus (lambda (m) (lambda (n) (lambda (f) (lambda (x) ((m f) ((n f) x)))))))\n\n; MULT := λm.λn.λf. m (n f)\n(def mult (lambda (m) (lambda (n) (lambda (f) (m (n f))))))\n\n; EXP := λm.λn. n m\n(def exp (lambda (m) (lambda (n) (n m))))\n$0',
  },
  {
    label: 'lambda-y-combinator',
    detail: 'Lambda Calculus: Fixed-Point Y Combinator & Recursive Factorial',
    documentation: 'Curry\'s Applicative / Strict Y (Z) Combinator enabling recursion in pure lambda calculus',
    insertText: '; -----------------------------------------------------------------------------\n; Strict Fixed-Point Y (Z) Combinator for Anonymous Recursion\n; Y := λf. (λx. f (λv. x x v)) (λx. f (λv. x x v))\n; -----------------------------------------------------------------------------\n\n(def Y\n  (lambda (f)\n    ((lambda (x) (f (lambda (v) ((x x) v))))\n     (lambda (x) (f (lambda (v) ((x x) v)))))))\n\n; Factorial generator for use with Y-combinator:\n(def fact-gen\n  (lambda (rec)\n    (lambda (n)\n      (if (<= n 1)\n          1\n          (* n (rec (- n 1)))))))\n\n(def factorial (Y fact-gen))\n$0',
  },
  {
    label: 'lambda-ski-combinators',
    detail: 'Combinatory Logic: Fundamental S, K, I Combinators',
    documentation: 'Turing-complete SKI combinator basis for bracket abstraction and combinatory calculus',
    insertText: '; -----------------------------------------------------------------------------\n; Fundamental SKI Combinatory Logic Basis\n; -----------------------------------------------------------------------------\n\n; I := λx. x\n(def I (lambda (x) x))\n\n; K := λx.λy. x  (True / Constant generator)\n(def K (lambda (x) (lambda (y) x)))\n\n; S := λx.λy.λz. x z (y z)  (Substitution)\n(def S (lambda (x) (lambda (y) (lambda (z) ((x z) (y z))))))\n\n; B := S (K S) K  (Composition: λf.λg.λx. f (g x))\n(def B ((S (K S)) K))\n\n; C := S (B B S) (K K)  (Commutation: λf.λx.λy. f y x)\n(def C ((S (B (B S))) (K K)))\n$0',
  },
  {
    label: 'lambda-church-booleans-pairs',
    detail: 'Lambda Calculus: Church Booleans, Conditional & Pairs',
    documentation: 'Church Boolean encodings, logic gates (AND, OR, NOT), and product pairs',
    insertText: '; -----------------------------------------------------------------------------\n; Church Booleans & Logic Gates\n; -----------------------------------------------------------------------------\n\n; TRUE  := λx.λy. x  (equivalent to K)\n(def TRUE (lambda (x) (lambda (y) x)))\n\n; FALSE := λx.λy. y  (equivalent to K I / zero)\n(def FALSE (lambda (x) (lambda (y) y)))\n\n; IFTHENELSE := λp.λa.λb. p a b\n(def IF (lambda (p) (lambda (a) (lambda (b) ((p a) b)))))\n\n; AND := λp.λq. p q p\n(def AND (lambda (p) (lambda (q) ((p q) p))))\n\n; OR  := λp.λq. p p q\n(def OR (lambda (p) (lambda (q) ((p p) q))))\n\n; NOT := λp. p FALSE TRUE\n(def NOT (lambda (p) ((p FALSE) TRUE)))\n\n; PAIR := λx.λy.λf. f x y\n(def PAIR (lambda (x) (lambda (y) (lambda (f) ((f x) y)))))\n\n; FST := λp. p TRUE\n(def FST (lambda (p) (p TRUE)))\n\n; SND := λp. p FALSE\n(def SND (lambda (p) (p FALSE)))\n$0',
  },
]

// 5. Formal Methods, Proof Assistants & Dependent Type Theory Snippets (Lean 4, Coq, TLA+)
export const FORMAL_METHODS_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'lean4-theorem-proof',
    detail: 'Lean 4: Theorem with Interactive Tactic Proof Block',
    documentation: 'Formally verified mathematical proposition and tactic proof in Lean 4',
    insertText: '-- IndoctrinatedEdit Formal Verification: Lean 4\nimport Mathlib.Data.Nat.Basic\n\ntheorem add_comm_custom (n m : Nat) : n + m = m + n := by\n  induction m with\n  | zero =>\n    rw [Nat.add_zero, Nat.zero_add]\n  | succ m ih =>\n    rw [Nat.add_succ, Nat.succ_add, ih]\n\n-- Dependently Typed Vector / Matrix Structure\ndef LiquidGlassBounds (intensity : Float) (h : intensity >= 0.0 ∧ intensity <= 1.0) : Float :=\n  intensity * 0.85\n$0',
  },
  {
    label: 'coq-gallina-lemma',
    detail: 'Coq / Rocq: Inductive Type, Fixpoint & Tactic Proof (Qed.)',
    documentation: 'Gallina inductive proposition, recursive structural induction, and Ltac tactics',
    insertText: '(* IndoctrinatedEdit Formal Logic: Coq / Gallina *)\nRequire Import Coq.Arith.Arith.\n\nInductive nat_tree : Type :=\n  | Leaf : nat_tree\n  | Node : nat -> nat_tree -> nat_tree -> nat_tree.\n\nFixpoint tree_size (t : nat_tree) : nat :=\n  match t with\n  | Leaf => 0\n  | Node _ l r => 1 + (tree_size l) + (tree_size r)\n  end.\n\nLemma tree_size_nonnegative : forall t : nat_tree, tree_size t >= 0.\nProof.\n  intro t.\n  induction t as [| n l IHl r IHr].\n  - simpl. auto.\n  - simpl. apply Nat.le_0_l.\nQed.\n$0',
  },
  {
    label: 'tla-plus-specification',
    detail: 'TLA+: Temporal Logic of Actions State Machine Specification',
    documentation: 'Leslie Lamport\'s TLA+ specification with Init, Next, Invariant, and Temporal Spec',
    insertText: '---------------- MODULE IndoctrinatedGlassLock ----------------\nEXTENDS Naturals, Sequences\n\nVARIABLES state, lock_holder\n\nTypeOK ==\n    /\\ state \\in {"IDLE", "ACQUIRING", "LOCKED"}\n    /\\ lock_holder \\in 0..10\n\nInit ==\n    /\\ state = "IDLE"\n    /\\ lock_holder = 0\n\nAcquire(p) ==\n    /\\ state = "IDLE"\n    /\\ state\' = "LOCKED"\n    /\\ lock_holder\' = p\n\nRelease(p) ==\n    /\\ state = "LOCKED"\n    /\\ lock_holder = p\n    /\\ state\' = "IDLE"\n    /\\ lock_holder\' = 0\n\nNext == \\E p \\in 1..10 : Acquire(p) \\/ Release(p)\n\nSpec == Init /\\ [][Next]_<<state, lock_holder>>\n\nMutualExclusion ==\n    state = "LOCKED" => lock_holder > 0\n=============================================================\n$0',
  },
]

export const LOGIC_FORMAL_SNIPPETS: SnippetDefinition[] = [
  ...PROLOG_FOPL_SNIPPETS,
  ...COMMON_LISP_SNIPPETS,
  ...SCHEME_RACKET_SNIPPETS,
  ...LAMBDA_CALCULUS_SNIPPETS,
  ...FORMAL_METHODS_SNIPPETS,
]

export const logicFormalSnippets = LOGIC_FORMAL_SNIPPETS
