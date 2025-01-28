import { Id } from "../../utils";

/// ======== Rules =================================
export class BaseRule extends Id {}

export class RewriteRule extends BaseRule {
    constructor(
        public matchPattern: BaseMatchPattern,
        public rewritePattern: BaseRewritePattern
    ) {
        super();
    }
}

export class GenRule extends BaseRule {
    constructor(
        public name: string,
        public pattern: BaseRewritePattern
    ) {
        super();
    }
}

/// ======== Match Patterns ========================
export class BaseMatchPattern extends Id {
    constructor(public binding: string | undefined) {
        super();
    }
}

export class MatchLiteral extends BaseMatchPattern {
    constructor(
        binding: string | undefined,
        public type: string,
        public value: bigint | string | number | null | undefined
    ) {
        super(binding);
    }
}

export class MatchAny extends BaseMatchPattern {}

/**
 * A pattern specifies the name of some
 */
export class MatchNode extends BaseMatchPattern {
    constructor(
        binding: string | undefined,
        public type: string,
        public args: BaseMatchPattern[]
    ) {
        super(binding);
    }
}

export class MatchArray extends BaseMatchPattern {
    constructor(
        binding: string | undefined,
        public components: BaseMatchPattern[]
    ) {
        super(binding);
    }
}

export class MatchElipsis extends BaseMatchPattern {}

/// ======== Rewrite Patterns ========================
export class BaseRewritePattern extends Id {}

export class RWNode extends BaseRewritePattern {
    constructor(
        public type: string,
        public args: BaseRewritePattern[]
    ) {
        super();
    }
}

export class RWLiteral extends BaseRewritePattern {
    constructor(public value: string | bigint | number | null | undefined) {
        super();
    }
}

export class RWChoice extends BaseRewritePattern {
    constructor(public choices: BaseRewritePattern[]) {
        super();
    }
}

export class RWVar extends BaseRewritePattern {
    constructor(public name: string) {
        super();
    }
}

export class RWGen extends BaseRewritePattern {
    constructor(public name: string) {
        super();
    }
}

export class RWArr extends BaseRewritePattern {
    constructor(public components: BaseRewritePattern[]) {
        super();
    }
}
