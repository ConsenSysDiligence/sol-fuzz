# sol-fuzz

A TypeScript package providing a library and a command line tool for generating random Solidity programs using user-defined mutation and generation rules.

Sol-fuzz provides a simple DSL language, that allows users to specify custom rules that mutate an existing AST and insert new randomly generated ASTs. This allows users to bias the randomly generated programs to their use case.

## Features

-   Expressive DSL for specifying AST mutations and/or generation of random ASTs
-   Simple command line tool
-   Programatic API

## Installation

Package could be installed globally via following command:

```bash
npm install -g https://github.com/Consensys/sol-fuzz
```

## Usage

To generate random programs, you need 2 things:

 - A seed Solidity program with some part(s) marked as mutation target(s) using the `/// <SOL-FUZZ_TARGET>` docstring
 - A set of re-write rules. 

Mutation targets can be any basic block, function or contract in a file. 

### Simple example

Consider the following seed file:

```solidity seed.sol
contract Test {
  /// <SOL-FUZZ-TARGET>
  function foo() {
  }
}
```
The seed file specifies a single contract `Test` with a single function `foo`. The docstring comment `<SOLC-FUZZ-TARGET>` says that `foo` and any of its children are potential targets for mutation.

Next consider the following re-write rules:

``` simple.rewrites
#revert =
    FunctionCall("", "functionCall", Identifier("", "revert", -1), []);

Block([$a@..., $b@...], $doc@*) =>
    Block(
        [$a, ExpressionStatement(#revert), $b],
        $doc
    );
```

There are two rules here. The first one is a *generative* rule, saying that the `#revert` identifier, corresponds to the AST of the function call `revert()`.
Here `FunctionCall` and its arguments corresponds to the `FunctionCall` [class](https://github.com/Consensys/solc-typed-ast/blob/63a107a17304910745b0db06d1f56c55d3462c49/src/ast/implementation/declaration/function_definition.ts#L11) [constructor](https://github.com/Consensys/solc-typed-ast/blob/63a107a17304910745b0db06d1f56c55d3462c49/src/ast/implementation/declaration/function_definition.ts#L96) in [solc-typed-ast](https://github.com/Consensys/solc-typed-ast/).

[!NOTE]  
For now some familiarity with solc-typed-ast's class structure is required. We are working on reducing this dependence.

The second rule is a re-write rule, of the form `<match pattern> => <rewritten node>;`. It should be understood as "If you can match some AST block with `<match pattern>` you can replace it with `<rewritten node>`.

The match pattern `Block([$a@..., $b@...], $doc@*)` matches a solc-typed-ast `Block`. The array expression corresponds to the `children` argument of `Block`s constructor. `$doc@*` corresponds to the
`document` argument of `Block`s constructor.

The `$doc@*` is a variable binding. The `*` matches anything in that location of the `Block` constructor. `$doc` is a variable binding that can be used in the re-written node.

`$a@...` is a binding that can match 0 or more elements in an array.

Therefore the `Block([$a@..., $b@...], $doc@*)` will match any `Block`, and it will bind the `$doc` variable to the block's documentation. It will also randomly split the `children` array in two halves,
and bind `$a` to the first half and `$b` to the second half.

The rewritten node is also a `Block` and it uses the varible bindings `$a`, `$b` and `$doc`. The first argument is a new array expression `[$a, ExpressionStatement(#revert), $b]`. This new array is the same as the matched array, but with an `ExpressionStatement` inserted between `$a` and `$b`.

Note that the new `ExpressionStatement` refers to the `#revert` generative rule.

We can run this example as follows:

```bash
sol-fuzz --rewrites simple.rewrites seed.sol
```

This will produce the following output:

```solidity
contract Test {
    /// <SOL-FUZZ-TARGET>
    function foo() public {
        revert();
    }
}
```

As you can see the rewrite was applied and `revert()` was inserted. You can do more than one rewrite with the `--rewrite-depth` argument:

```bash
sol-fuzz --rewrites simple.rewrites seed.sol  --rewrite-depth 5
```

```solidity
contract Test {
    /// <SOL-FUZZ-TARGET>
    function foo() public {
        revert();
        revert();
        revert();
        revert();
        revert();
    }
}
```

### Random choice example

The example so far is not very interesting - it can only insert `revert()`. There is not much "randomness" in that. To add some more randomness, we can use the `any()` operator in rules. Lets update our rules:

``` random.rewrites
#revert =
    FunctionCall("", "functionCall", Identifier("", "revert", -1), []);

#assert =
    FunctionCall("", "functionCall", Identifier("", "assert", -1), [Literal('bool', 'bool', '', 'false')]);

#stmt = ExpressionStatement(any(#revert, #assert));

Block([$a@..., $b@...], $doc@*) =>
    Block(
        [$a, #stmt, $b],
        $doc
    );
```

In the new rules we added the `#assert` rule that generates and `assert(false)` and the `#stmt` rule, that uses the `any()` operator to randomly choose between applying the `#revert` and `#assert` rule.
Now if we run our previous example:

```bash
sol-fuzz --rewrites simple.rewrites seed.sol  --rewrite-depth 5
```

We get a result with some randomness:

```solidity
contract Test {
    /// <SOL-FUZZ-TARGET>
    function foo() public {
        revert();
        assert(false);
        revert();
        revert();
        revert();
    }
}
```


### Arithmetic Example

The `any()` operator allows us to choose between applying different rules, or even picking different literals in the new trees. Lets use this to build random arithmetic trees of type `u64`.
First lets make our seed example a little more interesting with some variables:

```solidity airth_seed.sol
contract Test {
  uint64 x;

  /// <SOL-FUZZ-TARGET>
  function foo(uint64 y) {
  }
}
```

And now lets add our airthmetic rewrite rules:

``` arith.rewrites
#0u64 = Literal('uint64', 'number', '', '0');
#1u64 = Literal('uint64', 'number', '', '1');
#2u64 = Literal('uint64', 'number', '', '2');
#X = Identifier('uint64', 'x', -1);
#Y = Identifier('uint64', 'y', -1);

#AtomU64 = any(#X, #Y, #0u64, #1u64, #2u64);
#UnaryOp = any("-", "~");
#UnaryOrLower = any(UnaryOperation('uint64', true, #UnaryOp, #AtomU64), #AtomU64);
#BinaryArithOp = any("+", "-", "*", "/", "%");
#BinaryArithOrLower= any(BinaryOperation('uint64', #BinaryArithOp, #BinaryArithOrLower, #UnaryOrLower), #UnaryOrLower);
#ExprU64 = #BinaryArithOrLower;

Block([$a@..., $b@...], $doc@*) =>
    Block(
        [$a, ExpressionStatement(#ExprU64), $b],
        $doc
    );
```

The `#064`, `#1u64`, `#2u64` rules define several `Literal` nodes. `X` and `Y` correspond to the identifier nodes for the `x` and `y` variables.
Next we use the `AtomU64` rule to define the leaves of the expression tree.
Finally the `UnaryOrLower` rule and `BinaryArithOrLower` rules allow us to randomly build unary and binary expressions. Note that the `BinaryArithOrLower` rule recursively references itself!
These rules may resemble parsing grammar rules for arithmetic.

[!WARNING]
The `BinaryArithOrLower` rule only recursively references itself in its first child, and NOT in its second. Theres a reason for that! Try making them both recursive and observe what happens... Can you guys why?

With our updated rules we get the following output:


```bash
sol-fuzz --rewrites arith.rewrites arith_seed.sol  --rewrite-depth 5
```

```solidity
contract Test {
    /// <SOL-FUZZ-TARGET>
    function foo() public {
        0;
        -1;
        (~0) / x;
        -x;
        (0 % (-2)) % 1;
    }
}
```

Now we are getting some random looking code! Try increasing the `--rewrite-depth`!

### Command Line

You can use the `sol-fuzz` command line tool. The primary command line options are:

- `--rewrite-depth` - determining how many rewrites per sample the tool will attempt
- `--num-results` - how many different samples (i.e. rewritten programs) the tool will generate
- `--diversity` - when specified the random exploration will attempt to explore all possible `any()` choices
  
### Programatic API

You can also use the rewrite directly from typescript as follows:

[!NOTE]  
TODO

## Rule Recipies

This section provides example rules for some common mutations

[!NOTE]  
TODO

## DSL

[!NOTE]  
TODO
